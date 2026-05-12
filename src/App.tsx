import { useState, useMemo, useEffect, useCallback, FormEvent } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
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
  MapPin,
  Phone,
  Instagram,
  Facebook,
  Sun,
  Moon,
  User as UserIcon,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ClothingItem, CartItem, Order, HomepageSettings, UserProfile } from './core/types';
import {
  db,
  auth,
  loginWithGoogle,
  loginWithEmail,
  signUpWithEmail,
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
  where,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  Timestamp,
  User
} from './core/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { MainLayout } from './components/layout/MainLayout';
import { ProductCard } from './features/catalog/ProductCard';
import { ProductDetails } from './features/catalog/ProductDetails';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { CartDrawer } from './features/cart/CartDrawer';
import { Collection } from './features/catalog/Collection';
import { LoginModal } from './features/auth/LoginModal';
import { ProfileModal } from './features/auth/ProfileModal';
import { CheckoutModal } from './features/checkout/CheckoutModal';
import { CatalogService, OrderService, ProfileService } from './services/api';

// Simple logger for events
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data),
};

// --- Helper Components ---
function ProductViewWrapper({ 
  items, 
  handleAddToCart, 
  handleBuyNow, 
  activeImageIdx, 
  setActiveImageIdx 
}: { 
  items: ClothingItem[], 
  handleAddToCart: any, 
  handleBuyNow: any,
  activeImageIdx: number,
  setActiveImageIdx: any
}) {
  const { productId } = useParams<{ productId: string }>();
  const item = items.find(i => i.id === productId);

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <Button onClick={() => window.location.href = '/'}>Go Home</Button>
      </div>
    );
  }

  return (
    <motion.div
      key="product"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container mx-auto px-4 py-8"
    >
      <ProductDetails
        item={item}
        isFullPage={true}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        activeImageIdx={activeImageIdx}
        setActiveImageIdx={setActiveImageIdx}
      />
    </motion.div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { category: urlCategory, productId: urlProductId } = useParams();
  const location = useLocation();

  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return false;
    }
    return false;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);
  const [showBulkDeleteProductsConfirm, setShowBulkDeleteProductsConfirm] = useState(false);
  const [showBulkDeleteOrdersConfirm, setShowBulkDeleteOrdersConfirm] = useState(false);

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState('');


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
    inventory: []
  });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const handleFileUpload = async (file: File, type: 'main' | 'additional', index?: number) => {
    if (!file) return;

    if (!auth.currentUser) {
      setSaveStatus({ type: 'error', message: 'You must be logged in as an admin to upload images.' });
      return;
    }

    setIsUploading(true);
    console.log(`Starting Cloudinary upload for ${file.name} (${type})...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Upload failed with status ${response.status}`);
        } else {
          const text = await response.text();
          throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
        }
      }

      const data = await response.json();
      const downloadURL = data.url;

      console.log('File uploaded successfully to Cloudinary. URL:', downloadURL);

      if (type === 'main') {
        setNewItemForm(prev => ({ ...prev, image: downloadURL }));
      } else if (type === 'additional' && typeof index === 'number') {
        setNewItemForm(prev => {
          const newImages = [...prev.images];
          newImages[index] = downloadURL;
          return { ...prev, images: newImages };
        });
      }

      setSaveStatus({ type: 'success', message: 'Image uploaded successfully to Cloudinary.' });
    } catch (error: any) {
      console.error('Cloudinary upload failed:', error);
      setSaveStatus({ type: 'error', message: `Upload failed: ${error.message}` });
    } finally {
      setIsUploading(false);
    }
  };
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings>({
    highlight_product_ids: [],
    featured_product_ids: [],
    featured_category: 'Coco'
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ClothingItem | null>(null);

  // User Profile & Order tracking
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Sync state FROM URL
  useEffect(() => {
    // Determine where we are based on path
    const path = location.pathname;

    if (path === '/') {
      setSelectedCategory('All');
      setSelectedProduct(null);
      setShowAdminDashboard(false);
    } else if (path === '/admin') {
      setShowAdminDashboard(true);
    } else if (path.startsWith('/category/')) {
      const cat = decodeURIComponent(path.split('/category/')[1]);
      setSelectedCategory(cat);
      setSelectedProduct(null);
      setShowAdminDashboard(false);
    } else if (path.startsWith('/product/')) {
      const prodId = path.split('/product/')[1];
      setShowAdminDashboard(false);
      if (items.length > 0) {
        const item = items.find(i => i.id === prodId);
        if (item) {
          setSelectedProduct(item);
        }
      }
    }
  }, [location.pathname, items]);

  // Dynamic Page Title & Meta for better SEO
  useEffect(() => {
    let title = "Liz Lifestyle | Premium Fashion & Elegant Apparel";
    let metaDesc = "Shop the latest in premium fashion at Liz Lifestyle. Quality and elegance in every thread.";

    if (selectedProduct) {
      title = `${selectedProduct.category} | ${selectedProduct.product_code} - Liz Lifestyle`;
      metaDesc = selectedProduct.description.substring(0, 160);
    } else if (selectedCategory !== 'All') {
      title = `${selectedCategory} Collection - Liz Lifestyle`;
      metaDesc = `Discover the exclusive ${selectedCategory} collection at Liz Lifestyle. Elegance in every thread.`;
    }

    document.title = title;
    const metaTag = document.querySelector('meta[name="description"]');
    if (metaTag) {
      metaTag.setAttribute('content', metaDesc);
    }

    // Also update OG tags for some crawlers that might read it after JS
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', metaDesc);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);

    trackMetaEvent('PageView', {}, `pv_${Date.now()}`);

    if (selectedProduct) {
      trackMetaEvent('ViewContent', {
        content_ids: [selectedProduct.id],
        content_name: selectedProduct.name,
        content_category: selectedProduct.category,
        value: selectedProduct.price,
        currency: 'BDT',
        content_type: 'product'
      }, `vc_${selectedProduct.id}_${Date.now()}`);
    }
  }, [selectedProduct, selectedCategory, location.pathname]);

  // Helper navigating functions
  const goToCategory = (cat: string) => {
    if (cat === 'All') {
      navigate('/');
    } else {
      navigate(`/category/${encodeURIComponent(cat)}`);
    }
    setIsMenuOpen(false);
  };

  const goToProduct = (item: ClothingItem | null) => {
    setSelectedProduct(item);
    if (item) {
      navigate(`/product/${item.id}`);
    } else {
      // If we were in a category, go back to it, otherwise home
      if (selectedCategory !== 'All') {
        navigate(`/category/${encodeURIComponent(selectedCategory)}`);
      } else {
        navigate('/');
      }
    }
  };

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
      .filter((item): item is ClothingItem => !!item);
  }, [homepageSettings.highlight_product_ids, items]);

  useEffect(() => {
    if (isAdmin) {
      console.log("Current Homepage Settings:", homepageSettings);
      console.log("Available Highlight Items:", highlightItems);
    }
  }, [homepageSettings, highlightItems, isAdmin]);

  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
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

  const trackMetaEvent = useCallback(async (eventName: string, customData: any = {}, eventId?: string, userDataOverride: any = {}) => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      };

      // Generate a unique event ID if not provided
      const currentEventId = eventId || crypto.randomUUID?.() || `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const userData = {
        email: userDataOverride.email || user?.email || userProfile?.email || undefined,
        phone: userDataOverride.phone || userProfile?.phone || checkoutForm.phone || undefined,
        fn: (userDataOverride.name || userProfile?.displayName)?.split(' ')[0] || checkoutForm.customer_name?.split(' ')[0] || undefined,
        ln: (userDataOverride.name || userProfile?.displayName)?.split(' ').slice(1).join(' ') || checkoutForm.customer_name?.split(' ').slice(1).join(' ') || undefined,
        ct: (userDataOverride as any).city || (checkoutForm as any).city || undefined,
        st: (userDataOverride as any).state || (checkoutForm as any).state || undefined,
        zp: (userDataOverride as any).zip || (checkoutForm as any).zip || undefined,
        country: (userDataOverride as any).country || (checkoutForm as any).country || 'BD',
        external_id: user?.uid || undefined,
        fbc: getCookie('_fbc'),
        fbp: getCookie('_fbp'),
      };

      // Ensure numeric values for Meta
      const cleanData = { ...customData };
      if (cleanData.value) cleanData.value = Number(cleanData.value);

      // Simple hashing function for the browser
      const hashString = async (str: string) => {
        if (!str) return undefined;
        const msgUint8 = new TextEncoder().encode(str.trim().toLowerCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      };

      // Browser-side call for deduplication
      if (typeof window !== 'undefined' && (window as any).fbq) {
        const testCode = (import.meta as any).env?.VITE_META_TEST_EVENT_CODE;
        const pixelId = (import.meta as any).env?.VITE_META_PIXEL_ID;
        const options: any = { eventID: currentEventId };
        
        if (testCode) options.test_event_code = testCode;

        if (userData.email || userData.phone || userData.external_id) {
          const hashedEmail = await hashString(userData.email);
          const hashedPhone = await hashString(userData.phone?.replace(/\D/g, ''));
          const hashedFn = await hashString(userData.fn);
          const hashedLn = await hashString(userData.ln);

          (window as any).fbq('init', pixelId, {
            em: hashedEmail,
            ph: hashedPhone,
            fn: hashedFn,
            ln: hashedLn,
            external_id: userData.external_id
          });
          
          if (userData.external_id) {
            options.external_id = userData.external_id;
          }
        }

        (window as any).fbq('track', eventName, cleanData, options);
        logger.info(`[Meta] Browser event "${eventName}" sent`, { eventId: currentEventId, testMode: !!testCode });
      }

      const testCode = (import.meta as any).env?.VITE_META_TEST_EVENT_CODE;

      logger.info(`[Meta] Sending "${eventName}" to Server-side CAPI Proxy...`, { eventId: currentEventId });
      const response = await fetch('/api/meta-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          userData,
          customData: cleanData,
          eventSourceUrl: window.location.href,
          eventId: currentEventId,
          testEventCode: testCode,
        }),
      });

      if (!response.ok) {
        logger.warn(`[Meta] Server-side event failed with status: ${response.status}`);
      } else {
        const result = await response.json();
        logger.info(`[Meta] Server-side event result:`, result);
      }
    } catch (err) {
      logger.error(`[Meta Tracking Error] "${eventName}"`, err);
    }
  }, [user, userProfile, checkoutForm]);
  // Pre-fill checkout form with user profile
  useEffect(() => {
    if (userProfile && !checkoutForm.customer_name) {
      setCheckoutForm(prev => ({
        ...prev,
        customer_name: userProfile.displayName || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        delivery_location: userProfile.default_delivery_location || 'inside'
      }));
    }
  }, [userProfile]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [lastCheckedOrderId, setLastCheckedOrderId] = useState<string>(localStorage.getItem('last_checked_order_id') || '');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  const ADMIN_EMAILS = ['lizlifestylebd@gmail.com', 'joseph.nasif@gmail.com'].map(e => e.toLowerCase());

  const CATEGORY_HIERARCHY: Record<string, string[]> = {
    '3 pieces': ['COCO', 'ZAMZAM', 'Party dress']
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
        item.category.toLowerCase() === selectedCategory.toLowerCase() ||
        (CATEGORY_HIERARCHY[selectedCategory] || []).some(cat => cat.toLowerCase() === item.category.toLowerCase());

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

  useEffect(() => {
    if (!searchQuery) return;
    
    const timer = setTimeout(() => {
      trackMetaEvent('Search', { search_string: searchQuery }, `sh_${Date.now()}`);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const newOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'pending').length;
  }, [orders]);

  useEffect(() => {
    let unsubscribeOrders: () => void = () => { };

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAdmin(currentUser.email ? ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) : false);

        // Fetch/Sync Profile
        const profileRef = doc(db, 'userProfiles', currentUser.uid);
        try {
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data() as UserProfile);
          } else {
            // Create initial profile if it doesn't exist
            const newProfile: UserProfile = {
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Customer',
              created_at: new Date().toISOString()
            };
            await setDoc(profileRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `userProfiles/${currentUser.uid}`);
        }

        // Sync User Orders
        const userOrdersQuery = query(
          collection(db, 'orders'),
          where('user_id', '==', currentUser.uid)
        );
        unsubscribeOrders = onSnapshot(userOrdersQuery, (snapshot) => {
          const ordersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Order[];

          // Sort client-side by date to avoid composite index requirement
          const sortedOrders = [...ordersData].sort((a, b) => {
            const dateA = (a.created_at as any)?.toDate ? (a.created_at as any).toDate().getTime() :
              a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = (b.created_at as any)?.toDate ? (b.created_at as any).toDate().getTime() :
              b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });

          setUserOrders(sortedOrders);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        });

      } else {
        setIsAdmin(false);
        setUserProfile(null);
        setUserOrders([]);
        if (unsubscribeOrders) unsubscribeOrders();
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
    const unsubscribeSettings = onSnapshot(settingsDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        setHomepageSettings(snapshot.data() as HomepageSettings);
      } else {
        // Initialize settings if they don't exist
        const initialSettings: HomepageSettings = {
          highlight_product_ids: [],
          featured_product_ids: [],
          featured_category: 'ZAMZAM'
        };
        try {
          await setDoc(settingsDocRef, initialSettings);
          setHomepageSettings(initialSettings);
        } catch (e) {
          console.error("Failed to init settings", e);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/homepage');
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

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'userProfiles', user.uid);
      await updateDoc(profileRef, updates);
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      setSaveStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSaveStatus({ type: 'error', message: 'Failed to update profile.' });
    }
  };

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
      await loginWithGoogle();
      setShowLogin(false);
      trackMetaEvent('CompleteRegistration', { method: 'google' }, `reg_${Date.now()}`);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setLoginError('Login failed: domain not authorized. Please check Firebase settings.');
      } else if (err.code === 'auth/popup-blocked') {
        setLoginError('Login failed: Popup blocked. Please allow popups.');
      } else {
        setLoginError(`Login failed: ${err.message || 'Please try again.'}`);
      }
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please fill in all fields.');
      return;
    }

    setIsAuthLoading(true);
    setLoginError('');

    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!displayName) {
          setLoginError('Please enter your name.');
          setIsAuthLoading(false);
          return;
        }
        const userCred = await signUpWithEmail(email, password);
        // Create profile immediately to ensure form data is used
        try {
          await setDoc(doc(db, 'userProfiles', userCred.user.uid), {
            email,
            displayName: displayName,
            created_at: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `userProfiles/${userCred.user.uid}`);
        }
      }
      setShowLogin(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginError('Invalid email or password.');
      } else if (error.code === 'auth/email-already-in-use') {
        setLoginError('This email is already registered.');
      } else if (error.code === 'auth/weak-password') {
        setLoginError('Password should be at least 6 characters.');
      } else {
        setLoginError('Authentication failed. Please try again.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAdmin(false);
      setUserProfile(null);
      setUserOrders([]);
      setIsProfileOpen(false);
      setSaveStatus({ type: 'success', message: 'Signed out successfully.' });
    } catch (err) {
      console.error('Logout failed:', err);
      setSaveStatus({ type: 'error', message: 'Failed to sign out.' });
    }
  };


  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!isAdmin) return;
    try {
      await OrderService.updateOrderStatus(orderId, status);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleAddToCart = (item: ClothingItem, size: string, quantity: number = 1) => {
    const existing = cart.find(c => c.id === item.id && c.selectedSize === size);
    const inventoryItem = item.inventory.find(i => i.size === size);
    if (!inventoryItem || inventoryItem.quantity <= 0) return;

    if (existing) {
      const newQuantity = Math.min(existing.cartQuantity + quantity, inventoryItem.quantity);
      setCart(cart.map(c =>
        (c.id === item.id && c.selectedSize === size)
          ? { ...c, cartQuantity: newQuantity }
          : c
      ));
    } else {
      setCart([...cart, { ...item, selectedSize: size as any, cartQuantity: Math.min(quantity, inventoryItem.quantity) }]);
    }

    setIsCartOpen(true);

    trackMetaEvent('AddToCart', {
      content_ids: [item.id],
      content_name: item.name,
      content_category: item.category,
      value: item.price,
      currency: 'BDT',
      content_type: 'product'
    }, `atc_${item.id}_${Date.now()}`);
  };

  const handleBuyNow = (item: ClothingItem, size: string, quantity: number) => {
    handleAddToCart(item, size, quantity);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleRemoveFromCart = (id: string, size: string) => {
    setCart(prev => prev.filter(item => !(item.id === id && item.selectedSize === size)));
  };

  const handleUpdateCartQuantity = (id: string, size: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.selectedSize === size) {
        const product = items.find(i => i.id === id);
        const inv = product?.inventory.find(i => i.size === size);
        const max = inv?.quantity || 99;
        const newQty = Math.min(max, Math.max(1, item.cartQuantity + delta));
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
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
        ...(user ? { user_id: user.uid } : {}),
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          product_code: item.product_code,
          price: item.price,
          quantity: item.cartQuantity,
          size: item.selectedSize,
          image: item.image
        })),
        status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      let docRef;
      try {
        docRef = await addDoc(collection(db, 'orders'), orderData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
        throw error;
      }

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
          try {
            await updateDoc(productRef, {
              inventory: newInventory,
              updated_at: serverTimestamp()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `products/${item.id}`);
          }
        }
      }

      setOrderSuccess(true);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setSaveStatus({ type: 'success', message: 'Order placed successfully!' });

      // Meta Purchase tracking
      trackMetaEvent('Purchase', {
        content_ids: cart.map(i => i.id),
        value: finalTotal,
        currency: 'BDT',
        num_items: cart.reduce((s, i) => s + i.cartQuantity, 0),
        content_type: 'product'
      }, `pur_${Date.now()}`, checkoutForm);

      // Send Email Notification
      sendOrderEmail(fullOrder);

      setCheckoutForm({
        customer_name: '',
        phone: '',
        address: '',
        delivery_location: 'inside'
      });
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setSaveStatus({
        type: 'error',
        message: err.message?.includes('permission')
          ? 'Failed to place order: Security validation failed. Please check your details.'
          : 'Checkout failed. Please try again.'
      });
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

    if (!newItemForm.image) {
      setSaveStatus({ type: 'error', message: 'Main image is required. Please upload an image.' });
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

      try {
        if (editingItemId) {
          await updateDoc(doc(db, 'products', editingItemId), payload);
        } else {
          await addDoc(collection(db, 'products'), {
            ...payload,
            created_at: serverTimestamp()
          });
        }
      } catch (error) {
        handleFirestoreError(error, editingItemId ? OperationType.UPDATE : OperationType.CREATE, `products/${editingItemId || ''}`);
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
          inventory: []
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
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
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
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
      }
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
      handleFirestoreError(err, OperationType.UPDATE, `products/${item.id}`);
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
    <MainLayout
      navbarProps={{
        user,
        isAdmin,
        showAdminDashboard,
        cartCount: cart.reduce((s, i) => s + i.cartQuantity, 0),
        searchQuery,
        setSearchQuery,
        isDarkMode,
        setIsDarkMode,
        onOpenCart: () => setIsCartOpen(true),
        onOpenProfile: () => setIsProfileOpen(true),
        onOpenLogin: () => setShowLogin(true),
        onOpenAdmin: () => {
          if (location.pathname === '/admin') {
            navigate('/');
          } else {
            navigate('/admin');
          }
        },
        onLogout: handleLogout,
        onToggleMenu: () => setIsMenuOpen(!isMenuOpen),
        onGoHome: () => {
          setSelectedCategory('All');
          setSearchQuery('');
          setShowAdminDashboard(false);
          navigate('/');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
    >
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/admin" element={
            isAdmin ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="container mx-auto px-4"
              >
                <AdminDashboard
                  items={items}
                  orders={orders}
                  homepageSettings={homepageSettings}
                  onAddItem={() => {
                    setEditingItemId(null);
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
                      inventory: []
                    });
                    setIsAddingItem(true);
                  }}
                  onEditItem={startEditing}
                  onDeleteItem={handleDeleteItem}
                  onUpdateOrderStatus={updateOrderStatus}
                  onDeleteOrder={handleDeleteOrder}
                  onUpdateHomepage={async (settings) => {
                    try {
                      await setDoc(doc(db, 'settings', 'homepage'), settings);
                    } catch (err) {
                      console.error('Failed to update settings:', err);
                    }
                  }}
                  onExportInventory={exportInventoryExcel}
                  onExportOrders={exportOrdersExcel}
                  onMoveProduct={moveProduct}
                  onBulkDeleteProducts={handleBulkDeleteProducts}
                  selectedProductIds={selectedProductIds}
                  setSelectedProductIds={setSelectedProductIds}
                  selectedOrderIds={selectedOrderIds}
                  setSelectedOrderIds={setSelectedOrderIds}
                  onBulkDeleteOrders={handleBulkDeleteOrders}
                  sequentialItems={sequentialItems}
                  isBulkDeleting={isBulkDeleting}
                />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh]">
                <Lock className="w-12 h-12 text-neutral-300 mb-4" />
                <h2 className="text-xl font-bold">Admin Only</h2>
                <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
              </div>
            )
          } />

          <Route path="/product/:productId" element={<ProductViewWrapper 
            items={items} 
            handleAddToCart={handleAddToCart} 
            handleBuyNow={handleBuyNow}
            activeImageIdx={activeImageIdx}
            setActiveImageIdx={setActiveImageIdx}
          />} />

          <Route path="/category/:category" element={
            <motion.div
              key="category"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="container mx-auto px-4"
            >
              <Collection
                items={items}
                filteredItems={filteredItems}
                highlightItems={highlightItems}
                currentHighlightIdx={currentHighlightIdx}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                priceFilter={priceFilter}
                setPriceFilter={setPriceFilter}
                stockFilter={stockFilter}
                setStockFilter={setStockFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                onProductClick={(item) => {
                  goToProduct(item);
                  setActiveImageIdx(0);
                }}
                onAddToCart={handleAddToCart}
              />
            </motion.div>
          } />

          <Route path="/" element={
            <motion.div
              key="shop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="container mx-auto px-4"
            >
               <Collection
                 items={items}
                 filteredItems={filteredItems}
                 highlightItems={highlightItems}
                 currentHighlightIdx={currentHighlightIdx}
                 selectedCategory={selectedCategory}
                 setSelectedCategory={setSelectedCategory}
                 searchQuery={searchQuery}
                 setSearchQuery={setSearchQuery}
                 priceFilter={priceFilter}
                 setPriceFilter={setPriceFilter}
                 stockFilter={stockFilter}
                 setStockFilter={setStockFilter}
                 sortBy={sortBy}
                 setSortBy={setSortBy}
                 onProductClick={(item) => {
                   goToProduct(item);
                   setActiveImageIdx(0);
                 }}
                 onAddToCart={handleAddToCart}
               />
            </motion.div>
          } />
        </Routes>
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-100 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-101 h-full w-full max-w-[280px] bg-white dark:bg-neutral-900 shadow-2xl p-6"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-white dark:text-neutral-900" />
                    </div>
                    <span className="font-bold">LIZ LIFESTYLE</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {isAdmin && (
                    <Button 
                      variant={showAdminDashboard ? "default" : "outline"}
                      className="w-full justify-start gap-3 h-12 rounded-xl mb-4"
                      onClick={() => {
                        setShowAdminDashboard(!showAdminDashboard);
                        setIsMenuOpen(false);
                      }}
                    >
                      <Lock className="w-4 h-4" />
                      {showAdminDashboard ? 'Back to Shop' : 'Admin Control'}
                    </Button>
                  )}
                  
                  <div className="py-4">
                    <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Navigation</p>
                    
                    <div className="mb-6">
                      <button 
                        onClick={() => {
                          goToCategory('3 pieces');
                          setIsMenuOpen(false);
                        }}
                        className="px-2 py-2 mb-2 w-full text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors"
                      >
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-900 dark:text-white">3 pieces</span>
                      </button>
                      <div className="space-y-1">
                        {['COCO', 'ZAMZAM', 'Party dress'].map(sub => (
                          <button
                            key={sub}
                            onClick={() => {
                              goToCategory(sub);
                              setIsMenuOpen(false);
                            }}
                            className={`w-full text-left py-2 px-4 rounded-xl text-xs font-bold transition-all ${selectedCategory === sub ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg shadow-neutral-900/10' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4 mt-8">More Collections</p>
                    {allCategories.filter(c => {
                      const lower = c.toLowerCase();
                      return !['coco', 'zamzam', 'party dress', 'all', '3 pieces'].includes(lower);
                    }).map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          goToCategory(cat);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-colors ${selectedCategory === cat ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
                      >
                        {cat}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => {
                        goToCategory('All');
                        setIsMenuOpen(false);
                      }}
                      className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold mt-4 transition-colors ${selectedCategory === 'All' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
                    >
                      View All Creations
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-8 border-t dark:border-neutral-800">
                  <div className="flex items-center gap-4 mb-6">
                    <Button variant="outline" size="icon" className="rounded-full w-10 h-10" onClick={() => setIsDarkMode(!isDarkMode)}>
                      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>
                    <span className="text-xs font-medium text-neutral-500">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  {user ? (
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-red-500 px-2" onClick={handleLogout}>
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  ) : (
                    <Button className="w-full h-12 rounded-xl bg-neutral-900 text-white" onClick={() => setShowLogin(true)}>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
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
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
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
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
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
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
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

      {/* Login / Auth Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowLogin(false);
                setLoginError('');
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-8 shadow-2xl overflow-hidden"
            >
              {/* Decorative Background */}
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-50 dark:bg-emerald-950/20 blur-3xl opacity-50" />

              <div className="relative">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-xl">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-foreground">
                    {authMode === 'login' ? 'Welcome Back' : 'Join Liz Lifestyle'}
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500">
                    {authMode === 'login'
                      ? 'Sign in to access your orders and profile'
                      : 'Create an account to start your journey with us'}
                  </p>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Full Name</label>
                      <div className="relative">
                        <Input
                          placeholder="Your Name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none pl-4 pr-4"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-4 w-4 text-neutral-400" />
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none pl-12 pr-4"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-4 w-4 text-neutral-400" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none pl-12 pr-4"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <p className="text-xs font-bold text-red-500 text-center animate-pulse">
                      {loginError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95"
                  >
                    {isAuthLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      authMode === 'login' ? 'Sign In' : 'Create Account'
                    )}
                  </Button>
                </form>

                <div className="mt-8 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-100 dark:border-neutral-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-neutral-900 px-4 text-neutral-400 font-bold tracking-tighter">Or continue with</span>
                  </div>
                </div>

                <div className="mt-8">
                  <Button
                    onClick={handleGoogleLogin}
                    variant="outline"
                    className="w-full border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="h-5 w-5" referrerPolicy="no-referrer" />
                    Google Account
                  </Button>
                </div>

                <div className="mt-8 text-center">
                  <button
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'signup' : 'login');
                      setLoginError('');
                    }}
                    className="text-xs font-bold text-neutral-400 hover:text-emerald-600 transition-colors"
                  >
                    {authMode === 'login'
                      ? 'No account? Join the lifestyle here'
                      : 'Already a member? Sign in here'}
                  </button>
                </div>
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
                          <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
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
                    onClick={() => {
                      setIsCheckoutOpen(true);
                      trackMetaEvent('InitiateCheckout', {
                        content_ids: cart.map(i => i.id),
                        value: finalTotal,
                        currency: 'BDT',
                        num_items: cart.reduce((s, i) => s + i.cartQuantity, 0),
                        content_type: 'product'
                      }, `ic_${Date.now()}`);
                    }}
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
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-12">
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
              className="absolute right-6 top-6 z-110 text-white hover:bg-white/20"
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
                  whileHover={{ scale: 1.2 }}
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

      {/* Account / Order History Sidebar */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-61 h-full w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl flex flex-col"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between border-b dark:border-neutral-800 p-6 shrink-0">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-bold">My Account</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsProfileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto bg-neutral-50/30 dark:bg-neutral-900/40">
                <div className="p-6 space-y-10">
                  {/* Account Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm transition-transform hover:scale-[1.02]">
                      <p className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] mb-2">Total Orders</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-600">{userOrders.length}</span>
                        <span className="text-[10px] font-black text-neutral-300 uppercase tracking-tighter">{userOrders.length === 1 ? 'Order' : 'Orders'}</span>
                      </div>
                    </div>
                    <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm transition-transform hover:scale-[1.02]">
                      <p className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] mb-2">Total Spent</p>
                      <p className="text-2xl font-black tracking-tighter dark:text-white">TK {userOrders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Order History Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Order History</h4>
                      <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800 mx-4" />
                      <Badge variant="outline" className="text-[10px] font-black border-neutral-200 text-neutral-400">TRACKING</Badge>
                    </div>

                    {userOrders.length === 0 ? (
                      <div className="text-center py-20 px-8 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] shadow-inner">
                        <Package className="h-12 w-12 text-neutral-100 dark:text-neutral-800 mx-auto mb-4" />
                        <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-6">No purchase history</p>
                        <Button
                          variant="outline"
                          className="rounded-full border-emerald-100 text-emerald-600 hover:bg-emerald-50 text-[10px] font-black uppercase tracking-widest h-10 px-6"
                          onClick={() => {
                            setIsProfileOpen(false);
                            goToCategory('All');
                          }}
                        >
                          Discover Clothing
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {userOrders.map((order, orderIdx) => (
                          <motion.div
                            key={`${order.id}-${orderIdx}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: orderIdx * 0.1 }}
                            className="group p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-xl transition-all relative overflow-hidden"
                          >
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-6">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                                    #{order.id.slice(-8).toUpperCase()}
                                  </span>
                                  <Badge
                                    className={`text-[9px] uppercase font-black px-2.5 py-0.5 border-none tracking-widest ${order.status === 'delivered' ? 'bg-emerald-500 text-white' :
                                        order.status === 'processing' ? 'bg-blue-500 text-white' :
                                          'bg-amber-400 text-white'
                                      }`}
                                  >
                                    {order.status}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-neutral-400 font-black uppercase tracking-tighter pl-1">
                                  Ordered: {(() => {
                                    try {
                                      const date = (order.created_at as any)?.toDate ? (order.created_at as any).toDate() :
                                        order.created_at ? new Date(order.created_at) : new Date();
                                      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
                                    } catch (e) {
                                      return 'Recent Purchase';
                                    }
                                  })()}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 group/btn transition-all active:scale-90"
                                onClick={() => generateInvoicePDF(order)}
                                title="Download Invoice"
                              >
                                <FileText className="h-5 w-5 text-emerald-600 transition-transform group-hover/btn:scale-110" />
                              </Button>
                            </div>

                            {/* Card Content: Items */}
                            {order.items && order.items.length > 0 && (
                              <div className="space-y-4 mb-8">
                                {order.items.map((item, itemIdx) => (
                                  <div key={`${order.id}-item-${itemIdx}`} className="flex gap-5 items-center group/item transition-transform hover:translate-x-1">
                                    <div className="h-20 w-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border dark:border-neutral-700 shadow-sm">
                                      <img src={item.image || 'https://placehold.co/400x500?text=Dress'} alt={item.name} className="h-full w-full object-cover transition-transform group-hover/item:scale-110" referrerPolicy="no-referrer" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="space-y-0.5">
                                          <p className="text-sm font-black truncate text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">{item.name || 'LIZ Dress'}</p>
                                          {item.product_code && <p className="text-[9px] font-mono font-bold text-neutral-400">CODE: {item.product_code}</p>}
                                        </div>
                                        <p className="text-sm font-mono font-black text-emerald-600">TK {Number(item.price || 0).toLocaleString()}</p>
                                      </div>
                                      <div className="flex gap-3">
                                        <span className="text-[9px] font-black uppercase text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2.5 py-1 rounded-lg tracking-tighter border dark:border-white/10">Size: {item.size || 'N/A'}</span>
                                        <span className="text-[9px] font-black uppercase text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2.5 py-1 rounded-lg tracking-tighter border dark:border-white/10">Qty: {item.quantity || 1}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Card Content: Logistics */}
                            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-800 mb-8 space-y-5">
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <UserIcon className="h-3 w-3" /> Recipient
                                  </p>
                                  <p className="text-[11px] font-black dark:text-white truncate">{order.customer_name || 'Customer'}</p>
                                  <p className="text-[10px] font-mono font-black text-emerald-600">{order.phone || '01XXXXXXXXX'}</p>
                                </div>
                                <div className="space-y-1.5 text-right">
                                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest flex items-center justify-end gap-1.5">
                                    Delivery <Truck className="h-3 w-3" />
                                  </p>
                                  <p className="text-[10px] font-bold dark:text-neutral-300 capitalize">{order.delivery_location || 'Inside Dhaka'}</p>
                                  <p className="text-[10px] font-mono font-black text-neutral-500">Charge: TK {Number(order.delivery_charge || 0).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="pt-4 border-t border-neutral-200/50 dark:border-neutral-700/50">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2">Shipping Destination</p>
                                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 leading-relaxed italic pr-4">
                                  "{order.address || 'Standard Address'}"
                                </p>
                              </div>
                            </div>

                            {/* Card Footer: Billing & CTA */}
                            <div className="flex items-end justify-between pt-6 border-t border-dotted dark:border-neutral-800">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Final Amount</p>
                                <p className="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none">
                                  TK {Number(order.total_amount || 0).toLocaleString()}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                className="rounded-2xl border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white h-11 px-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm transition-all hover:shadow-emerald-100 dark:hover:shadow-none hover:scale-105 active:scale-95"
                                onClick={() => {
                                  if (order.items) {
                                    setCart(order.items.map(i => ({
                                      id: i.id || '',
                                      name: i.name,
                                      category: i.name,
                                      price: i.price,
                                      image: i.image,
                                      cartQuantity: i.quantity,
                                      selectedSize: i.size,
                                      description: '',
                                      inventory: [],
                                      product_code: i.product_code || ''
                                    })));
                                    setIsCartOpen(true);
                                    setIsProfileOpen(false);
                                    setSaveStatus({ type: 'info', message: 'Items added from your past order!' });
                                  }
                                }}
                              >
                                Buy Again
                              </Button>
                            </div>

                            {/* Decorative Background Accent */}
                            <div className="absolute -right-8 -bottom-8 h-32 w-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Profile Settings Section */}
                  <div className="space-y-6 pt-10 border-t dark:border-neutral-800 pb-12">
                    <div className="flex items-center gap-3 px-1">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Account Details</h4>
                    </div>

                    <div className="space-y-6 bg-white dark:bg-neutral-900 p-8 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Contact Phone</label>
                        <Input
                          placeholder="01XXXXXXXXX"
                          defaultValue={userProfile?.phone || ''}
                          onBlur={(e) => updateProfile({ phone: e.target.value })}
                          className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border-none px-5 font-mono font-black placeholder:text-neutral-300"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Shipping Address</label>
                        <textarea
                          placeholder="Area, Road, House No..."
                          defaultValue={userProfile?.address || ''}
                          onBlur={(e) => updateProfile({ address: e.target.value })}
                          className="flex min-h-[120px] w-full rounded-2xl border-none bg-neutral-50 dark:bg-neutral-800/50 px-5 py-4 text-sm font-bold text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all resize-none shadow-inner"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-1 text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        <p className="text-[9px] font-black uppercase tracking-widest leading-none">Status: Connected & Secured</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="p-6 border-t dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
                <Button
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95"
                  onClick={() => {
                    handleLogout();
                    setIsProfileOpen(false);
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
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
                      className={`flex items-center justify-between rounded-xl border p-4 transition-all ${checkoutForm.delivery_location === 'inside'
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
                      className={`flex items-center justify-between rounded-xl border p-4 transition-all ${checkoutForm.delivery_location === 'outside'
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
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4">
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
    </MainLayout>
  );
}
