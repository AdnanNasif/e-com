import { useState, useMemo, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ShoppingBag, 
  Search, 
  Package, 
  LayoutGrid, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Lock,
  LogOut,
  Save,
  Settings,
  Edit,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle,
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  Loader2,
  Upload,
  Menu,
  Maximize2,
  Sparkles,
  LogIn,
  Download,
  FileText,
  Mail,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ClothingItem, CartItem, Order, HomepageSettings } from './types';
import { 
  db, 
  auth, 
  loginWithGoogle, 
  logout, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  Timestamp
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    product_code: '',
    category: '',
    price: '',
    original_price: '',
    description: '',
    image: '',
    video_url: '',
    display_order: '0',
    images: [''],
    inventory: [
      { size: 'S', quantity: 0 },
      { size: 'M', quantity: 0 },
      { size: 'L', quantity: 0 },
      { size: 'XL', quantity: 0 },
      { size: 'Unstitched', quantity: 0 },
      { size: 'Freesize', quantity: 0 },
    ]
  });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings>({
    highlight_product_ids: [],
    featured_product_ids: [],
    featured_category: 'Coco'
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ClothingItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);
  const [showBulkDeleteProductsConfirm, setShowBulkDeleteProductsConfirm] = useState(false);
  const [showBulkDeleteOrdersConfirm, setShowBulkDeleteOrdersConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Selection handlers for Inventory
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllProducts = () => {
    if (selectedProductIds.length === items.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(items.map(item => item.id));
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (!isAdmin || selectedProductIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedProductIds) {
        await deleteDoc(doc(db, 'products', id));
      }
      setSelectedProductIds([]);
      setShowBulkDeleteProductsConfirm(false);
      setSaveStatus({ type: 'success', message: `Successfully deleted ${selectedProductIds.length} products.` });
    } catch (err) {
      console.error('Bulk delete products failed:', err);
      setSaveStatus({ type: 'error', message: 'Failed to delete some products. Check console for details.' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Selection handlers for Orders
  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(oId => oId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllOrders = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(order => order.id));
    }
  };

  const handleBulkDeleteOrders = async () => {
    if (!isAdmin || selectedOrderIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedOrderIds) {
        const orderToDelete = orders.find(o => o.id === id);
        if (orderToDelete) {
          // Restore stock one by one, fetching latest to avoid stale data
          for (const item of orderToDelete.items) {
            const productRef = doc(db, 'products', item.id);
            const pDoc = await getDoc(productRef);
            if (pDoc.exists()) {
              const pData = pDoc.data() as ClothingItem;
              const newInventory = pData.inventory.map(inv => 
                inv.size === item.size 
                  ? { ...inv, quantity: inv.quantity + item.quantity } 
                  : inv
              );
              await updateDoc(productRef, { inventory: newInventory });
            }
          }
          // Delete order
          await deleteDoc(doc(db, 'orders', id));
        }
      }
      setSelectedOrderIds([]);
      setShowBulkDeleteOrdersConfirm(false);
      setSaveStatus({ type: 'success', message: `Successfully deleted ${selectedOrderIds.length} orders and restored stock.` });
    } catch (err) {
      console.error('Bulk delete orders failed:', err);
      setSaveStatus({ type: 'error', message: 'Failed to delete some orders.' });
    } finally {
      setIsBulkDeleting(false);
    }
  };
  const highlightItems = useMemo(() => {
    return (homepageSettings.highlight_product_ids || [])
      .map(id => items.find(i => i.id === id))
      .filter((item): item is ClothingItem => !!item && item.inventory.some(inv => inv.quantity > 0));
  }, [homepageSettings.highlight_product_ids, items]);

  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [currentHighlightIdx, setCurrentHighlightIdx] = useState(0);
  const [priceFilter, setPriceFilter] = useState<'all' | 'under1000' | '1000-3000' | 'over3000'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'priceLow' | 'priceHigh'>('newest');
  const [checkoutForm, setCheckoutForm] = useState({
    customer_name: '',
    phone: '',
    address: '',
    delivery_location: 'inside' as 'inside' | 'outside'
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastCheckedOrderId, setLastCheckedOrderId] = useState<string>(localStorage.getItem('last_checked_order_id') || '');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  const ADMIN_EMAIL = 'lizlifestylebd@gmail.com';

  const CATEGORY_HIERARCHY: Record<string, string[]> = {
    'Womans Clothing': ['ZAMZAM', 'COCO']
  };

  const allCategories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    const subCats = Object.values(CATEGORY_HIERARCHY).flat() as string[];
    subCats.forEach(sc => cats.add(sc));
    // Deduplicate 'All' by putting it in the Set first
    const finalSet = new Set(['All', ...Array.from(cats)]);
    return Array.from(finalSet).filter(c => c !== '');
  }, [items]);

  const sequentialItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category);
      if (catCompare !== 0) return catCompare;
      const codeA = a.product_code || '';
      const codeB = b.product_code || '';
      return codeA.localeCompare(codeB);
    });
  }, [items]);

  const mainCategories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    // Filter out sub-categories from main list
    const subCats = Object.values(CATEGORY_HIERARCHY).flat() as string[];
    const hierarchyParents = Object.keys(CATEGORY_HIERARCHY);
    
    const filteredCats = Array.from(cats).filter((c: string) => !subCats.includes(c));
    
    // Use a Set to ensure 'All' is only present once
    const finalCats = new Set(['All', ...filteredCats, ...hierarchyParents]);
    
    return Array.from(finalCats);
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.product_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const categoryMatch = selectedCategory === 'All' || 
                           item.category === selectedCategory || 
                           (CATEGORY_HIERARCHY[selectedCategory] || []).includes(item.category);

      const priceMatch = priceFilter === 'all' || (
        priceFilter === 'under1000' ? item.price < 1000 :
        priceFilter === '1000-3000' ? (item.price >= 1000 && item.price <= 3000) :
        priceFilter === 'over3000' ? item.price > 3000 : true
      );

      const stockMatch = stockFilter === 'all' || item.inventory.some(inv => inv.quantity > 0);

      return matchesSearch && categoryMatch && priceMatch && stockMatch;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'priceLow') return a.price - b.price;
      if (sortBy === 'priceHigh') return b.price - a.price;
      return (b.display_order || 0) - (a.display_order || 0);
    });
  }, [items, searchQuery, selectedCategory, priceFilter, stockFilter, sortBy]);

  const newOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'pending').length;
  }, [orders]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    const productsQuery = query(collection(db, 'products'), orderBy('display_order', 'asc'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClothingItem[];
      setItems(productsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const settingsDocRef = doc(db, 'settings', 'homepage');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setHomepageSettings(snapshot.data() as HomepageSettings);
      }
    }, (error) => {
      console.error("Settings error:", error);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProducts();
      unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    document.title = "Elegance in Every thread";
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    
    const ordersQuery = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      }) as unknown as Order[];
      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribeOrders();
  }, [isAdmin]);

  useEffect(() => {
    if (highlightItems.length > 0) {
      const interval = setInterval(() => {
        setCurrentHighlightIdx(prev => (prev + 1) % highlightItems.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [highlightItems]);

  const seedInitialData = async () => {
    const initialItems = [
      { name: 'Classic White Tee', category: 'Tops', price: 25, image: 'https://picsum.photos/seed/tee/400/500', description: 'A essential white t-shirt made from 100% organic cotton.', display_order: 1 },
      { name: 'Slim Fit Denim Jeans', category: 'Bottoms', price: 65, image: 'https://picsum.photos/seed/jeans/400/500', description: 'Classic blue denim with a modern slim fit.', display_order: 2 },
      { name: 'Urban Bomber Jacket', category: 'Outerwear', price: 120, image: 'https://picsum.photos/seed/bomber/400/500', description: 'Versatile bomber jacket for all seasons.', display_order: 3 },
      { name: 'Canvas Backpack', category: 'Accessories', price: 45, image: 'https://picsum.photos/seed/backpack/400/500', description: 'Durable canvas backpack with multiple compartments.', display_order: 4 },
      { name: 'Oversized Hoodie', category: 'Tops', price: 55, image: 'https://picsum.photos/seed/hoodie/400/500', description: 'Cozy oversized hoodie in charcoal grey.', display_order: 5 },
      { name: 'Chino Shorts', category: 'Bottoms', price: 35, image: 'https://picsum.photos/seed/shorts/400/500', description: 'Comfortable chino shorts for warm weather.', display_order: 6 },
    ];

    for (const item of initialItems) {
      const sizes = ['S', 'M', 'L', 'XL', 'Unstitched', 'Freesize'];
      const inventory = sizes.map(size => ({ size, quantity: 10 }));
      
      await addDoc(collection(db, 'products'), {
        ...item,
        inventory,
        images: [item.image],
        created_at: serverTimestamp()
      });
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      const result = await loginWithGoogle();
      if (result.user.email !== ADMIN_EMAIL) {
        setLoginError(`Access denied: ${result.user.email} is not authorized.`);
        await logout();
      } else {
        setShowLogin(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setLoginError('Login failed: This domain is not authorized in Firebase Console. Please add your Vercel domain to "Authorized Domains" in Firebase Auth settings.');
      } else if (err.code === 'auth/popup-blocked') {
        setLoginError('Login failed: Popup blocked by browser. Please allow popups for this site.');
      } else {
        setLoginError(`Login failed: ${err.message || 'Please try again.'}`);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAdmin(false);
  };


  const addToCart = (item: ClothingItem, size: string) => {
    const existing = cart.find(c => c.id === item.id && c.selectedSize === size);
    const inventoryItem = item.inventory.find(i => i.size === size);
    if (!inventoryItem || inventoryItem.quantity <= 0) return;

    if (existing) {
      if (existing.cartQuantity < inventoryItem.quantity) {
        setCart(cart.map(c => 
          (c.id === item.id && c.selectedSize === size) 
            ? { ...c, cartQuantity: c.cartQuantity + 1 } 
            : c
        ));
      }
    } else {
      setCart([...cart, { ...item, selectedSize: size as any, cartQuantity: 1 }]);
    }
  };

  const updateInventory = async (itemId: string, size: string, newQuantity: number) => {
    if (!isAdmin) return;
    try {
      const productRef = doc(db, 'products', itemId);
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const newInventory = item.inventory.map(inv => 
        inv.size === size ? { ...inv, quantity: newQuantity } : inv
      );

      await updateDoc(productRef, { inventory: newInventory });
    } catch (err) {
      console.error('Failed to update inventory:', err);
    }
  };

  const updatePrice = async (itemId: string, newPrice: number) => {
    if (!isAdmin) return;
    try {
      const productRef = doc(db, 'products', itemId);
      await updateDoc(productRef, { price: newPrice });
    } catch (err) {
      console.error('Failed to update price:', err);
    }
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const deliveryCharge = checkoutForm.delivery_location === 'inside' ? 80 : 150;
  const finalTotal = totalCartPrice + deliveryCharge;

  const sendOrderEmail = async (order: any) => {
    try {
      const orderHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h1 style="color: #064e3b; text-align: center;">New Order Received!</h1>
          <p style="text-align: center; color: #666;">Order ID: #${order.id}</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          
          <h2 style="font-size: 18px;">Customer Details</h2>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${order.customer_name}</p>
          <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.phone}</p>
          <p style="margin: 5px 0;"><strong>Address:</strong> ${order.address}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${order.delivery_location === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'}</p>
          
          <h2 style="font-size: 18px; margin-top: 20px;">Items Ordered</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; border: 1px solid #eee; text-align: left;">Product</th>
                <th style="padding: 10px; border: 1px solid #eee; text-align: center;">Size</th>
                <th style="padding: 10px; border: 1px solid #eee; text-align: center;">Qty</th>
                <th style="padding: 10px; border: 1px solid #eee; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item: any) => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #eee;">${item.name} (${item.product_code})</td>
                  <td style="padding: 10px; border: 1px solid #eee; text-align: center;">${item.size}</td>
                  <td style="padding: 10px; border: 1px solid #eee; text-align: center;">${item.quantity}</td>
                  <td style="padding: 10px; border: 1px solid #eee; text-align: right;">TK ${(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; text-align: right;">
            <p style="margin: 5px 0;"><strong>Delivery Charge:</strong> TK ${(order.delivery_charge || 0).toLocaleString()}</p>
            <h2 style="margin: 10px 0; color: #064e3b;">Total Amount: TK ${order.total_amount.toLocaleString()}</h2>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
          <p style="text-align: center; color: #999; font-size: 12px;">Elegance Store Notification System</p>
        </div>
      `;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'lizlifestylebd@gmail.com',
          subject: `New Order #${order.id} from ${order.customer_name}`,
          html: orderHtml,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Email Notification Failed:', result);
        
        // Notify admin about common setup issues
        if (result.name === 'validation_error') {
          console.warn('ACTION REQUIRED: Your Resend account is not verified for "lizlifestylebd@gmail.com". Please verify it in your Resend Dashboard > Settings > Senders.');
        } else if (result.error && result.error.includes('apiKey')) {
          console.error('RESEND_API_KEY is invalid or missing.');
        }
      } else {
        console.log('Email Notification Sent Successfully:', result);
      }
    } catch (err) {
      console.error('Failed to send email notification:', err);
    }
  };

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    try {
      const orderData = {
        customer_name: checkoutForm.customer_name,
        phone: checkoutForm.phone,
        address: checkoutForm.address,
        delivery_location: checkoutForm.delivery_location,
        delivery_charge: deliveryCharge,
        total_amount: finalTotal,
        items: cart.map(item => ({
          id: item.id,
          name: item.category,
          product_code: item.product_code,
          price: item.price,
          quantity: item.cartQuantity,
          size: item.selectedSize,
          image: item.image
        })),
        status: 'pending',
        created_at: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      const fullOrder = { ...orderData, id: docRef.id };
      setLastOrder(fullOrder);
      
      // Update inventory for each item
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        const product = items.find(i => i.id === item.id);
        if (product) {
          const newInventory = product.inventory.map(inv => 
            inv.size === item.selectedSize 
              ? { ...inv, quantity: Math.max(0, inv.quantity - item.cartQuantity) } 
              : inv
          );
          await updateDoc(productRef, { inventory: newInventory });
        }
      }

      setOrderSuccess(true);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      
      // Send Email Notification
      sendOrderEmail(fullOrder);

      setCheckoutForm({
        customer_name: '',
        phone: '',
        address: '',
        delivery_location: 'inside'
      });
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!isAdmin) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    if (!newItemForm.category || !newItemForm.price || isNaN(parseFloat(newItemForm.price))) {
      setSaveStatus({ type: 'error', message: 'Please provide a valid category and price.' });
      return;
    }

    const filteredImages = newItemForm.images.filter(img => img && img.trim() !== '');
    const allImages = [newItemForm.image, ...filteredImages].filter((img, idx, self) => 
      img && img.trim() !== '' && self.indexOf(img) === idx
    );

    try {
      setSaveStatus({ type: 'info', message: 'Saving product...' });
      
      let productCode = newItemForm.product_code.trim();
      
      // Auto-generate product code if empty
      if (!productCode && !editingItemId) {
        let maxNum = 0;
        items.forEach(item => {
          if (item.product_code) {
            const match = item.product_code.match(/\d+$/);
            if (match) {
              const num = parseInt(match[0]);
              if (num > maxNum) maxNum = num;
            }
          }
        });
        productCode = `LIZ-${(maxNum + 1).toString().padStart(3, '0')}`;
      }
      
      const payload = {
        name: newItemForm.category, // Use category as product name
        product_code: productCode,
        category: newItemForm.category,
        price: parseFloat(newItemForm.price),
        original_price: newItemForm.original_price ? parseFloat(newItemForm.original_price) : null,
        description: newItemForm.description,
        display_order: parseInt(newItemForm.display_order) || 0,
        inventory: newItemForm.inventory,
        image: newItemForm.image,
        video_url: newItemForm.video_url,
        images: allImages,
        updated_at: serverTimestamp()
      };

      if (editingItemId) {
        await updateDoc(doc(db, 'products', editingItemId), payload);
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          created_at: serverTimestamp()
        });
      }

      setSaveStatus({ type: 'success', message: editingItemId ? 'Product updated successfully!' : 'Product added successfully!' });
      
      setTimeout(() => {
        setIsAddingItem(false);
        setEditingItemId(null);
        setSaveStatus(null);
        setNewItemForm({
          name: '',
          category: '',
          price: '',
          original_price: '',
          description: '',
          product_code: '',
          image: '',
          video_url: '',
          display_order: '0',
          images: [''],
          inventory: [
            { size: 'S', quantity: 0 },
            { size: 'M', quantity: 0 },
            { size: 'L', quantity: 0 },
            { size: 'XL', quantity: 0 },
            { size: 'Unstitched', quantity: 0 },
            { size: 'Freesize', quantity: 0 },
          ]
        });
      }, 1500);

    } catch (err) {
      console.error('Failed to save item:', err);
      setSaveStatus({ type: 'error', message: 'Failed to save product. Please check your connection.' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!isAdmin) return;
    try {
      const orderToDelete = orders.find(o => o.id === id);
      if (!orderToDelete) return;

      // Revert inventory for each item in the order
      for (const item of orderToDelete.items) {
        const productRef = doc(db, 'products', item.id);
        const product = items.find(i => i.id === item.id);
        if (product) {
          const newInventory = product.inventory.map(inv => 
            inv.size === item.size 
              ? { ...inv, quantity: inv.quantity + item.quantity } 
              : inv
          );
          await updateDoc(productRef, { inventory: newInventory });
        }
      }

      // Delete the order
      await deleteDoc(doc(db, 'orders', id));
      setConfirmDeleteOrderId(null);
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  const moveProduct = async (item: ClothingItem, position: 'top' | 'bottom') => {
    if (!isAdmin) return;
    let newOrder = 0;
    
    if (position === 'top') {
      newOrder = Math.min(...items.map(i => i.display_order || 0)) - 1;
    } else {
      newOrder = Math.max(...items.map(i => i.display_order || 0)) + 1;
    }

    try {
      await updateDoc(doc(db, 'products', item.id), { display_order: newOrder });
    } catch (err) {
      console.error('Failed to move product:', err);
    }
  };


  const startEditing = (item: ClothingItem) => {
    setEditingItemId(item.id);
    setNewItemForm({
      name: item.name,
      product_code: item.product_code || '',
      category: item.category,
      price: item.price.toString(),
      original_price: item.original_price?.toString() || '',
      description: item.description,
      image: item.image,
      video_url: item.video_url || '',
      display_order: item.display_order?.toString() || '0',
      images: item.images && item.images.length > 0 ? item.images : [item.image],
      inventory: item.inventory.map(inv => ({ size: inv.size, quantity: inv.quantity }))
    });
    setIsAddingItem(true);
  };

  const exportInventoryExcel = () => {
    const data = items.map(item => {
      const row: any = {
        'Product Name': item.name,
        'Category': item.category,
        'Price (TK)': item.price,
        'Original Price (TK)': item.original_price || 'N/A',
      };
      item.inventory.forEach(inv => {
        row[`Size ${inv.size}`] = inv.quantity;
      });
      row['Total Stock'] = item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, `Inventory_Export_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportOrdersExcel = () => {
    const data = orders.map(order => ({
      'Order ID': order.id,
      'Customer Name': order.customer_name,
      'Phone': order.phone,
      'Address': order.address,
      'Location': order.delivery_location,
      'Total Amount (TK)': order.total_amount,
      'Status': order.status,
      'Date': new Date(order.created_at).toLocaleString(),
      'Items': order.items.map(i => `${i.name} (${i.size}) x${i.quantity}`).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, `Orders_Export_${new Date().toLocaleDateString()}.xlsx`);
  };

  const generateInvoicePDF = (order: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(6, 78, 59); // Emerald-900
    doc.text('Liz Lifestyle', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Elegance in every Thread', 105, 28, { align: 'center' });
    
    doc.setDrawColor(230);
    doc.line(20, 35, 190, 35);
    
    // Order Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Invoice for Order #${order.id}`, 20, 45);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(order.created_at?.toDate?.() || order.created_at).toLocaleString()}`, 20, 52);
    doc.text(`Status: ${order.status.toUpperCase()}`, 20, 59);
    
    // Customer Info
    doc.setFontSize(12);
    doc.text('Customer Details', 120, 45);
    doc.setFontSize(10);
    doc.text(`Name: ${order.customer_name}`, 120, 52);
    doc.text(`Phone: ${order.phone}`, 120, 59);
    doc.text(`Address: ${order.address}`, 120, 66, { maxWidth: 70 });
    
    // Items Table
    const tableData = order.items.map((item: any) => [
      item.name,
      item.size,
      `TK ${item.price.toLocaleString()}`,
      item.quantity,
      `TK ${(item.price * item.quantity).toLocaleString()}`
    ]);
    
    autoTable(doc, {
      startY: 80,
      head: [['Product', 'Size', 'Price', 'Qty', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [6, 78, 59] },
      margin: { left: 20, right: 20 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Summary
    doc.setFontSize(10);
    doc.text(`Subtotal: TK ${(order.total_amount - (order.delivery_charge || 0)).toLocaleString()}`, 140, finalY);
    doc.text(`Delivery Charge: TK ${(order.delivery_charge || 0).toLocaleString()}`, 140, finalY + 7);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: TK ${order.total_amount.toLocaleString()}`, 140, finalY + 15);
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Thank you for shopping with us!', 105, 280, { align: 'center' });
    
    doc.save(`Invoice_Order_${order.id}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <TrendingUp className="h-12 w-12 animate-pulse text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-7 w-7 text-neutral-900 dark:text-foreground" />
            </Button>
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setSelectedCategory('All')}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#064E3B] to-neutral-900 shadow-[0_8px_20px_-6px_rgba(6,78,59,0.4)] transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_12px_25px_-4px_rgba(6,78,59,0.5)]">
                <Sparkles className="h-6 w-6 text-emerald-100 drop-shadow-[0_0_8px_rgba(209,250,229,0.6)]" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none bg-gradient-to-br from-neutral-900 dark:from-foreground via-[#064E3B] to-neutral-900 dark:to-foreground bg-clip-text text-transparent drop-shadow-sm">
                  Liz Lifestyle
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mt-1 dark:text-muted-foreground">
                  Elegance in every thread
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            {/* Categories moved to hamburger menu */}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
              <Input
                type="search"
                placeholder="Search styles..."
                className="w-64 pl-9 bg-neutral-100 dark:bg-neutral-800 border-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:placeholder:text-neutral-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="text-neutral-600 dark:text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button 
              variant="outline" 
              size="icon" 
              className="relative dark:border-neutral-800 dark:hover:bg-neutral-800"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag className="h-5 w-5" />
              {cart.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 dark:bg-foreground text-[10px] font-bold text-white dark:text-background">
                  {cart.reduce((s, i) => s + i.cartQuantity, 0)}
                </span>
              )}
            </Button>
            {isAdmin ? (
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout Admin">
                <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setShowLogin(true)} title="Admin Login">
                <Lock className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Sub-Category Navigation removed as per user request to keep everything in hamburger menu */}

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 top-0 w-80 bg-white dark:bg-neutral-900 p-6 shadow-2xl"
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#064E3B] to-neutral-900 shadow-lg">
                    <Sparkles className="h-6 w-6 text-emerald-100" />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-tight leading-none bg-gradient-to-br from-neutral-900 dark:from-foreground via-[#064E3B] to-neutral-900 dark:to-foreground bg-clip-text text-transparent drop-shadow-sm">
                      Liz Lifestyle
                    </h1>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mt-0.5">
                      Elegance in every thread
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">Categories</h3>
                  <nav className="flex flex-col gap-2">
                    {mainCategories.map(cat => {
                      const hasSub = CATEGORY_HIERARCHY[cat];
                      const isSelectedOrChild = selectedCategory === cat || (hasSub && hasSub.includes(selectedCategory));
                      
                      return (
                        <div key={cat} className="space-y-1">
                          <button
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSelectedProduct(null);
                              if (!hasSub) setIsMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                              isSelectedOrChild
                                ? 'bg-neutral-900 dark:bg-foreground text-white dark:text-background' 
                                : 'text-neutral-600 dark:text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            {cat}
                            {isSelectedOrChild && !hasSub && <ArrowRight className="h-4 w-4" />}
                            {hasSub && (
                              <ChevronRight className={`h-4 w-4 transition-transform ${isSelectedOrChild ? 'rotate-90' : ''}`} />
                            )}
                          </button>
                          
                          {hasSub && isSelectedOrChild && (
                            <div className="ml-4 pl-4 border-l border-neutral-100 flex flex-col gap-1 py-1">
                              {hasSub.map(sub => (
                                <button
                                  key={sub}
                                  onClick={() => {
                                    setSelectedCategory(sub);
                                    setSelectedProduct(null);
                                    setIsMenuOpen(false);
                                  }}
                                  className={`flex items-center justify-between rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                                    selectedCategory === sub 
                                      ? 'text-neutral-900 dark:text-foreground font-bold' 
                                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-foreground'
                                  }`}
                                >
                                  {sub}
                                  {selectedCategory === sub && <div className="h-1 w-1 rounded-full bg-neutral-900 dark:bg-foreground" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-6 border-t">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                    <Input
                      type="search"
                      placeholder="Search styles..."
                      className="w-full pl-10 bg-neutral-100 border-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className={selectedProduct ? "bg-white dark:bg-neutral-950 min-h-screen" : "container mx-auto px-4 py-8"}>
        {selectedProduct ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-neutral-950"
          >
            <div className="max-w-7xl mx-auto">
              <div className="p-4 md:p-8 flex items-center justify-between bg-white dark:bg-neutral-950 sticky top-0 z-10">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors font-bold"
                  onClick={() => setSelectedProduct(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                  Back to Shop
                </Button>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em] font-black border-neutral-200 px-3 py-1">
                    {selectedProduct.category}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-80px)]">
                <div className="p-4 md:p-12 lg:p-20 flex flex-col gap-12 bg-white dark:bg-neutral-950">
                  <div className="relative aspect-square bg-white dark:bg-neutral-900 group/zoom cursor-zoom-in overflow-hidden" onClick={() => setZoomedImage(selectedProduct.images?.[activeImageIdx] || selectedProduct.image)}>
                    {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                      <div className="absolute left-0 top-0 z-10 bg-[#2C3E50] text-white text-[14px] font-black px-4 py-2 rounded-sm shadow-xl">
                        -{Math.round(((selectedProduct.original_price - selectedProduct.price) / selectedProduct.original_price) * 100)}%
                      </div>
                    )}
                    
                    <div className="absolute right-0 top-0 z-10 p-3">
                      <Search className="h-6 w-6 text-neutral-400" />
                    </div>

                    <AnimatePresence mode="wait">
                      {activeImageIdx === -1 && selectedProduct.video_url ? (
                        <motion.div
                          key="video"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full w-full bg-neutral-900 flex items-center justify-center relative"
                        >
                          {(() => {
                            const url = selectedProduct.video_url;
                            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                              const embedUrl = url.replace('watch?v=', 'embed/').split('&')[0];
                              return (
                                <iframe 
                                  src={embedUrl} 
                                  className="w-full h-full"
                                  allowFullScreen
                                />
                              );
                            } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
                              const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&t=0`;
                              return (
                                <iframe 
                                  src={embedUrl} 
                                  className="w-full h-full"
                                  style={{ border: 'none', overflow: 'hidden' }}
                                  scrolling="no"
                                  frameBorder="0"
                                  allowFullScreen={true}
                                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                />
                              );
                            } else {
                              return (
                                <video 
                                  src={url} 
                                  controls 
                                  className="max-h-full max-w-full"
                                  autoPlay
                                  muted
                                  loop
                                />
                              );
                            }
                          })()}
                        </motion.div>
                      ) : (
                        <motion.img
                          key={activeImageIdx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          src={selectedProduct.images?.[activeImageIdx] || selectedProduct.image}
                          alt={selectedProduct.name}
                          className="h-full w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {((selectedProduct.images && selectedProduct.images.length > 1) || selectedProduct.video_url) && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 px-2">
                      {selectedProduct.images?.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIdx(idx)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                            activeImageIdx === idx 
                              ? 'border-neutral-900 ring-4 ring-neutral-50' 
                              : 'border-transparent opacity-40 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                      {selectedProduct.video_url && (
                        <button
                          onClick={() => setActiveImageIdx(-1)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all duration-300 bg-neutral-900 flex items-center justify-center ${
                            activeImageIdx === -1 
                              ? 'border-neutral-900 ring-4 ring-neutral-50' 
                              : 'border-transparent opacity-40 hover:opacity-100'
                          }`}
                        >
                          <Sparkles className="h-5 w-5 text-white" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col p-8 md:p-16 lg:p-24 bg-white dark:bg-neutral-950">
                  <div className="mb-12">
                    {selectedProduct.product_code && (
                      <div className="inline-flex mb-8">
                        <div className="flex items-center gap-4 bg-neutral-900 text-white rounded-2xl p-1 pr-6 shadow-2xl border border-white/10 group overflow-hidden">
                          <div className="bg-white text-neutral-900 px-4 py-2 font-black text-xs uppercase tracking-widest rounded-xl">
                            Dress Code
                          </div>
                          <span className="text-xl font-mono font-black uppercase tracking-[0.3em] glow-text">
                            {selectedProduct.product_code}
                          </span>
                        </div>
                      </div>
                    )}
                    <h2 className="mb-6 text-4xl md:text-5xl font-black text-neutral-900 dark:text-foreground leading-[1.1] tracking-tight">
                      {selectedProduct.category}
                    </h2>
                    <div className="flex items-center gap-8">
                      {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                        <div className="flex flex-col">
                          <span className="text-2xl text-neutral-300 line-through font-bold">TK {selectedProduct.original_price.toLocaleString()}</span>
                          <span className="text-sm font-black text-red-500 uppercase tracking-widest">
                            Save {Math.round(((selectedProduct.original_price - selectedProduct.price) / selectedProduct.original_price) * 100)}%
                          </span>
                        </div>
                      )}
                      <span className="text-5xl font-black text-neutral-900 dark:text-foreground">TK {selectedProduct.price.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mb-16 space-y-8">
                    <div className="text-lg text-neutral-600 dark:text-muted-foreground space-y-6 leading-relaxed">
                      {selectedProduct.description.split('\n').map((line, i) => (
                        <p key={i} className="flex items-start gap-4">
                          <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-neutral-200" />
                          <span>{line}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="mb-16 pb-10 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-black text-neutral-900 uppercase tracking-[0.2em] text-[12px]">Category:</span>
                      <button 
                        onClick={() => {
                          setSelectedCategory(selectedProduct.category);
                          setSelectedProduct(null);
                        }}
                        className="text-neutral-400 hover:text-neutral-900 transition-colors underline underline-offset-8 decoration-neutral-100 hover:decoration-neutral-900"
                      >
                        {selectedProduct.category}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-12 mt-auto">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-neutral-900">Select Size</h3>
                        <button className="text-[11px] font-bold text-neutral-400 hover:text-neutral-900 underline underline-offset-4">Size Guide</button>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {selectedProduct.inventory.map((inv) => (
                          <button
                            key={inv.size}
                            disabled={inv.quantity === 0}
                            onClick={() => addToCart(selectedProduct, inv.size as any)}
                            className={`h-14 min-w-[4rem] px-4 text-sm font-black border-2 rounded-xl transition-all duration-300 ${
                              inv.quantity === 0 
                                ? 'opacity-10 cursor-not-allowed bg-neutral-50 border-neutral-100' 
                                : 'border-neutral-100 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white shadow-sm hover:shadow-2xl active:scale-95'
                            }`}
                          >
                            {inv.size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <Button 
                        className="w-full h-20 bg-neutral-900 text-white text-base font-black uppercase tracking-[0.3em] hover:bg-neutral-800 rounded-2xl shadow-3xl shadow-neutral-200 transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                        onClick={() => {
                          const firstAvailable = selectedProduct.inventory.find(i => i.quantity > 0);
                          if (firstAvailable) addToCart(selectedProduct, firstAvailable.size as any);
                        }}
                      >
                        Add to Cart
                        <ShoppingBag className="h-6 w-6" />
                      </Button>
                      <div className="flex items-center justify-center gap-8 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          In Stock
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          Fast Delivery
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <Tabs defaultValue="shop" className="w-full">
          <div className="flex items-center justify-between mb-8">
            <TabsList className={`grid w-full max-w-xl ${isAdmin ? 'grid-cols-4' : 'grid-cols-1'}`}>
              <TabsTrigger value="shop" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Shop
              </TabsTrigger>
              {isAdmin && (
                <>
                  <TabsTrigger value="admin" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Inventory
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="flex items-center gap-2 relative" onClick={() => {
                    if (orders.length > 0) {
                      const maxId = Math.max(...orders.map(o => o.id));
                      setLastCheckedOrderId(maxId);
                      localStorage.setItem('last_checked_order_id', maxId.toString());
                    }
                  }}>
                    <ClipboardList className="h-4 w-4" />
                    Orders
                    {newOrdersCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {newOrdersCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="media" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Media
                  </TabsTrigger>
                  <TabsTrigger value="homepage" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Homepage
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <TabsContent value="shop" className="mt-0">
            {selectedCategory === 'All' && searchQuery === '' && (
              <div className="space-y-20 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Highlight Section */}
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-neutral-900 dark:text-foreground tracking-tight uppercase">Premium Highlights</h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 dark:text-muted-foreground">Curated by Liz Lifestyle</p>
                    </div>
                    <div className="h-[2px] flex-1 bg-neutral-100 mx-8 hidden md:block" />
                    <div className="flex items-center gap-2">
                      <div className="text-[9px] font-black uppercase text-neutral-400 dark:text-muted-foreground mr-2">Rotating Selection</div>
                      <div className="flex gap-1">
                        {highlightItems.map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${i === currentHighlightIdx ? 'bg-neutral-900 w-4' : 'bg-neutral-200'}`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Hero Rotating Item */}
                    <div className="md:col-span-3">
                      <AnimatePresence mode="wait">
                        {(() => {
                           const item = highlightItems[currentHighlightIdx];
                           if (!item) return <div className="aspect-[21/9] bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-100 flex items-center justify-center">
                             <p className="text-sm font-black text-neutral-300 uppercase tracking-widest">Select Highlight In Admin</p>
                           </div>;
                           
                           return (
                             <motion.div
                               key={item.id}
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               exit={{ opacity: 0, x: -20 }}
                               className="relative aspect-[4/5] md:aspect-auto md:h-[500px] rounded-3xl overflow-hidden cursor-pointer group shadow-2xl bg-neutral-100"
                               onClick={() => {
                                 setSelectedProduct(item);
                                 setActiveImageIdx(0);
                               }}
                             >
                               <img src={item.image} alt="" className="h-full w-full object-contain md:object-cover md:object-top transition-transform duration-[2000ms] group-hover:scale-105" referrerPolicy="no-referrer" />
                               <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
                               <div className="absolute bottom-0 left-0 p-6 md:p-12 space-y-3 md:space-y-4 w-full">
                                 <div className="inline-flex">
                                    <span className="px-3 py-1 bg-white text-neutral-900 text-[10px] font-mono font-black uppercase tracking-widest rounded-full shadow-lg">
                                      Exclusive Dress: {item.product_code}
                                    </span>
                                 </div>
                                 <h3 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight md:leading-none">
                                   {item.category}
                                 </h3>
                                 <p className="text-white/80 text-xs md:text-sm max-w-md line-clamp-2">
                                   {item.description}
                                 </p>
                                 <div className="flex items-center gap-4 md:gap-6 pt-2 md:pt-4">
                                   <div className="flex flex-col">
                                     {item.original_price && item.original_price > item.price && (
                                       <span className="text-sm md:text-base text-white/50 line-through font-bold">TK {item.original_price.toLocaleString()}</span>
                                     )}
                                     <p className="text-2xl md:text-5xl font-black text-white flex items-center gap-3">
                                       TK {item.price.toLocaleString()}
                                       {item.original_price && item.original_price > item.price && (
                                         <span className="bg-red-500 text-white text-[11px] md:text-sm px-2.5 py-1 rounded-full font-black animate-pulse">
                                           {Math.round(((item.original_price - item.price) / item.original_price) * 100)}% OFF
                                         </span>
                                       )}
                                     </p>
                                   </div>
                                   <Button className="bg-white text-neutral-900 hover:bg-neutral-100 font-black rounded-xl px-6 md:px-8 h-10 md:h-12 uppercase tracking-widest text-[10px] md:text-xs">
                                     View Details
                                   </Button>
                                 </div>
                               </div>
                               <div className="absolute top-8 right-8">
                                  <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-white font-black px-4 py-2 text-xs animate-pulse">
                                    NOW TRENDING
                                  </Badge>
                               </div>
                             </motion.div>
                           )
                        })()}
                      </AnimatePresence>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                      {highlightItems.filter((_, i) => i !== currentHighlightIdx).slice(0, 4).map((item) => {
                         return (
                           <motion.div 
                             key={item.id}
                             whileHover={{ y: -4 }}
                             onClick={() => {
                               setSelectedProduct(item);
                               setActiveImageIdx(0);
                             }}
                             className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-neutral-50 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500"
                           >
                             <img src={item.image} alt="" className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                             <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <p className="text-[8px] font-mono font-black text-white/80 mb-1">{item.product_code}</p>
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-black text-white uppercase line-clamp-1">{item.category}</p>
                                  <div className="text-right">
                                    {item.original_price && item.original_price > item.price && (
                                      <p className="text-[8px] text-white/50 line-through">TK {item.original_price}</p>
                                    )}
                                    <p className="text-[13px] font-black text-white">TK {item.price}</p>
                                  </div>
                                </div>
                             </div>
                           </motion.div>
                         );
                       })}
                     </div>
                  </div>
                </section>

                {/* In-Stock Collection Section */}
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-neutral-900 dark:text-foreground tracking-tight uppercase">
                        Available Now
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 dark:text-muted-foreground">All in-stock collections</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedCategory('All')}
                      className="text-[10px] font-black uppercase tracking-widest hover:bg-neutral-900 dark:hover:bg-neutral-100 hover:text-white dark:hover:text-neutral-900 transition-all gap-2 dark:text-muted-foreground"
                    >
                      Browse Catalog <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {items
                      .filter(i => i.inventory.some(inv => inv.quantity > 0))
                      .sort((a, b) => (b.display_order || 0) - (a.display_order || 0))
                      .map((item: any) => (
                      <div 
                        key={item.id} 
                        className="group cursor-pointer space-y-4"
                        onClick={() => {
                          setSelectedProduct(item);
                          setActiveImageIdx(0);
                        }}
                      >
                        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-neutral-50 dark:bg-neutral-900 shadow-sm transition-all duration-500 hover:shadow-xl group-hover:-translate-y-1">
                          <img src={item.image} alt="" className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                          <div className="absolute top-3 left-3 z-20">
                            <span className="inline-block px-3 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] font-mono font-black uppercase rounded-lg shadow-2xl">
                              {item.product_code}
                            </span>
                          </div>
                          <div className="absolute inset-0 border-[12px] border-white/40 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                        </div>
                        <div className="px-2">
                          <div className="flex justify-between items-start mb-1">
                             {item.product_code && <p className="text-[10px] font-mono font-black text-neutral-400 dark:text-muted-foreground uppercase tracking-widest">{item.product_code}</p>}
                             <div className="flex flex-col items-end">
                               {item.original_price && item.original_price > item.price && (
                                 <span className="text-[9px] text-neutral-400 dark:text-muted-foreground line-through font-medium">TK {item.original_price.toLocaleString()}</span>
                               )}
                               <p className="text-lg font-black text-neutral-900 dark:text-foreground">
                                 TK {item.price.toLocaleString()}
                                 {item.original_price && item.original_price > item.price && (
                                   <span className="ml-1 text-[10px] text-red-500 font-black">
                                     (-{Math.round(((item.original_price - item.price) / item.original_price) * 100)}%)
                                   </span>
                                 )}
                               </p>
                             </div>
                          </div>
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-foreground line-clamp-1 group-hover:text-neutral-500 transition-colors uppercase">{item.category}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                
                <div className="relative py-8">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-neutral-100 dark:border-neutral-800" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-neutral-950 px-6 text-[10px] font-black uppercase tracking-[0.5em] text-neutral-300 dark:text-neutral-600">Catalog Explorer</span>
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                  <div className="flex-1 flex flex-wrap gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-muted-foreground ml-1">Price Range</label>
                      <select 
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(e.target.value as any)}
                        className="h-10 px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold dark:text-foreground focus:ring-0 focus:border-neutral-900 dark:focus:border-gold transition-all outline-none"
                      >
                        <option value="all">Any Price</option>
                        <option value="under1000">Under TK 1,000</option>
                        <option value="1000-3000">TK 1,000 - TK 3,000</option>
                        <option value="over3000">Over TK 3,000</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-muted-foreground ml-1">Availability</label>
                      <select 
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value as any)}
                        className="h-10 px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold dark:text-foreground focus:ring-0 focus:border-neutral-900 dark:focus:border-gold transition-all outline-none"
                      >
                        <option value="all">All Items</option>
                        <option value="instock">In Stock Only</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-muted-foreground ml-1">Sort By</label>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="h-10 px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold dark:text-foreground focus:ring-0 focus:border-neutral-900 dark:focus:border-gold transition-all outline-none"
                      >
                        <option value="newest">Latest Arrivals</option>
                        <option value="priceLow">Price: Low to High</option>
                        <option value="priceHigh">Price: High to Low</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setPriceFilter('all');
                        setStockFilter('all');
                        setSortBy('newest');
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="text-[9px] font-black uppercase tracking-widest h-10 px-4 hover:bg-neutral-900 hover:text-white transition-all rounded-xl"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="group overflow-hidden border-none shadow-sm transition-all hover:shadow-md cursor-pointer" onClick={() => {
                      setSelectedProduct(item);
                      setActiveImageIdx(0);
                    }}>
                      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute left-3 top-3 flex flex-col gap-2">
                          {item.product_code && (
                            <div className="bg-neutral-900 text-white text-[10px] font-mono font-black px-2 py-1 rounded shadow-xl tracking-widest border border-white/20">
                              CODE: {item.product_code}
                            </div>
                          )}
                          <Badge className="bg-white/90 text-neutral-900 hover:bg-white shadow-sm font-bold uppercase tracking-widest text-[8px]">
                            {item.category}
                          </Badge>
                          {item.original_price && item.original_price > item.price && (
                            <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-xl tracking-widest border border-white/20">
                              {Math.round(((item.original_price - item.price) / item.original_price) * 100)}% OFF
                            </div>
                          )}
                        </div>
                      </div>
                      <CardHeader className="p-4 pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base font-bold line-clamp-1 dark:text-foreground">
                              {item.product_code && (
                                <span className="inline-block px-1.5 py-0.5 bg-neutral-900 dark:bg-foreground text-white dark:text-background text-[9px] font-mono font-black mr-2 uppercase rounded-sm">
                                  {item.product_code}
                                </span>
                              )}
                              {item.category}
                            </CardTitle>
                            <CardDescription className="line-clamp-1 text-xs dark:text-muted-foreground">{item.description}</CardDescription>
                          </div>
                          <div className="flex flex-col items-end">
                            {item.original_price && item.original_price > item.price && (
                              <span className="text-[10px] text-neutral-400 dark:text-muted-foreground line-through font-medium">TK {item.original_price.toLocaleString()}</span>
                            )}
                            <span className="text-xl font-black text-neutral-900 dark:text-foreground">TK {item.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-4">
                        <div className="flex flex-wrap gap-2">
                          {item.inventory.map((inv) => (
                            <Button
                              key={inv.size}
                              variant="outline"
                              size="sm"
                              disabled={inv.quantity === 0}
                              className={`h-8 min-w-[2.5rem] px-2 text-[10px] font-bold ${
                                inv.quantity === 0 ? 'opacity-50' : 'hover:bg-neutral-900 hover:text-white'
                              }`}
                              onClick={() => addToCart(item, inv.size as any)}
                            >
                              {inv.size}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                          {item.inventory.reduce((s, i) => s + i.quantity, 0)} items in stock
                        </p>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="admin" className="mt-0">
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Admin Inventory & Pricing</CardTitle>
                    <CardDescription>Manage your product catalog and stock levels.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedProductIds.length > 0 && (
                      <Button 
                        variant="destructive" 
                        onClick={() => setShowBulkDeleteProductsConfirm(true)}
                        disabled={isBulkDeleting}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete ({selectedProductIds.length})
                      </Button>
                    )}
                    {items.length === 0 && (
                      <Button variant="outline" onClick={seedInitialData} className="flex items-center gap-2 border-dashed">
                        <Sparkles className="h-4 w-4" />
                        Seed Sample Data
                      </Button>
                    )}
                    <Button variant="outline" onClick={async () => {
                      try {
                        const res = await fetch('/api/send-email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            to: 'lizlifestylebd@gmail.com',
                            subject: 'Test Email Configuration',
                            html: '<p>If you see this, your Resend config is working!</p>'
                          })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          alert('Success! Check lizlifestylebd@gmail.com');
                        } else {
                          alert(`Failed: ${data.tip || data.error}`);
                        }
                      } catch (e) {
                        alert('Connection Error');
                      }
                    }} className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Test Email
                    </Button>
                    <Button variant="outline" onClick={exportInventoryExcel} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Export Excel
                    </Button>
                    <Button onClick={() => setIsAddingItem(true)} className="bg-neutral-900 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isAddingItem && (
                    <Card className="mb-8 border-2 border-dashed border-neutral-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{editingItemId ? 'Edit Product' : 'Add New Product'}</CardTitle>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setIsAddingItem(false);
                            setEditingItemId(null);
                          }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            {saveStatus && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                                  saveStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {saveStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                {saveStatus.message}
                              </motion.div>
                            )}
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-neutral-500">Dress Code (Product Code)</label>
                              <Input 
                                value={newItemForm.product_code}
                                onChange={(e) => setNewItemForm({...newItemForm, product_code: e.target.value})}
                                placeholder="e.g. LIZ-2024-001"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-neutral-500">Category / Collection</label>
                                <select 
                                  required
                                  value={newItemForm.category}
                                  onChange={(e) => setNewItemForm({...newItemForm, category: e.target.value})}
                                  className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <option value="" disabled>Select Category</option>
                                  {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-neutral-500">Display Order (Lower = Top)</label>
                                <Input 
                                  type="number"
                                  value={newItemForm.display_order}
                                  onChange={(e) => setNewItemForm({...newItemForm, display_order: e.target.value})}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-neutral-500">Sale Price (Discount Price) (TK)</label>
                                <Input 
                                  required
                                  type="number"
                                  value={newItemForm.price}
                                  onChange={(e) => setNewItemForm({...newItemForm, price: e.target.value})}
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-neutral-500">Regular Price (Original Price) (TK)</label>
                                <Input 
                                  type="number"
                                  value={newItemForm.original_price}
                                  onChange={(e) => setNewItemForm({...newItemForm, original_price: e.target.value})}
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-neutral-500">Main Product Image (URL)</label>
                                <Input 
                                  required
                                  value={newItemForm.image}
                                  onChange={(e) => setNewItemForm({...newItemForm, image: e.target.value})}
                                  placeholder="Enter image URL..."
                                />
                                {newItemForm.image && (
                                  <div className="mt-2 h-20 w-20 rounded border overflow-hidden bg-neutral-50">
                                    <img src={newItemForm.image} alt="Preview" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-neutral-500">Product Video (URL)</label>
                                <Input 
                                  value={newItemForm.video_url}
                                  onChange={(e) => setNewItemForm({...newItemForm, video_url: e.target.value})}
                                  placeholder="Enter video URL (mp4, youtube, etc.)..."
                                />
                                {newItemForm.video_url && (
                                  <div className="mt-2 aspect-video rounded border overflow-hidden bg-neutral-900 flex items-center justify-center">
                                    <p className="text-[10px] text-white font-mono truncate px-2">{newItemForm.video_url}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-neutral-500">Additional Images (URLs)</label>
                              <div className="space-y-3">
                                {newItemForm.images.map((img, idx) => (
                                  <div key={idx} className="flex gap-2 items-start">
                                    <div className="flex-1 space-y-2">
                                      <Input 
                                        value={img}
                                        onChange={(e) => {
                                          const newImages = [...newItemForm.images];
                                          newImages[idx] = e.target.value;
                                          setNewItemForm({...newItemForm, images: newImages});
                                        }}
                                        placeholder="Enter image URL..."
                                        className="h-8 text-xs"
                                      />
                                      {img && (
                                        <div className="h-12 w-12 flex-shrink-0 rounded border overflow-hidden bg-neutral-50">
                                          <img src={img} alt="Preview" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                                        </div>
                                      )}
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      type="button"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const newImages = newItemForm.images.filter((_, i) => i !== idx);
                                        setNewItemForm({...newItemForm, images: newImages});
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  type="button"
                                  className="w-full border-dashed"
                                  onClick={() => setNewItemForm({...newItemForm, images: [...newItemForm.images, '']})}
                                >
                                  <Plus className="h-3 w-3 mr-2" /> Add Image URL Slot
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-neutral-500">Description</label>
                              <Input 
                                required
                                value={newItemForm.description}
                                onChange={(e) => setNewItemForm({...newItemForm, description: e.target.value})}
                                placeholder="Product details..."
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <label className="text-xs font-bold uppercase text-neutral-500">Initial Inventory</label>
                            <div className="grid grid-cols-2 gap-4">
                              {newItemForm.inventory.map((inv, idx) => (
                                <div key={inv.size} className="flex items-center justify-between rounded-lg border p-3">
                                  <span className="font-bold">{inv.size}</span>
                                  <Input 
                                    type="number"
                                    className="h-8 w-20 text-right"
                                    value={inv.quantity}
                                    onChange={(e) => {
                                      const newInv = [...newItemForm.inventory];
                                      newInv[idx].quantity = parseInt(e.target.value) || 0;
                                      setNewItemForm({...newItemForm, inventory: newInv});
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="pt-4">
                              <Button type="submit" className="w-full bg-neutral-900 text-white h-12">
                                Save Product
                              </Button>
                            </div>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}
                  <div className="rounded-md border overflow-x-auto">
                    <div className="min-w-[800px]">
                      <div className="grid grid-cols-12 bg-neutral-50 p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">
                        <div className="col-span-1 flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={items.length > 0 && selectedProductIds.length === items.length}
                            onChange={toggleSelectAllProducts}
                            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                          />
                        </div>
                        <div className="col-span-2">Product</div>
                        <div className="col-span-2">Price (TK)</div>
                        <div className="col-span-4 text-center">Stock by Size</div>
                        <div className="col-span-1 text-center">Order</div>
                        <div className="col-span-2 text-right">Actions</div>
                      </div>
                      <div className="divide-y text-xs">
                        {items.map((item) => (
                          <div key={item.id} className={`grid grid-cols-12 items-center p-4 transition-colors hover:bg-neutral-50/50 ${selectedProductIds.includes(item.id) ? 'bg-neutral-50' : ''}`}>
                            <div className="col-span-1 flex items-center justify-center">
                              <input 
                                type="checkbox" 
                                checked={selectedProductIds.includes(item.id)}
                                onChange={() => toggleSelectProduct(item.id)}
                                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                              />
                            </div>
                            <div className="col-span-2 flex items-center gap-3">
                              <img src={item.image} alt="" className="h-10 w-10 rounded-md object-cover" referrerPolicy="no-referrer" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  {item.product_code && (
                                    <span className="text-[9px] font-mono font-bold text-neutral-900 bg-neutral-100 px-1 rounded uppercase">
                                      {item.product_code}
                                    </span>
                                  )}
                                  <p className="font-semibold text-sm truncate">{item.name}</p>
                                </div>
                                <p className="text-[10px] text-neutral-400 truncate">{item.category}</p>
                              </div>
                            </div>
                            <div className="col-span-2 px-2 flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-neutral-400 w-4">Now</span>
                                <Input 
                                  type="number" 
                                  value={item.price} 
                                  onChange={(e) => updatePrice(item.id, parseFloat(e.target.value))}
                                  className="h-7 w-20 text-xs font-bold"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-neutral-400 w-4">Was</span>
                                <Input 
                                  type="number" 
                                  value={item.original_price || ''} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updatedPrice = val ? parseFloat(val) : null;
                                    updateDoc(doc(db, 'products', item.id), { original_price: updatedPrice });
                                  }}
                                  className="h-7 w-20 text-xs text-neutral-400"
                                  placeholder="None"
                                />
                              </div>
                            </div>
                            <div className="col-span-5 flex justify-center gap-1 sm:gap-2">
                              {item.inventory.map((inv) => (
                                <div key={inv.size} className="flex flex-col items-center gap-1">
                                  <span className="text-[9px] font-bold text-neutral-400 truncate max-w-[40px]" title={inv.size}>
                                    {inv.size === 'Unstitched' ? 'Unst.' : inv.size === 'Freesize' ? 'Free' : inv.size}
                                  </span>
                                  <div className="flex items-center gap-1 rounded-lg border bg-white p-0.5 sm:p-1">
                                    <button onClick={() => updateInventory(item.id, inv.size, inv.quantity - 1)} className="rounded p-0.5 hover:bg-neutral-100">
                                      <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
                                    </button>
                                    <span className={`min-w-[2ch] text-center text-[10px] sm:text-xs font-bold ${inv.quantity < 5 ? 'text-red-500' : ''}`}>
                                      {inv.quantity}
                                    </span>
                                    <button onClick={() => updateInventory(item.id, inv.size, inv.quantity + 1)} className="rounded p-0.5 hover:bg-neutral-100">
                                      <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="col-span-1 flex flex-col items-center gap-1">
                              <span className="font-bold text-sm">{(item as any).display_order || 0}</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveProduct(item, 'top')} title="Move to Top">
                                  <TrendingUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rotate-180" onClick={() => moveProduct(item, 'bottom')} title="Move to Bottom">
                                  <TrendingUp className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="col-span-2 flex justify-end gap-2">
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => startEditing(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setConfirmDeleteId(item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </TabsContent>

              <TabsContent value="media" className="mt-0">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Product Media Library</CardTitle>
                  <CardDescription>All images associated with your products.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {items.flatMap(item => {
                      const media = [];
                      if (item.image) media.push({ url: item.image, type: 'image' as const, itemName: item.name, itemId: item.id, idx: 0 });
                      if (item.video_url) media.push({ url: item.video_url, type: 'video' as const, itemName: item.name, itemId: item.id, idx: -1 });
                      if (item.images) {
                        item.images.forEach((img, idx) => {
                          if (img !== item.image) {
                            media.push({ url: img, type: 'image' as const, itemName: item.name, itemId: item.id, idx });
                          }
                        });
                      }
                      return media;
                    }).map(({ url, type, itemName, itemId, idx }, i) => (
                      <motion.div 
                        key={`${itemId}-${type}-${idx}-${i}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative aspect-square rounded-lg overflow-hidden border bg-neutral-100"
                      >
                        {type === 'image' ? (
                          <img src={url} alt={itemName} className="h-full w-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-full w-full bg-neutral-900 flex items-center justify-center">
                            <Sparkles className="h-8 w-8 text-white/20" />
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-[8px] uppercase">Video</Badge>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                          <p className="text-[10px] text-white font-bold text-center line-clamp-2">{itemName}</p>
                          <div className="flex gap-1">
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="h-7 w-7" 
                              title="Copy URL"
                              onClick={() => {
                                navigator.clipboard.writeText(url);
                                alert(`${type === 'image' ? 'Image' : 'Video'} URL copied to clipboard!`);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="h-7 w-7" 
                              title="View Product"
                              onClick={() => {
                                const item = items.find(it => it.id === itemId);
                                if (item) {
                                  setSelectedProduct(item);
                                  if (type === 'image') setActiveImageIdx(idx);
                                }
                              }}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {items.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                      No media found. Add products to see images here.
                    </div>
                  )}
                </CardContent>
              </Card>
              </TabsContent>

              <TabsContent value="homepage" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      Highlight Slots (15)
                    </CardTitle>
                    <CardDescription>Select up to 15 products to showcase in the premium highlights section.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((slotIdx) => {
                        const selectedId = homepageSettings.highlight_product_ids?.[slotIdx];
                        const product = items.find(i => i.id === selectedId);
                        
                        return (
                          <div key={slotIdx} className="flex items-center gap-4 p-3 border rounded-xl bg-neutral-50/50">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900 text-white text-[10px] font-black">
                              {slotIdx + 1}
                            </div>
                            <div className="flex-1">
                              <select 
                                value={selectedId || ''}
                                onChange={async (e) => {
                                  const newIds = [...(homepageSettings.highlight_product_ids || [])];
                                  newIds[slotIdx] = e.target.value;
                                  const settingsRef = doc(db, 'settings', 'homepage');
                                  try {
                                    await updateDoc(settingsRef, { highlight_product_ids: newIds });
                                  } catch {
                                    await setDoc(settingsRef, { 
                                      highlight_product_ids: newIds,
                                      featured_category: homepageSettings.featured_category || 'Coco'
                                    });
                                  }
                                }}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold h-10"
                              >
                                <option value="">Select a Product...</option>
                                {sequentialItems.map(item => (
                                  <option key={item.id} value={item.id}>
                                    {item.product_code ? `[${item.product_code}] ` : ''}{item.category}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {product && (
                              <img src={product.image} className="w-10 h-10 object-cover rounded-md" alt="" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>

              <TabsContent value="orders" className="mt-0">
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Order Management</CardTitle>
                    <CardDescription>Track and process customer orders.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedOrderIds.length > 0 && (
                      <Button 
                        variant="destructive" 
                        onClick={() => setShowBulkDeleteOrdersConfirm(true)}
                        disabled={isBulkDeleting}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete ({selectedOrderIds.length})
                      </Button>
                    )}
                    <Button variant="outline" onClick={exportOrdersExcel} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {orders.length === 0 ? (
                      <div className="flex h-64 flex-col items-center justify-center text-neutral-400">
                        <ClipboardList className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No orders yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b text-xs font-bold uppercase text-neutral-500">
                              <th className="pb-4 pr-4 w-10">
                                <input 
                                  type="checkbox" 
                                  checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                                  onChange={toggleSelectAllOrders}
                                  className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                                />
                              </th>
                              <th className="pb-4 pr-4">Order ID</th>
                              <th className="pb-4 pr-4">Customer</th>
                              <th className="pb-4 pr-4">Items</th>
                              <th className="pb-4 pr-4">Total</th>
                              <th className="pb-4 pr-4">Status</th>
                              <th className="pb-4 pr-4">Date</th>
                              <th className="pb-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order) => (
                              <tr key={order.id} className={`border-b last:border-0 hover:bg-neutral-50/50 ${selectedOrderIds.includes(order.id) ? 'bg-neutral-50' : ''} ${order.id > lastCheckedOrderId ? 'bg-blue-50/30' : ''}`}>
                                <td className="py-4 pr-4">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedOrderIds.includes(order.id)}
                                    onChange={() => toggleSelectOrder(order.id)}
                                    className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                                  />
                                </td>
                                <td className="py-4 pr-4 font-mono font-bold">#{order.id}</td>
                                <td className="py-4 pr-4">
                                  <div className="font-bold">{order.customer_name}</div>
                                  <div className="text-xs text-neutral-500">{order.phone}</div>
                                  <div className="text-[10px] text-neutral-400 max-w-[200px] truncate">{order.address}</div>
                                </td>
                                <td className="py-4 pr-4">
                                  <div className="flex -space-x-2">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="h-8 w-8 rounded-full border-2 border-white bg-neutral-100 overflow-hidden" title={`[${item.product_code || 'N/A'}] ${item.category} (${item.size}) x${item.quantity}`}>
                                        <img src={item.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                      </div>
                                    ))}
                                    {order.items.length > 3 && (
                                      <div className="h-8 w-8 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center text-[10px] font-bold">
                                        +{order.items.length - 3}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 pr-4">
                                  <div className="font-bold">TK {order.total_amount}</div>
                                  <div className="text-[10px] text-neutral-500">Charge: TK {order.delivery_charge}</div>
                                </td>
                                <td className="py-4 pr-4">
                                  <select 
                                    value={order.status}
                                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-none focus:ring-0 cursor-pointer ${
                                      order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                      order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                      'bg-neutral-100 text-neutral-700'
                                    }`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </td>
                                <td className="py-4 pr-4 text-neutral-500 text-xs">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </td>
                                <td className="py-4 text-right flex items-center justify-end gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-neutral-400 hover:text-neutral-900"
                                    onClick={() => generateInvoicePDF(order)}
                                    title="Download Invoice"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-neutral-400 hover:text-red-600"
                                    onClick={() => setConfirmDeleteOrderId(order.id)}
                                    title="Delete Order"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
        </Tabs>
      )}
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDeleteId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold">Delete Product?</h2>
                <p className="text-sm text-neutral-500">This action cannot be undone. All product data and images will be removed.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={() => handleDeleteItem(confirmDeleteId)}>
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmDeleteOrderId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDeleteOrderId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold">Delete Order?</h2>
                <p className="text-sm text-neutral-500">This action will permanently delete the order and restore product stock.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteOrderId(null)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={() => handleDeleteOrder(confirmDeleteOrderId)}>
                  Restore Stock & Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {showBulkDeleteProductsConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkDeleteProductsConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold">Delete {selectedProductIds.length} Products?</h2>
                <p className="text-sm text-neutral-500">Are you sure? This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowBulkDeleteProductsConfirm(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2" 
                  onClick={handleBulkDeleteProducts}
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete All'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {showBulkDeleteOrdersConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkDeleteOrdersConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold">Delete {selectedOrderIds.length} Orders?</h2>
                <p className="text-sm text-neutral-500">This will restore stock for all items in these orders. Are you sure?</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowBulkDeleteOrdersConfirm(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2" 
                  onClick={handleBulkDeleteOrders}
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Restore & Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                  <Lock className="h-6 w-6 text-neutral-900" />
                </div>
                <h2 className="text-2xl font-bold">Admin Login</h2>
                <p className="text-sm text-neutral-500">
                  Access restricted to authorized personnel only.
                </p>
              </div>
              <div className="space-y-4">
                {loginError && (
                  <p className="text-xs font-bold text-red-500 text-center">
                    {loginError}
                  </p>
                )}
                <Button 
                  onClick={handleGoogleLogin}
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800 flex items-center justify-center gap-2 h-12 rounded-xl font-bold"
                >
                  <LogIn className="h-5 w-5" />
                  Sign in with Google
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b dark:border-neutral-800 p-6">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    <h2 className="text-xl font-bold">Your Bag</h2>
                    <Badge variant="secondary" className="ml-1">
                      {cart.reduce((s, i) => s + i.cartQuantity, 0)}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-6">
                  {cart.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-neutral-400">
                      <ShoppingBag className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium">Your bag is empty.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {cart.map((item) => (
                        <div key={`${item.id}-${item.selectedSize}`} className="flex gap-4">
                          <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex flex-1 flex-col justify-between">
                            <div>
                              <div className="flex justify-between">
                                <h3 className="font-semibold">
                                  {item.product_code && <span className="text-[10px] font-mono font-bold text-neutral-400 mr-1 uppercase">{item.product_code}</span>}
                                  {item.category}
                                </h3>
                                <p className="text-lg font-black text-neutral-900 dark:text-foreground">TK {(item.price * item.cartQuantity).toLocaleString()}</p>
                              </div>
                              <p className="text-xs text-neutral-500">Size: {item.selectedSize}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 rounded-lg border p-1">
                                <button onClick={() => setCart(cart.map(c => c.id === item.id && c.selectedSize === item.selectedSize ? { ...c, cartQuantity: Math.max(1, c.cartQuantity - 1) } : c))} className="rounded p-1 hover:bg-neutral-100">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="min-w-[2ch] text-center text-sm font-bold">{item.cartQuantity}</span>
                                <button onClick={() => setCart(cart.map(c => c.id === item.id && c.selectedSize === item.selectedSize ? { ...c, cartQuantity: c.cartQuantity + 1 } : c))} className="rounded p-1 hover:bg-neutral-100">
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-red-500" onClick={() => setCart(cart.filter(c => !(c.id === item.id && c.selectedSize === item.selectedSize)))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="border-t dark:border-neutral-800 p-6 space-y-4">
                  <div className="flex items-center justify-between text-2xl font-black text-neutral-900 dark:text-foreground">
                    <span>Total</span>
                    <span>TK {totalCartPrice.toLocaleString()}</span>
                  </div>
                  <Button 
                    className="w-full h-12 bg-neutral-900 text-white hover:bg-neutral-800" 
                    disabled={cart.length === 0}
                    onClick={() => setIsCheckoutOpen(true)}
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-6 top-6 z-[110] text-white hover:bg-white/20"
              onClick={() => setZoomedImage(null)}
            >
              <X className="h-8 w-8" />
            </Button>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-h-full max-w-full overflow-hidden rounded-xl shadow-2xl bg-neutral-900"
            >
              <div className="relative h-full w-full overflow-hidden cursor-zoom-out" onClick={() => setZoomedImage(null)}>
                <motion.img
                  src={zoomedImage}
                  alt="Zoomed"
                  className="h-full w-full object-contain transition-transform duration-300 ease-out"
                  whileHover={{ scale: 1.5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  referrerPolicy="no-referrer"
                  onMouseMove={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const { left, top, width, height } = target.getBoundingClientRect();
                    const x = ((e.clientX - left) / width) * 100;
                    const y = ((e.clientY - top) / height) * 100;
                    target.style.transformOrigin = `${x}% ${y}%`;
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Checkout</h2>
                <p className="text-sm text-neutral-500">Complete your order details below.</p>
              </div>
              
              <form onSubmit={handleCheckout} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Full Name</label>
                  <Input 
                    required
                    value={checkoutForm.customer_name}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })}
                    placeholder="Miss Rani"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Phone Number</label>
                  <Input 
                    required
                    type="tel"
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Delivery Address</label>
                  <textarea 
                    required
                    value={checkoutForm.address}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="House, Road, Area, City"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Delivery Location</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setCheckoutForm({ ...checkoutForm, delivery_location: 'inside' })}
                      className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                        checkoutForm.delivery_location === 'inside' 
                          ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold">Inside Dhaka</p>
                        <p className="text-xs text-neutral-500">TK 80 charge</p>
                      </div>
                      {checkoutForm.delivery_location === 'inside' && <CheckCircle2 className="h-5 w-5 text-neutral-900" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutForm({ ...checkoutForm, delivery_location: 'outside' })}
                      className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                        checkoutForm.delivery_location === 'outside' 
                          ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold">Outside Dhaka</p>
                        <p className="text-xs text-neutral-500">TK 150 charge</p>
                      </div>
                      {checkoutForm.delivery_location === 'outside' && <CheckCircle2 className="h-5 w-5 text-neutral-900" />}
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Subtotal</span>
                    <span>TK {totalCartPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Delivery</span>
                    <span>TK {deliveryCharge}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>TK {finalTotal}</span>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmittingOrder}
                  className="w-full h-12 bg-neutral-900 text-white hover:bg-neutral-800 mt-4"
                >
                  {isSubmittingOrder ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Confirm Order'
                  )}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Success Modal */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderSuccess(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Order Placed!</h2>
              <p className="mb-6 text-neutral-500">Thank you for your order. We will contact you soon for confirmation.</p>
              
              <div className="flex flex-col gap-3">
                <Button 
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => lastOrder && generateInvoicePDF(lastOrder)}
                >
                  <Download className="h-4 w-4" />
                  Download Invoice
                </Button>
                <Button 
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
                  onClick={() => {
                    setOrderSuccess(false);
                    setLastOrder(null);
                  }}
                >
                  Continue Shopping
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
