import express from 'express';
console.log('Server starting...');
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'vogue-and-value-secret-key';
const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY || 'liz-lifestyle-secret-2024';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json({ limit: '100mb' }));
    app.use(express.urlencoded({ limit: '100mb', extended: true }));

    // Request logging middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });

    // Custom error handler for JSON parsing errors
    app.use((err: any, req: any, res: any, next: any) => {
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
      next(err);
    });

    console.log('Initializing database at:', path.join(process.cwd(), 'database.sqlite'));
    // Initialize SQLite Database
    const db = await open({
      filename: path.join(process.cwd(), 'database.sqlite'),
      driver: sqlite3.Database
    });
    console.log('Database initialized.');

    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      );

      CREATE TABLE IF NOT EXISTS clothing_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        price REAL,
        original_price REAL,
        image TEXT,
        description TEXT,
        display_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER,
        image_url TEXT,
        FOREIGN KEY (item_id) REFERENCES clothing_items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER,
        size TEXT,
        quantity INTEGER,
        FOREIGN KEY (item_id) REFERENCES clothing_items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        phone TEXT,
        address TEXT,
        delivery_location TEXT,
        delivery_charge REAL,
        total_amount REAL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        size TEXT,
        quantity INTEGER,
        price REAL,
        image TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admin_otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        otp TEXT,
        expires_at DATETIME
      );
    `);

    // Migration: Add display_order if it doesn't exist
    try {
      await db.exec('ALTER TABLE clothing_items ADD COLUMN display_order INTEGER DEFAULT 0');
    } catch (e) {
      // Column already exists
    }

    // Migration: Add original_price if it doesn't exist
    try {
      await db.exec('ALTER TABLE clothing_items ADD COLUMN original_price REAL');
    } catch (e) {
      // Column already exists
    }

    // Bootstrap Admin User (admin / admin123)
    const adminExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
    }

    // Seed initial data if empty
    const itemsCount = await db.get('SELECT COUNT(*) as count FROM clothing_items');
    if (itemsCount.count === 0) {
      const initialItems = [
        { name: 'Classic White Tee', category: 'Tops', price: 25, image: 'https://picsum.photos/seed/tee/400/500', description: 'A essential white t-shirt made from 100% organic cotton.', display_order: 1 },
        { name: 'Slim Fit Denim Jeans', category: 'Bottoms', price: 65, image: 'https://picsum.photos/seed/jeans/400/500', description: 'Classic blue denim with a modern slim fit.', display_order: 2 },
        { name: 'Urban Bomber Jacket', category: 'Outerwear', price: 120, image: 'https://picsum.photos/seed/bomber/400/500', description: 'Versatile bomber jacket for all seasons.', display_order: 3 },
        { name: 'Canvas Backpack', category: 'Accessories', price: 45, image: 'https://picsum.photos/seed/backpack/400/500', description: 'Durable canvas backpack with multiple compartments.', display_order: 4 },
        { name: 'Oversized Hoodie', category: 'Tops', price: 55, image: 'https://picsum.photos/seed/hoodie/400/500', description: 'Cozy oversized hoodie in charcoal grey.', display_order: 5 },
        { name: 'Chino Shorts', category: 'Bottoms', price: 35, image: 'https://picsum.photos/seed/shorts/400/500', description: 'Comfortable chino shorts for warm weather.', display_order: 6 },
      ];

      for (const item of initialItems) {
        const result = await db.run(
          'INSERT INTO clothing_items (name, category, price, image, description, display_order) VALUES (?, ?, ?, ?, ?, ?)',
          [item.name, item.category, item.price, item.image, item.description, item.display_order]
        );
        const itemId = result.lastID;
        const sizes = ['S', 'M', 'L', 'XL'];
        for (const size of sizes) {
          await db.run('INSERT INTO inventory (item_id, size, quantity) VALUES (?, ?, ?)', [itemId, size, 10]);
        }
        // Add the main image to product_images as well
        await db.run('INSERT INTO product_images (item_id, image_url) VALUES (?, ?)', [itemId, item.image]);
      }
    }

    // API Routes
    const ADMIN_EMAIL = 'lizlifestylebd@gmail.com';

    app.post('/api/request-otp', async (req, res) => {
      const { email } = req.body;
      if (email !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Access denied: Unauthorized email' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.run('DELETE FROM admin_otps WHERE email = ?', [email]);
      await db.run('INSERT INTO admin_otps (email, otp, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt.toISOString()]);

      // Attempt to send via Resend if API key is present
      if (resend) {
        try {
          await resend.emails.send({
            from: 'Liz Lifestyle <onboarding@resend.dev>',
            to: email,
            subject: 'Your Admin Login OTP',
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 400px; margin: auto; text-align: center;">
                <img src="https://i.imgur.com/vH9Z9Yx.png" alt="Liz Lifestyle" style="height: 60px; width: auto; margin-bottom: 20px;" />
                <h2 style="color: #111; margin-bottom: 10px;">Admin Login OTP</h2>
                <p style="font-size: 14px; color: #666;">Your one-time password for Liz Lifestyle Admin Panel is:</p>
                <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                  ${otp}
                </div>
                <p style="font-size: 12px; color: #999;">This code will expire in 10 minutes.</p>
              </div>
            `
          });
          console.log(`OTP sent via Resend to ${email}`);
        } catch (err) {
          console.error('Failed to send email via Resend:', err);
        }
      } else {
        // Fallback for development: log to console
        console.log('------------------------------------------');
        console.log(`OTP for ${email}: ${otp}`);
        console.log('------------------------------------------');
      }

      res.json({ success: true, message: 'OTP sent to your email' });
    });

    app.post('/api/login', async (req, res) => {
      const { passkey } = req.body;
      
      if (passkey === ADMIN_PASSKEY) {
        const token = jwt.sign({ id: 1, username: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
      } else {
        res.status(401).json({ error: 'Invalid passkey' });
      }
    });

    // Admin middleware
    const authenticateToken = (req: any, res: any, next: any) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
      jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
        req.user = user;
        next();
      });
    };

    app.post('/api/items', authenticateToken, async (req, res) => {
      console.log('POST /api/items called');
      const { name, category, price, original_price, description, display_order, inventory, image, images } = req.body;
      try {
        if (!name || isNaN(parseFloat(price))) {
          console.log('Validation failed: name or price missing/invalid', { name, price });
          return res.status(400).json({ error: 'Name and valid price are required' });
        }

        const result = await db.run(
          'INSERT INTO clothing_items (name, category, price, original_price, description, display_order, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, category, parseFloat(price), original_price ? parseFloat(original_price) : null, description, parseInt(display_order) || 0, image || '']
        );
        const itemId = result.lastID;
        
        if (inventory && Array.isArray(inventory)) {
          for (const inv of inventory) {
            await db.run('INSERT INTO inventory (item_id, size, quantity) VALUES (?, ?, ?)', [itemId, inv.size, parseInt(inv.quantity) || 0]);
          }
        } else {
          const sizes = ['S', 'M', 'L', 'XL'];
          for (const size of sizes) {
            await db.run('INSERT INTO inventory (item_id, size, quantity) VALUES (?, ?, ?)', [itemId, size, 0]);
          }
        }

        // Handle images if provided in the main request
        if (Array.isArray(images) && images.length > 0) {
          for (const imgUrl of images) {
            if (imgUrl) await db.run('INSERT INTO product_images (item_id, image_url) VALUES (?, ?)', [itemId, imgUrl]);
          }
        } else if (image) {
          await db.run('INSERT INTO product_images (item_id, image_url) VALUES (?, ?)', [itemId, image]);
        }
        
        res.status(201).json({ id: itemId, success: true });
      } catch (err) {
        console.error('Failed to add item:', err);
        res.status(500).json({ error: 'Failed to add item' });
      }
    });

    // New route for individual image uploads to avoid 413 errors
    app.post('/api/items/:id/images', authenticateToken, async (req, res) => {
      const { id } = req.params;
      const { image, isMain } = req.body;
      try {
        if (isMain) {
          await db.run('UPDATE clothing_items SET image = ? WHERE id = ?', [image, id]);
        }
        
        // Also add to product_images table
        await db.run('INSERT INTO product_images (item_id, image_url) VALUES (?, ?)', [id, image]);
        
        res.json({ success: true });
      } catch (err) {
        console.error('Failed to upload image:', err);
        res.status(500).json({ error: 'Failed to upload image' });
      }
    });

    app.delete('/api/items/:id/images', authenticateToken, async (req, res) => {
      const { id } = req.params;
      try {
        await db.run('DELETE FROM product_images WHERE item_id = ?', [id]);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Failed to clear images' });
      }
    });

    app.get('/api/items', async (req, res) => {
      const items = await db.all('SELECT * FROM clothing_items ORDER BY display_order ASC, id DESC');
      const itemsWithDetails = await Promise.all(items.map(async (item) => {
        const inventory = await db.all('SELECT size, quantity FROM inventory WHERE item_id = ?', [item.id]);
        const images = await db.all('SELECT image_url FROM product_images WHERE item_id = ?', [item.id]);
        return { ...item, inventory, images: images.map(img => img.image_url) };
      }));
      res.json(itemsWithDetails);
    });

    app.put('/api/items/:id', authenticateToken, async (req, res) => {
      const { id } = req.params;
      console.log(`PUT /api/items/${id} called`);
      const { price, original_price, name, category, description, display_order, inventory, image, images } = req.body;
      try {
        // Handle partial updates (e.g., just display_order)
        const currentItem = await db.get('SELECT * FROM clothing_items WHERE id = ?', [id]);
        if (!currentItem) {
          console.log(`Item not found: ${id}`);
          return res.status(404).json({ error: 'Item not found' });
        }

        const updatedName = name !== undefined ? name : currentItem.name;
        const updatedPrice = price !== undefined ? parseFloat(price) : currentItem.price;
        const updatedOriginalPrice = original_price !== undefined ? (original_price ? parseFloat(original_price) : null) : currentItem.original_price;
        const updatedCategory = category !== undefined ? category : currentItem.category;
        const updatedDescription = description !== undefined ? description : currentItem.description;
        const updatedDisplayOrder = display_order !== undefined ? parseInt(display_order) : currentItem.display_order;
        const updatedImage = image !== undefined ? image : currentItem.image;

        if (!updatedName || isNaN(updatedPrice)) {
          console.log('Validation failed: updatedName or updatedPrice invalid', { updatedName, updatedPrice });
          return res.status(400).json({ error: 'Name and valid price are required' });
        }

        await db.run(
          'UPDATE clothing_items SET price = ?, original_price = ?, name = ?, category = ?, description = ?, display_order = ?, image = ? WHERE id = ?',
          [updatedPrice, updatedOriginalPrice, updatedName, updatedCategory, updatedDescription, updatedDisplayOrder, updatedImage, id]
        );

        // Update inventory if provided
        if (inventory && Array.isArray(inventory)) {
          for (const inv of inventory) {
            await db.run(
              'UPDATE inventory SET quantity = ? WHERE item_id = ? AND size = ?',
              [parseInt(inv.quantity) || 0, id, inv.size]
            );
          }
        }

        // Update images if provided
        if (images !== undefined && Array.isArray(images)) {
          await db.run('DELETE FROM product_images WHERE item_id = ?', [id]);
          for (const imgUrl of images) {
            if (imgUrl) await db.run('INSERT INTO product_images (item_id, image_url) VALUES (?, ?)', [id, imgUrl]);
          }
        }

        res.json({ success: true });
      } catch (err) {
        console.error('Failed to update item:', err);
        res.status(500).json({ error: 'Failed to update item' });
      }
    });

    app.delete('/api/items/:id', authenticateToken, async (req, res) => {
      const { id } = req.params;
      try {
        await db.run('DELETE FROM clothing_items WHERE id = ?', [id]);
        // Foreign keys with ON DELETE CASCADE should handle product_images and inventory
        res.json({ success: true });
      } catch (err) {
        console.error('Failed to delete item:', err);
        res.status(500).json({ error: 'Failed to delete item' });
      }
    });

    app.put('/api/inventory/:itemId/:size', authenticateToken, async (req, res) => {
      const { itemId, size } = req.params;
      const { quantity } = req.body;
      await db.run(
        'UPDATE inventory SET quantity = ? WHERE item_id = ? AND size = ?',
        [quantity, itemId, size]
      );
      res.json({ success: true });
    });

    // Order Routes
    app.post('/api/orders', async (req, res) => {
      const { customer_name, phone, address, delivery_location, delivery_charge, total_amount, items } = req.body;
      try {
        if (!customer_name || !phone || !address || !items || items.length === 0) {
          return res.status(400).json({ error: 'Missing required order fields' });
        }

        const result = await db.run(
          'INSERT INTO orders (customer_name, phone, address, delivery_location, delivery_charge, total_amount) VALUES (?, ?, ?, ?, ?, ?)',
          [customer_name, phone, address, delivery_location, delivery_charge, total_amount]
        );
        const orderId = result.lastID;

        for (const item of items) {
          await db.run(
            'INSERT INTO order_items (order_id, product_id, product_name, size, quantity, price, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [orderId, item.id, item.name, item.selectedSize, item.cartQuantity, item.price, item.image]
          );
          
          // Update inventory
          await db.run(
            'UPDATE inventory SET quantity = quantity - ? WHERE item_id = ? AND size = ?',
            [item.cartQuantity, item.id, item.selectedSize]
          );
        }

        res.status(201).json({ id: orderId, success: true });
      } catch (err) {
        console.error('Failed to create order:', err);
        res.status(500).json({ error: 'Failed to create order' });
      }
    });

    app.get('/api/orders', authenticateToken, async (req, res) => {
      try {
        const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
          const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
          return { ...order, items };
        }));
        res.json(ordersWithItems);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders' });
      }
    });

    app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      try {
        await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Failed to update order status' });
      }
    });

    // Catch-all for API routes that don't exist
    app.all('/api/*', (req, res) => {
      console.log(`API 404 - ${req.method} ${req.url}`);
      res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log('Ready to serve requests.');
    });
  } catch (error) {
    console.error('CRITICAL: Failed to start server:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

startServer();
