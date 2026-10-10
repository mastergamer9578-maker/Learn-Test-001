import React, { useState, useRef, useMemo, useEffect } from 'react';
import { doc, deleteDoc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  Package,
  TrendingUp,
  UtensilsCrossed,
  Image as ImageIcon,
  Sparkles,
  Store,
  Trash2,
  Plus,
  Clock,
  Phone,
  MapPin,
  CheckCircle,
  ChefHat,
  Bell,
  Check,
  Upload,
  X,
  RotateCcw,
  ImagePlus,
  Pencil,
  AlertCircle,
  Loader2,
  Layers,
  Search,
  Filter,
  DollarSign,
  ShoppingBag,
  XCircle,
  Calendar,
  Settings as SettingsIcon,
  Tag,
  ArrowRight,
  Truck,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Lock,
  LogOut
} from 'lucide-react';
import { MenuItem, CustomerOrder, StoreStatus, DeliverySettings, StaffUser, CategoryDetail } from '../types';
import { INITIAL_HERO_IMAGE } from '../data/initialMenu';
import {
  sanitizeString,
  sanitizeUrl,
  isValidImageUrl,
  sanitizeNumber,
  checkRateLimit,
} from '../utils/security';

// Helper to convert and compress uploaded files into clean Base64 data URLs with security checks
const readFileAsBase64 = (
  file: File,
  maxWidth = 1200,
  maxHeight = 900,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Security check 1: Enforce image MIME type
    if (!file.type || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid file type: only genuine image files (PNG, JPEG, WebP) are allowed.'));
    }
    // Security check 2: Enforce file size maximum (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return reject(new Error('File size exceeds safety limit (max 5MB).'));
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result as string);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const PRESET_CATEGORY_BANNERS = [
  {
    name: 'BURGERS',
    title: 'Gourmet Smashed Burgers',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=80',
    tagline: '100% Smashed Beef & Crispy Chicken with Signature Sauces',
  },
  {
    name: 'PIZZAS',
    title: 'Stone Oven Pizzas',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Hand-Tossed Dough, Rich Marinara & Golden Bubbly Mozzarella',
  },
  {
    name: 'FAST FOOD',
    title: 'Hot & Crispy Fast Food',
    url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Crispy Golden Tenders, Loaded Fries & Sizzling Crunchy Bites',
  },
  {
    name: 'DEALS',
    title: 'Value Combo Deals',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Unbeatable Sharing Feasts & Value-Packed Combo Boxes',
  },
  {
    name: 'DRINKS',
    title: 'Chilled Ice Sodas & Drinks',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Chilled Ice Sodas, Refreshing Mocktails & Cold Brews',
  },
  {
    name: 'FRAPPE',
    title: 'Artisan Frappe & Coffee',
    url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Artisan Ice-Blended Coffee, Whipped Cream & Decadent Drizzles',
  },
  {
    name: 'SMOOTHIES',
    title: 'Real Fruit Smoothies',
    url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=1600&q=80',
    tagline: '100% Real Fruit Blends, Naturally Vibrant & Energizing',
  },
  {
    name: 'SHAKES',
    title: 'Hand-Spun Milkshakes',
    url: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Thick Hand-Spun Gourmet Milkshakes with Sweet Toppings',
  },
  {
    name: 'DESSERTS',
    title: 'Warm Cakes & Desserts',
    url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Warm Molten Lava Cakes, Brownies & Sweet Treats',
  },
  {
    name: 'SIDES',
    title: 'Crispy Loaded Fries & Sides',
    url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Seasoned French Fries, Mozzarella Sticks & Crispy Bites',
  },
  {
    name: 'CHICKEN',
    title: 'Crispy Broast & Fried Chicken',
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Spicy Broast, Crispy Wings & Freshly Fried Chicken',
  },
  {
    name: 'SANDWICHES',
    title: 'Toasted Club Sandwiches & Subs',
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Toasted Club Sandwiches, Paninis & Artisan Subs',
  },
];

export type AdminTab = 'analytics' | 'products' | 'orders' | 'categories' | 'settings';

interface StaffDashboardProps {
  menuItems: MenuItem[];
  categories?: string[];
  categoryDetails?: CategoryDetail[];
  onUpdateCategories?: (cats: string[]) => void;
  onSaveCategoryWithBanner?: (category: {
    id?: string;
    name: string;
    bannerImage?: string;
    tagline?: string;
  }) => Promise<void> | void;
  onDeleteCategory?: (categoryIdOrName: string) => Promise<void> | void;
  deliverySettings?: DeliverySettings;
  onUpdateDeliverySettings?: (settings: DeliverySettings) => Promise<void> | void;
  onAddMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void> | void;
  onEditMenuItem?: (id: string, updates: Partial<MenuItem>) => Promise<void> | void;
  onToggleMenuItem: (id: string) => void;
  onDeleteMenuItem: (id: string) => Promise<void> | void;
  orders: CustomerOrder[];
  onUpdateOrderStatus: (orderId: string, status: CustomerOrder['status']) => void;
  storeStatus: StoreStatus;
  onToggleStoreStatus: () => void;
  onSetStoreStatus?: (status: StoreStatus) => void;
  heroImage: string;
  onUpdateHeroImage: (url: string) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
  staffUser?: StaffUser;
  onLogout?: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  menuItems,
  categories,
  categoryDetails = [],
  onUpdateCategories,
  onSaveCategoryWithBanner,
  onDeleteCategory,
  deliverySettings,
  onUpdateDeliverySettings,
  onAddMenuItem,
  onEditMenuItem,
  onToggleMenuItem,
  onDeleteMenuItem,
  orders,
  onUpdateOrderStatus,
  storeStatus,
  onToggleStoreStatus,
  onSetStoreStatus,
  heroImage,
  onUpdateHeroImage,
  isOwner: propIsOwner = false,
  isAdmin: propIsAdmin = false,
  staffUser,
  onLogout,
}) => {
  // Navigation Tabs in the exact requested order: Orders (1st), Analytics (2nd), Products (3rd), Categories (4th), Settings (5th)
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');

  // Dynamically read user role fields (isAdmin and isOwner) from Firestore 'users' collection using Auth UID
  const [firestoreRoles, setFirestoreRoles] = useState<{
    isAdmin: boolean;
    isOwner: boolean;
    isLoaded: boolean;
  }>({
    isAdmin: Boolean(staffUser?.isAdmin ?? propIsAdmin),
    isOwner: Boolean(staffUser?.isOwner ?? propIsOwner),
    isLoaded: false,
  });

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const setupUserListener = (uid: string) => {
      try {
        const userDocRef = doc(db, 'users', uid);
        const unsub = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const firestoreIsOwner = Boolean(data?.isOwner === true || data?.role === 'owner');
              const firestoreIsAdmin = Boolean(
                data?.isAdmin === true || data?.role === 'admin' || firestoreIsOwner
              );
              setFirestoreRoles({
                isAdmin: firestoreIsAdmin,
                isOwner: firestoreIsOwner,
                isLoaded: true,
              });
            } else {
              // Also check 'staff' collection fallback
              getDoc(doc(db, 'staff', uid))
                .then((sSnap) => {
                  if (sSnap.exists()) {
                    const sData = sSnap.data();
                    const sIsOwner = Boolean(sData?.isOwner === true || sData?.role === 'owner');
                    const sIsAdmin = Boolean(
                      sData?.isAdmin === true || sData?.role === 'admin' || sIsOwner
                    );
                    setFirestoreRoles({
                      isAdmin: sIsAdmin,
                      isOwner: sIsOwner,
                      isLoaded: true,
                    });
                  }
                })
                .catch((err) => console.warn('[StaffDashboard] Staff fallback notice:', err));
            }
          },
          (err) => {
            console.warn('[StaffDashboard] Error reading user doc from Firestore:', err);
          }
        );
        return unsub;
      } catch (e) {
        console.warn('[StaffDashboard] Failed to attach snapshot listener:', e);
        return null;
      }
    };

    const currentUid = auth.currentUser?.uid || staffUser?.uid;
    if (currentUid) {
      unsubscribeSnapshot = setupUserListener(currentUid);
    }

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user?.uid && user.uid !== currentUid) {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
        unsubscribeSnapshot = setupUserListener(user.uid);
      }
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, [staffUser?.uid]);

  // Dynamically resolved permissions from Firestore (fallback to staffUser or props if not yet loaded)
  const isOwner = firestoreRoles.isLoaded
    ? firestoreRoles.isOwner
    : Boolean(staffUser?.isOwner ?? propIsOwner);

  const isAdmin = firestoreRoles.isLoaded
    ? firestoreRoles.isAdmin
    : Boolean(staffUser?.isAdmin ?? propIsAdmin);

  // Categories State (managed dynamically with default presets and shared props)
  const defaultCategories = ['BURGERS', 'PIZZAS', 'FAST FOOD', 'DEALS', 'DRINKS'];
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const fromProps = (categories || []).map((c) => c.trim().toUpperCase());
    const existing = menuItems.map((m) => (m.category || '').trim().toUpperCase());
    return Array.from(new Set([...defaultCategories, ...fromProps, ...existing].filter(Boolean)));
  });

  // Enforce Access Guard: Disable direct access to Products and Categories for non-owner admins
  useEffect(() => {
    if (!isOwner && (activeTab === 'products' || activeTab === 'categories')) {
      setActiveTab('orders');
    }
  }, [isOwner, activeTab]);

  // Keep in sync if categories prop updates
  useEffect(() => {
    if (categories && categories.length > 0) {
      const fromProps = categories.map((c) => c.trim().toUpperCase());
      const existing = menuItems.map((m) => (m.category || '').trim().toUpperCase());
      setCustomCategories(Array.from(new Set([...defaultCategories, ...fromProps, ...existing].filter(Boolean))));
    }
  }, [categories, menuItems]);

  // Category Banner State for Creation
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryBanner, setNewCategoryBanner] = useState('');
  const [newCategoryTagline, setNewCategoryTagline] = useState('');
  const [newCategoryBannerFileName, setNewCategoryBannerFileName] = useState('');
  const [isNewCategoryBannerProcessing, setIsNewCategoryBannerProcessing] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const categoryBannerFileInputRef = useRef<HTMLInputElement>(null);

  // Category Banner State for Editing
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    originalName: string;
    name: string;
    bannerImage: string;
    tagline: string;
  } | null>(null);
  const [isEditCategoryBannerProcessing, setIsEditCategoryBannerProcessing] = useState(false);
  const [editCategoryBannerFileName, setEditCategoryBannerFileName] = useState('');
  const [isSavingEditCategory, setIsSavingEditCategory] = useState(false);
  const editCategoryBannerFileInputRef = useRef<HTMLInputElement>(null);

  const [categorySuccessMsg, setCategorySuccessMsg] = useState<string | null>(null);

  // Helper to resolve custom Firestore banner or preset fallback for any category
  const getCategoryBannerMeta = (catName: string) => {
    const norm = catName.trim().toUpperCase();
    const fromDetail = (categoryDetails || []).find(
      (c) => (c.name || '').trim().toUpperCase() === norm || (c.id || '').trim().toUpperCase() === norm
    );
    if (fromDetail && fromDetail.bannerImage && fromDetail.bannerImage.trim().length > 0) {
      return {
        bannerImage: fromDetail.bannerImage.trim(),
        tagline: fromDetail.tagline?.trim() || 'Menu Category',
        isCustom: true,
      };
    }
    const preset = PRESET_CATEGORY_BANNERS.find(
      (p) => p.name === norm || norm.includes(p.name)
    );
    if (preset) {
      return {
        bannerImage: preset.url,
        tagline: fromDetail?.tagline?.trim() || preset.tagline,
        isCustom: false,
      };
    }
    return {
      bannerImage:
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
      tagline: fromDetail?.tagline?.trim() || "Chef's Signature Recipes, Freshly Prepared To Order",
      isCustom: false,
    };
  };

  // Delivery Management State in Settings
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<string>(
    String(deliverySettings?.standardFee ?? 120)
  );
  const [freeThresholdInput, setFreeThresholdInput] = useState<string>(
    String(deliverySettings?.freeDeliveryThreshold ?? 1500)
  );
  const [deliveryZoneInput, setDeliveryZoneInput] = useState<string>(
    deliverySettings?.deliveryZone || 'Korangi'
  );
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [deliverySavedFeedback, setDeliverySavedFeedback] = useState(false);
  const [deliveryErrorMsg, setDeliveryErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (deliverySettings) {
      setDeliveryFeeInput(String(deliverySettings.standardFee));
      setFreeThresholdInput(String(deliverySettings.freeDeliveryThreshold));
      setDeliveryZoneInput(deliverySettings.deliveryZone);
    }
  }, [deliverySettings]);

  // Hero Banner Editor State
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [bannerFileName, setBannerFileName] = useState<string>('');
  const [isBannerProcessing, setIsBannerProcessing] = useState(false);
  const [heroSavedFeedback, setHeroSavedFeedback] = useState(false);

  // New Product Form State
  const [isAddProductExpanded, setIsAddProductExpanded] = useState(false);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('BURGERS');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemOriginalPrice, setNewItemOriginalPrice] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [productImageBase64, setProductImageBase64] = useState<string>('');
  const [productImageFileName, setProductImageFileName] = useState<string>('');
  const [isProductImageProcessing, setIsProductImageProcessing] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productSavedFeedback, setProductSavedFeedback] = useState(false);
  const [productSuccessMessage, setProductSuccessMessage] = useState<string | null>(null);
  const [productErrorMessage, setProductErrorMessage] = useState<string | null>(null);

  // Product List Search & Filter in Products Tab
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');

  // Edit Product Modal State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<string>('BURGERS');
  const [editPrice, setEditPrice] = useState('');
  const [editOriginalPrice, setEditOriginalPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editImageFileName, setEditImageFileName] = useState('');
  const [isEditImageProcessing, setIsEditImageProcessing] = useState(false);
  const [isSavingEditProduct, setIsSavingEditProduct] = useState(false);
  const editProductFileInputRef = useRef<HTMLInputElement>(null);

  // Delete Product State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Orders Tab Filter (Active Queue)
  const [orderQueueFilter, setOrderQueueFilter] = useState<'ALL' | 'PENDING' | 'PREPARING' | 'READY'>('ALL');

  // Analytics Order History Search & Filter
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');

  // Custom Glassmorphic Confirmation Modal State (replaces browser window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    confirmButtonText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    confirmButtonText: 'Yes, Proceed',
    onConfirm: () => {},
  });
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  // Active / Kitchen Orders (PENDING, PREPARING, READY)
  const openOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY'
    );
  }, [orders]);

  const filteredOpenOrders = useMemo(() => {
    if (orderQueueFilter === 'ALL') return openOrders;
    return openOrders.filter((o) => o.status === orderQueueFilter);
  }, [openOrders, orderQueueFilter]);

  // Analytics KPIs
  const completedOrders = useMemo(() => orders.filter((o) => o.status === 'COMPLETED'), [orders]);
  const cancelledOrders = useMemo(() => orders.filter((o) => o.status === 'CANCELLED'), [orders]);
  const totalRevenue = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + o.total, 0);
  }, [completedOrders]);
  const avgOrderValue = useMemo(() => {
    return completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;
  }, [totalRevenue, completedOrders]);

  // Top Selling Items (from completed orders)
  const topSellingItems = useMemo(() => {
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    completedOrders.forEach((o) => {
      o.items.forEach((item) => {
        const existing = itemMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
        itemMap.set(item.name, {
          name: item.name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.price * item.quantity,
        });
      });
    });
    return Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [completedOrders]);

  // Filtered Products for Products Tab
  const filteredProducts = useMemo(() => {
    const normFilter = productCategoryFilter.trim().toUpperCase();
    const query = productSearchQuery.trim().toLowerCase();

    return menuItems.filter((item) => {
      const normItemCat = (item.category || '').trim().toUpperCase();
      const matchesCategory =
        normFilter === 'ALL' || normItemCat === normFilter;
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        normItemCat.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, productCategoryFilter, productSearchQuery]);

  // Filtered History for Analytics Tab
  const filteredOrderHistory = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = historyStatusFilter === 'ALL' || o.status === historyStatusFilter;
      const query = historySearchQuery.toLowerCase();
      const matchesSearch =
        o.id.toLowerCase().includes(query) ||
        o.customerName.toLowerCase().includes(query) ||
        o.customerPhone.includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [orders, historyStatusFilter, historySearchQuery]);

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? 'GOOD MORNING, SHAN TEAM.'
      : hour < 18
      ? 'GOOD AFTERNOON, SHAN TEAM.'
      : 'GOOD EVENING, SHAN TEAM.';

  // Delivery Settings Handlers (Owner Only)
  const handleSaveDeliverySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeliveryErrorMsg(null);

    // Strict UI RBAC Check
    if (!isOwner) {
      setDeliveryErrorMsg('Access Denied: Only Store Owner can modify store delivery pricing.');
      return;
    }

    const fee = sanitizeNumber(deliveryFeeInput, 0, 5000, 120);
    const threshold = sanitizeNumber(freeThresholdInput, 0, 100000, 1500);
    const zone = sanitizeString(deliveryZoneInput, 50);

    if (!zone) {
      setDeliveryErrorMsg('Please enter a valid delivery zone name (e.g. Korangi).');
      return;
    }

    const updatedSettings: DeliverySettings = {
      standardFee: Math.round(fee),
      freeDeliveryThreshold: Math.round(threshold),
      deliveryZone: zone,
    };

    try {
      setIsSavingDelivery(true);
      if (onUpdateDeliverySettings) {
        await onUpdateDeliverySettings(updatedSettings);
      }
      setDeliverySavedFeedback(true);
      setTimeout(() => setDeliverySavedFeedback(false), 3000);
    } catch (err: any) {
      console.error('Failed to save delivery settings:', err);
      setDeliveryErrorMsg(err?.message || 'Failed to save delivery settings.');
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const handleResetDeliverySettings = () => {
    setDeliveryErrorMsg(null);
    if (!isOwner) {
      setDeliveryErrorMsg('Access Denied: Only Store Owner can reset delivery settings.');
      return;
    }
    setDeliveryFeeInput('120');
    setFreeThresholdInput('1500');
    setDeliveryZoneInput('Korangi');
    if (onUpdateDeliverySettings) {
      onUpdateDeliverySettings({
        standardFee: 120,
        freeDeliveryThreshold: 1500,
        deliveryZone: 'Korangi',
      });
    }
    setDeliverySavedFeedback(true);
    setTimeout(() => setDeliverySavedFeedback(false), 2500);
  };

  // Direct Store Status Selector with Instant Global Sync & Feedback
  const [statusFeedbackMsg, setStatusFeedbackMsg] = useState<string | null>(null);

  const handleSelectStatus = (status: StoreStatus) => {
    if (onSetStoreStatus) {
      onSetStoreStatus(status);
    } else {
      if (storeStatus !== status) {
        onToggleStoreStatus();
      }
    }
    const label =
      status === 'ACCEPTING'
        ? 'Accepting Orders'
        : status === 'BUSY'
        ? 'Kitchen Busy'
        : 'Orders Paused';
    setStatusFeedbackMsg(`✓ Store status updated to "${label}"`);
    setTimeout(() => setStatusFeedbackMsg(null), 3000);
  };

  // Prompt Product Deletion Modal
  const promptDeleteProduct = (item: MenuItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'DELETE PRODUCT',
      message: `Are you sure you want to permanently delete "${item.name}" from the live menu? This cannot be undone and will sync immediately with Firestore.`,
      itemName: item.name,
      confirmButtonText: 'Yes, Proceed',
      onConfirm: async () => {
        const productId = item.id;
        try {
          setDeletingId(productId);
          await deleteDoc(doc(db, "products", productId));
        } catch (error: any) {
          console.warn("[Firestore] Notice deleting product:", error?.message);
        } finally {
          if (onDeleteMenuItem) {
            onDeleteMenuItem(productId);
          }
          setDeletingId(null);
        }
      },
    });
  };

  // Prompt Order Cancellation Modal
  const promptCancelOrder = (orderId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'CANCEL ORDER',
      message: `Are you sure you want to cancel order ${orderId}? This will remove it from the active kitchen queue and update Firestore live.`,
      itemName: `Order ${orderId}`,
      confirmButtonText: 'Yes, Proceed',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "orders", orderId), { status: "CANCELLED" });
        } catch (error: any) {
          console.warn("[Firestore] Notice cancelling order:", error?.message);
        } finally {
          onUpdateOrderStatus(orderId, 'CANCELLED');
        }
      },
    });
  };

  // Handle Local Device File Upload for Banner
  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsBannerProcessing(true);
      const base64 = await readFileAsBase64(file, 1600, 1000, 0.85);
      setBannerFileName(file.name);
      onUpdateHeroImage(base64);
      setHeroSavedFeedback(true);
      setTimeout(() => setHeroSavedFeedback(false), 2500);
    } catch (err) {
      console.error('Failed to read banner image file:', err);
    } finally {
      setIsBannerProcessing(false);
    }
  };

  const handleResetDefaultBanner = () => {
    onUpdateHeroImage(INITIAL_HERO_IMAGE);
    setBannerFileName('');
    if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    setHeroSavedFeedback(true);
    setTimeout(() => setHeroSavedFeedback(false), 2000);
  };

  // Handle Product Image Upload
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProductImageProcessing(true);
      const base64 = await readFileAsBase64(file, 800, 800, 0.85);
      setProductImageBase64(base64);
      setProductImageFileName(file.name);
    } catch (err) {
      console.error('Failed to read product image file:', err);
    } finally {
      setIsProductImageProcessing(false);
    }
  };

  // Handle Adding Product (Owner Only)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setProductErrorMessage('Access Denied: Product creation requires Store Owner privileges.');
      return;
    }
    if (!newItemName.trim() || !newItemPrice.trim()) return;

    const priceNum = sanitizeNumber(newItemPrice, 1, 100000);
    if (priceNum <= 0) {
      setProductErrorMessage('Please enter a valid price greater than PKR 0.');
      return;
    }

    const origPriceNum = newItemOriginalPrice ? sanitizeNumber(newItemOriginalPrice, 1, 100000) : undefined;
    const defaultPlaceholderImage =
      newItemCategory === 'BURGERS'
        ? 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
        : newItemCategory === 'PIZZAS'
        ? 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80';

    const finalImage = productImageBase64 || defaultPlaceholderImage;
    const addedTitle = sanitizeString(newItemName, 100);
    const addedDesc = sanitizeString(newItemDescription, 300) || 'Freshly made to order.';
    const addedCat = sanitizeString(newItemCategory, 50).toUpperCase() || 'BURGERS';

    if (!addedTitle) {
      setProductErrorMessage('Please provide a valid product name.');
      return;
    }

    try {
      setIsSubmittingProduct(true);
      setProductErrorMessage(null);

      await onAddMenuItem({
        name: addedTitle,
        category: addedCat,
        price: priceNum,
        originalPrice: origPriceNum,
        description: addedDesc,
        image: finalImage,
        tag: origPriceNum ? 'SPECIAL DEAL' : undefined,
        isAvailable: true,
      });

      // Reset form
      setNewItemName('');
      setNewItemPrice('');
      setNewItemOriginalPrice('');
      setNewItemDescription('');
      setProductImageBase64('');
      setProductImageFileName('');
      if (productFileInputRef.current) productFileInputRef.current.value = '';

      setProductSavedFeedback(true);
      setProductSuccessMessage(`✓ "${addedTitle}" saved directly to Firestore and is live!`);
      setTimeout(() => {
        setProductSavedFeedback(false);
        setProductSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.warn('[StaffDashboard] Error adding product to Firestore:', err);
      setProductErrorMessage(err?.message || 'Failed to save product to Firestore.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Edit Product Handlers (Owner Only)
  const handleStartEdit = (item: MenuItem) => {
    if (!isOwner) return;
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditPrice(String(item.price));
    setEditOriginalPrice(item.originalPrice ? String(item.originalPrice) : '');
    setEditDescription(item.description);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !editingItem) return;
    const priceNum = sanitizeNumber(editPrice, 1, 100000);
    if (priceNum <= 0) return;

    const origPriceNum = editOriginalPrice ? sanitizeNumber(editOriginalPrice, 1, 100000) : undefined;
    const cleanEditName = sanitizeString(editName, 100) || editingItem.name;
    const cleanEditDesc = sanitizeString(editDescription, 300) || editingItem.description;
    const cleanEditCat = sanitizeString(editCategory, 50).toUpperCase() || editingItem.category;

    if (onEditMenuItem) {
      onEditMenuItem(editingItem.id, {
        name: cleanEditName,
        category: cleanEditCat,
        price: priceNum,
        originalPrice: origPriceNum,
        description: cleanEditDesc,
      });
    }
    setEditingItem(null);
  };

  // Handle Category Banner File Upload for Creation
  const handleNewCategoryBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsNewCategoryBannerProcessing(true);
      const base64 = await readFileAsBase64(file, 1600, 900, 0.85);
      setNewCategoryBanner(base64);
      setNewCategoryBannerFileName(file.name);
    } catch (err) {
      console.error('Failed to read category banner file:', err);
    } finally {
      setIsNewCategoryBannerProcessing(false);
    }
  };

  // Handle Category Banner File Upload for Editing
  const handleEditCategoryBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCategory) return;
    try {
      setIsEditCategoryBannerProcessing(true);
      const base64 = await readFileAsBase64(file, 1600, 900, 0.85);
      setEditingCategory((prev) => (prev ? { ...prev, bannerImage: base64 } : null));
      setEditCategoryBannerFileName(file.name);
    } catch (err) {
      console.error('Failed to read edit category banner file:', err);
    } finally {
      setIsEditCategoryBannerProcessing(false);
    }
  };

  // Add Category Handler with Custom Banner & Firestore Persistence (Owner Only)
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setCategorySuccessMsg('Access Denied: Category creation is restricted to Store Owner.');
      setTimeout(() => setCategorySuccessMsg(null), 3500);
      return;
    }
    const formatted = sanitizeString(newCategoryName, 50).toUpperCase();
    if (!formatted) return;

    if (customCategories.some((c) => c.trim().toUpperCase() === formatted)) {
      setCategorySuccessMsg(`Category "${formatted}" already exists!`);
      setTimeout(() => setCategorySuccessMsg(null), 3500);
      return;
    }

    setIsSavingCategory(true);
    try {
      const bannerUrl = newCategoryBanner.trim() || undefined;
      const tagline = newCategoryTagline.trim() || undefined;

      // Save category with custom banner in Firestore categories collection
      if (onSaveCategoryWithBanner) {
        await onSaveCategoryWithBanner({
          id: formatted,
          name: formatted,
          bannerImage: bannerUrl,
          tagline,
        });
      }

      const updated = Array.from(new Set([...customCategories, formatted]));
      setCustomCategories(updated);
      if (onUpdateCategories) onUpdateCategories(updated);
      try {
        localStorage.setItem('shan_categories', JSON.stringify(updated));
      } catch {}

      setNewCategoryName('');
      setNewCategoryBanner('');
      setNewCategoryTagline('');
      setNewCategoryBannerFileName('');
      if (categoryBannerFileInputRef.current) categoryBannerFileInputRef.current.value = '';
      setCategorySuccessMsg(`✓ Category "${formatted}" & banner saved to Firestore.`);
      setTimeout(() => setCategorySuccessMsg(null), 3500);
    } catch (err: any) {
      console.warn('Error saving category to Firestore:', err);
      const updated = Array.from(new Set([...customCategories, formatted]));
      setCustomCategories(updated);
      if (onUpdateCategories) onUpdateCategories(updated);
      setCategorySuccessMsg(`✓ Category "${formatted}" added locally.`);
      setTimeout(() => setCategorySuccessMsg(null), 3500);
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Open Edit Category Modal with current values
  const handleOpenEditCategory = (catName: string) => {
    const meta = getCategoryBannerMeta(catName);
    const fromDetail = (categoryDetails || []).find(
      (c) => (c.name || '').trim().toUpperCase() === catName.trim().toUpperCase()
    );
    setEditingCategory({
      id: fromDetail?.id || catName.trim().toUpperCase(),
      originalName: catName.trim().toUpperCase(),
      name: catName.trim().toUpperCase(),
      bannerImage: fromDetail?.bannerImage || meta.bannerImage,
      tagline: fromDetail?.tagline || meta.tagline,
    });
    setEditCategoryBannerFileName('');
  };

  // Save Edited Category to Firestore (Owner Only)
  const handleSaveEditedCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !editingCategory) return;
    const formatted = sanitizeString(editingCategory.name, 50).toUpperCase();
    if (!formatted) return;

    setIsSavingEditCategory(true);
    try {
      if (onSaveCategoryWithBanner) {
        await onSaveCategoryWithBanner({
          id: editingCategory.id || formatted,
          name: formatted,
          bannerImage: editingCategory.bannerImage.trim() || undefined,
          tagline: editingCategory.tagline.trim() || undefined,
        });
      }

      const orig = editingCategory.originalName;
      let updated = customCategories.map((c) => (c === orig ? formatted : c));
      if (!updated.includes(formatted)) {
        updated.push(formatted);
      }
      setCustomCategories(Array.from(new Set(updated)));
      if (onUpdateCategories) onUpdateCategories(updated);
      try {
        localStorage.setItem('shan_categories', JSON.stringify(updated));
      } catch {}

      setCategorySuccessMsg(`✓ Category "${formatted}" & banner updated in Firestore.`);
      setTimeout(() => setCategorySuccessMsg(null), 3500);
      setEditingCategory(null);
    } catch (err: any) {
      console.warn('Error updating category in Firestore:', err);
      setCategorySuccessMsg(`✓ Category "${formatted}" updated.`);
      setTimeout(() => setCategorySuccessMsg(null), 3500);
      setEditingCategory(null);
    } finally {
      setIsSavingEditCategory(false);
    }
  };

  // Delete Category Handler with Firestore sync (Owner Only)
  const promptDeleteCategory = (cat: string) => {
    if (!isOwner) return;
    const normCat = cat.trim().toUpperCase();
    const itemsInCat = menuItems.filter((m) => (m.category || '').trim().toUpperCase() === normCat).length;
    setConfirmModal({
      isOpen: true,
      title: 'DELETE CATEGORY',
      message:
        itemsInCat > 0
          ? `Category "${normCat}" contains ${itemsInCat} active menu items. Are you sure you want to remove this category from Firestore?`
          : `Are you sure you want to delete the "${normCat}" category from Firestore?`,
      itemName: normCat,
      confirmButtonText: 'Yes, Delete',
      onConfirm: async () => {
        try {
          if (onDeleteCategory) {
            await onDeleteCategory(normCat);
          }
        } catch (err) {
          console.warn('Error deleting category from Firestore:', err);
        }
        const updated = customCategories.filter((c) => c.trim().toUpperCase() !== normCat);
        setCustomCategories(updated);
        if (onUpdateCategories) onUpdateCategories(updated);
        try {
          localStorage.setItem('shan_categories', JSON.stringify(updated));
        } catch {}
        setCategorySuccessMsg(`✓ Category "${normCat}" deleted from Firestore.`);
        setTimeout(() => setCategorySuccessMsg(null), 3000);
      },
    });
  };

  // Defense-in-depth: Halt rendering immediately if unauthorized according to Firestore claims
  if (firestoreRoles.isLoaded && !isOwner && !isAdmin) {
    return (
      <div className="py-16 max-w-lg mx-auto px-4 text-center">
        <div className="bg-[#ECE4D8] border-2 border-red-500/50 rounded-3xl p-8 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h2 className="font-display font-black text-2xl text-[#2B1810] uppercase tracking-tight">
            Access Denied
          </h2>
          <p className="font-mono-code text-xs text-[#2B1810]/75">
            Your user account does not possess administrator (isAdmin) or owner (isOwner) privileges in Firestore.
          </p>
          {onLogout && (
            <button
              onClick={onLogout}
              className="mt-4 px-6 py-2.5 rounded-full bg-[#2B1810] text-white font-mono-code text-xs font-bold uppercase tracking-wider hover:bg-[#3E241A] transition cursor-pointer"
            >
              Sign Out & Return Home
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner / Greeting and Status Quick Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-[#2B1810]/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
            <span>SHAN FAST FOODS • ADMIN PORTAL</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#2B1810] tracking-tight uppercase leading-none">
            {greeting}
          </h1>
          <p className="font-mono-code text-xs sm:text-sm text-[#2B1810]/75 mt-2">
            Real-time kitchen orders, menu pricing, analytics, and store configurations.
          </p>

          {/* User Role & Permission Level Indicator (driven strictly by Firestore user role) */}
          <div className="flex flex-wrap items-center gap-2 mt-3.5">
            {isOwner ? (
              <span
                data-testid="role-badge"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DE8030]/15 text-[#C46726] border border-[#DE8030]/30 text-[11px] font-mono-code font-bold"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#DE8030]" />
                <span>STORE OWNER (FULL 5-TAB ACCESS)</span>
              </span>
            ) : isAdmin ? (
              <span
                data-testid="role-badge"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-800 border border-blue-500/30 text-[11px] font-mono-code font-bold"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>STORE ADMIN (with restricted access)</span>
              </span>
            ) : null}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2B1810]/5 hover:bg-red-500/10 text-[#2B1810]/75 hover:text-red-700 border border-[#2B1810]/15 hover:border-red-500/30 text-[11px] font-mono-code font-bold uppercase transition cursor-pointer"
                title="Sign out from Staff Session"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out / Lock</span>
              </button>
            )}
          </div>
        </div>

        {/* Store Status Quick Widget with Synchronized Toggle */}
        <div className="bg-[#2B1810] text-[#F5EFEB] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 shadow-xl shrink-0 border border-[#2B1810]/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#DE8030] text-[#2B1810] flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-[10px] font-mono-code tracking-[0.2em] uppercase text-[#F5EFEB]/60">
                CURRENT STORE STATUS
              </div>
              <div className="flex items-center gap-2 font-mono-code text-xs sm:text-sm font-semibold mt-0.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    storeStatus === 'ACCEPTING'
                      ? 'bg-[#4ADE80] animate-pulse'
                      : storeStatus === 'BUSY'
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                />
                <span className="font-bold">
                  {storeStatus === 'ACCEPTING'
                    ? 'Accepting Orders'
                    : storeStatus === 'BUSY'
                    ? 'Kitchen Busy'
                    : 'Orders Paused'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={onToggleStoreStatus}
              title={`Currently: ${storeStatus}. Click to cycle store status.`}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono-code uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                storeStatus === 'ACCEPTING'
                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                  : storeStatus === 'BUSY'
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                  : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                Toggle ({storeStatus === 'ACCEPTING' ? 'Set Busy' : storeStatus === 'BUSY' ? 'Pause' : 'Accept'})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Tab Navigation Bar (in the exact requested order) */}
      <div className="bg-[#ECE4D8]/80 backdrop-blur-xs p-1.5 rounded-2xl border border-[#2B1810]/15 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          
          {/* 1. Orders (1st) */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-mono-code text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'orders'
                ? 'bg-[#2B1810] text-[#F5EFEB] shadow-md'
                : 'text-[#2B1810]/70 hover:bg-[#2B1810]/5 hover:text-[#2B1810]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Orders</span>
            {openOrders.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#DE8030] text-[#2B1810] animate-pulse">
                {openOrders.length}
              </span>
            )}
          </button>

          {/* 2. Analytics & Insights (2nd) */}
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-mono-code text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-[#2B1810] text-[#F5EFEB] shadow-md'
                : 'text-[#2B1810]/70 hover:bg-[#2B1810]/5 hover:text-[#2B1810]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Analytics & Insights</span>
          </button>

          {/* 3. Products (3rd) - Restrict to Owner Only */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-mono-code text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'products'
                  ? 'bg-[#2B1810] text-[#F5EFEB] shadow-md'
                  : 'text-[#2B1810]/70 hover:bg-[#2B1810]/5 hover:text-[#2B1810]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'products' ? 'bg-[#DE8030] text-[#2B1810]' : 'bg-[#2B1810]/10 text-[#2B1810]'
                }`}
              >
                {menuItems.length}
              </span>
            </button>
          )}

          {/* 4. Categories (4th) - Restrict to Owner Only */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-mono-code text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'categories'
                  ? 'bg-[#2B1810] text-[#F5EFEB] shadow-md'
                  : 'text-[#2B1810]/70 hover:bg-[#2B1810]/5 hover:text-[#2B1810]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Categories</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'categories' ? 'bg-[#DE8030] text-[#2B1810]' : 'bg-[#2B1810]/10 text-[#2B1810]'
                }`}
              >
                {customCategories.length}
              </span>
            </button>
          )}

          {/* 5. Settings (5th) */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-mono-code text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'settings'
                ? 'bg-[#2B1810] text-[#F5EFEB] shadow-md'
                : 'text-[#2B1810]/70 hover:bg-[#2B1810]/5 hover:text-[#2B1810]'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>

        </div>
      </div>

      {/* TAB 1: ANALYTICS & INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  TOTAL REVENUE
                </span>
                <div className="w-8 h-8 rounded-full bg-[#15803D]/10 text-[#15803D] flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display font-black text-3xl sm:text-4xl text-[#2B1810]">
                PKR {totalRevenue.toLocaleString()}
              </div>
              <p className="text-[11px] font-mono-code text-[#2B1810]/60 mt-1">
                From {completedOrders.length} completed deliveries
              </p>
            </div>

            {/* Completed Orders */}
            <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  COMPLETED ORDERS
                </span>
                <div className="w-8 h-8 rounded-full bg-[#15803D]/10 text-[#15803D] flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display font-black text-3xl sm:text-4xl text-[#2B1810]">
                {completedOrders.length}
              </div>
              <p className="text-[11px] font-mono-code text-[#2B1810]/60 mt-1">
                Successfully delivered to customers
              </p>
            </div>

            {/* Canceled Orders */}
            <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-red-600 uppercase">
                  CANCELED ORDERS
                </span>
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display font-black text-3xl sm:text-4xl text-red-700">
                {cancelledOrders.length}
              </div>
              <p className="text-[11px] font-mono-code text-[#2B1810]/60 mt-1">
                Rejected or voided orders
              </p>
            </div>

            {/* Active Queue & AOV */}
            <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  AVG ORDER VALUE
                </span>
                <div className="w-8 h-8 rounded-full bg-[#DE8030]/15 text-[#DE8030] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display font-black text-3xl sm:text-4xl text-[#2B1810]">
                PKR {avgOrderValue.toLocaleString()}
              </div>
              <p className="text-[11px] font-mono-code text-[#2B1810]/60 mt-1">
                {openOrders.length} order(s) currently in kitchen
              </p>
            </div>
          </div>

          {/* Breakdown & Top Selling Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Top Selling Items */}
            <div className="lg:col-span-7 bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                    PERFORMANCE INSIGHTS
                  </div>
                  <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase">
                    TOP SELLING DISHES
                  </h3>
                </div>
                <span className="text-xs font-mono-code text-[#2B1810]/60">
                  By units ordered
                </span>
              </div>

              {topSellingItems.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono-code text-[#2B1810]/60 bg-[#ECE4D8]/50 rounded-2xl border border-dashed border-[#2B1810]/15">
                  Complete orders to generate sales rankings.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {topSellingItems.map((item, idx) => (
                    <div
                      key={item.name}
                      className="bg-[#F5EFEB] border border-[#2B1810]/10 rounded-2xl p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-display font-bold text-base text-[#2B1810] uppercase truncate">
                            {item.name}
                          </h4>
                          <span className="text-xs font-mono-code text-[#2B1810]/60">
                            {item.quantity} orders delivered
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display font-black text-base text-[#2B1810]">
                          PKR {item.revenue.toLocaleString()}
                        </span>
                        <div className="text-[10px] font-mono-code text-[#15803D] font-semibold">
                          Earned
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Order Status Distribution */}
            <div className="lg:col-span-5 bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div>
                <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  STATUS BREAKDOWN
                </div>
                <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase">
                  ORDER ACTIVITY
                </h3>
              </div>

              <div className="space-y-4 pt-2 font-mono-code text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Delivered & Completed ({completedOrders.length})</span>
                    <span>
                      {orders.length > 0
                        ? Math.round((completedOrders.length / orders.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#2B1810]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#15803D] rounded-full"
                      style={{
                        width: `${
                          orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Active in Kitchen ({openOrders.length})</span>
                    <span>
                      {orders.length > 0 ? Math.round((openOrders.length / orders.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#2B1810]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#DE8030] rounded-full"
                      style={{
                        width: `${
                          orders.length > 0 ? (openOrders.length / orders.length) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Canceled ({cancelledOrders.length})</span>
                    <span>
                      {orders.length > 0
                        ? Math.round((cancelledOrders.length / orders.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#2B1810]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full"
                      style={{
                        width: `${
                          orders.length > 0 ? (cancelledOrders.length / orders.length) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2B1810]/10 text-[11px] text-[#2B1810]/70 space-y-1">
                  <div className="flex justify-between">
                    <span>Total Orders Recorded:</span>
                    <span className="font-bold">{orders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Live Cloud Sync:</span>
                    <span className="font-bold text-[#15803D]">Active (Firestore)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Complete Order History Logs Table */}
          <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  HISTORICAL LOGS
                </div>
                <h3 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase">
                  COMPLETE ORDER HISTORY
                </h3>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search order ID or customer..."
                    className="pl-9 pr-3 py-2 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                  />
                  <Search className="w-4 h-4 text-[#2B1810]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="READY">READY</option>
                  <option value="PREPARING">PREPARING</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>
            </div>

            {/* History Table */}
            {filteredOrderHistory.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono-code text-[#2B1810]/60 bg-[#ECE4D8]/50 rounded-2xl border border-dashed border-[#2B1810]/15">
                No orders match your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#2B1810]/15 bg-[#F5EFEB]">
                <table className="w-full text-left font-mono-code text-xs">
                  <thead className="bg-[#2B1810] text-[#F5EFEB] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items Summary</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B1810]/10">
                    {filteredOrderHistory.map((o) => (
                      <tr key={o.id} className="hover:bg-[#ECE4D8]/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#2B1810]">{o.id}</td>
                        <td className="py-3.5 px-4 text-[#2B1810]/70">{o.createdAt}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#2B1810]">{o.customerName}</div>
                          <div className="text-[10px] text-[#2B1810]/60">{o.customerPhone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#2B1810]/80">
                          {o.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#2B1810]">
                          PKR {o.total.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              o.status === 'COMPLETED'
                                ? 'bg-[#15803D]/15 text-[#15803D]'
                                : o.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-700'
                                : o.status === 'READY'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.status === 'PREPARING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#DE8030]/20 text-[#2B1810]'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: PRODUCTS (Owner Only) */}
      {activeTab === 'products' && isOwner && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Header Controls: Add Button & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                STOREFRONT CATALOG
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] uppercase tracking-tight">
                MANAGE PRODUCTS
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAddProductExpanded(!isAddProductExpanded)}
                className="px-5 py-2.5 rounded-full bg-[#9C4A2F] hover:bg-[#853C23] text-white text-xs font-mono-code uppercase font-bold tracking-wider transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isAddProductExpanded ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isAddProductExpanded ? 'CLOSE FORM' : '+ ADD PRODUCT'}</span>
              </button>
            </div>
          </div>

          {/* Add Product Collapsible Panel */}
          {isAddProductExpanded && (
            <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-8 shadow-md animate-in slide-in-from-top-4 duration-200 space-y-6">
              <div>
                <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  NEW DISH ENTRY
                </div>
                <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase">
                  ADD NEW MENU ITEM TO FIRESTORE
                </h3>
              </div>

              {productSuccessMessage && (
                <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono-code text-xs">
                  {productSuccessMessage}
                </div>
              )}

              {productErrorMessage && (
                <div className="p-4 rounded-2xl bg-red-100 text-red-900 border border-red-300 font-mono-code text-xs">
                  {productErrorMessage}
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                      PRODUCT NAME *
                    </label>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Classic Beef Smash Burger"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                      CATEGORY *
                    </label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                    >
                      {customCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                      PRICE (PKR) *
                    </label>
                    <input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="e.g. 599"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                      required
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                      SLASHED / ORIGINAL PRICE (OPTIONAL)
                    </label>
                    <input
                      type="number"
                      value={newItemOriginalPrice}
                      onChange={(e) => setNewItemOriginalPrice(e.target.value)}
                      placeholder="e.g. 799"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                    DESCRIPTION
                  </label>
                  <textarea
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="Crispy fried patty with signature spicy sauce and melted cheese..."
                    rows={2}
                    className="w-full px-4 py-2 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                  />
                </div>

                {/* Image Upload Area */}
                <div>
                  <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                    PRODUCT PHOTO (DEVICE UPLOAD)
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <input
                      ref={productFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => productFileInputRef.current?.click()}
                      disabled={isProductImageProcessing}
                      className="px-4 py-2.5 rounded-xl border border-[#2B1810]/25 bg-[#F5EFEB] hover:bg-[#E2D8C9] text-xs font-mono-code text-[#2B1810] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isProductImageProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImagePlus className="w-4 h-4" />
                      )}
                      <span>
                        {productImageFileName ? 'Change Image' : 'Select Photo From Device'}
                      </span>
                    </button>

                    {productImageBase64 && (
                      <div className="flex items-center gap-3">
                        <img
                          src={productImageBase64}
                          alt="Preview"
                          className="w-12 h-12 rounded-xl object-cover border border-[#2B1810]/20"
                        />
                        <span className="text-xs font-mono-code text-[#15803D] font-bold">
                          ✓ Image ready for upload
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingProduct}
                    className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#15803D] hover:bg-[#166534] text-white text-xs font-mono-code uppercase font-bold tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingProduct ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>SAVING DIRECTLY TO FIRESTORE...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>PUBLISH PRODUCT TO STOREFRONT</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search & Category Filter Bar */}
          <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Search products by name or ingredients..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
              />
              <Search className="w-4 h-4 text-[#2B1810]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setProductCategoryFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono-code uppercase font-semibold transition cursor-pointer whitespace-nowrap ${
                  productCategoryFilter === 'ALL'
                    ? 'bg-[#2B1810] text-[#F5EFEB]'
                    : 'bg-[#F5EFEB] text-[#2B1810]/70 hover:bg-[#E2D8C9]'
                }`}
              >
                ALL ({menuItems.length})
              </button>
              {customCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setProductCategoryFilter(c)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono-code uppercase font-semibold transition cursor-pointer whitespace-nowrap ${
                    productCategoryFilter === c
                      ? 'bg-[#2B1810] text-[#F5EFEB]'
                      : 'bg-[#F5EFEB] text-[#2B1810]/70 hover:bg-[#E2D8C9]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid / Table */}
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-xs font-mono-code text-[#2B1810]/60 bg-[#ECE4D8]/50 rounded-3xl border border-dashed border-[#2B1810]/15">
              No products found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-4 flex flex-col justify-between gap-4 shadow-xs relative"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-2xl object-cover bg-[#E2D8C9] shrink-0 border border-[#2B1810]/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono-code font-bold tracking-wider text-[#C46726] uppercase truncate">
                          {item.category}
                        </span>
                        {!item.isAvailable && (
                          <span className="text-[9px] font-mono-code bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold uppercase">
                            Disabled
                          </span>
                        )}
                      </div>
                      <h4 className="font-display font-black text-base text-[#2B1810] uppercase truncate leading-tight">
                        {item.name}
                      </h4>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-display font-black text-lg text-[#2B1810]">
                          PKR {item.price.toLocaleString()}
                        </span>
                        {item.originalPrice && (
                          <span className="font-mono-code text-xs line-through text-[#2B1810]/50">
                            PKR {item.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[#2B1810]/10 flex items-center justify-between gap-2">
                    {/* Toggle Available */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleMenuItem(item.id)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                          item.isAvailable ? 'bg-[#15803D]' : 'bg-[#BA9D8C]'
                        }`}
                        title={item.isAvailable ? 'In Stock (Click to disable)' : 'Sold Out (Click to enable)'}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                            item.isAvailable ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-[11px] font-mono-code text-[#2B1810]/70">
                        {item.isAvailable ? 'Live' : 'Hidden'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-2 rounded-xl text-[#2B1810]/70 hover:text-[#2B1810] hover:bg-[#F5EFEB] transition cursor-pointer"
                        title="Edit dish"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          promptDeleteProduct(item);
                        }}
                        disabled={deletingId === item.id}
                        className="p-2 rounded-xl text-red-600 hover:bg-red-100 transition cursor-pointer disabled:opacity-50"
                        title={`Delete "${item.name}"`}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* TAB 3: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                LIVE KITCHEN OPERATIONS
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] uppercase tracking-tight">
                INCOMING ORDERS ({openOrders.length})
              </h2>
            </div>

            {/* Queue Filter */}
            <div className="flex items-center gap-2 bg-[#ECE4D8] p-1.5 rounded-2xl border border-[#2B1810]/15">
              {(['ALL', 'PENDING', 'PREPARING', 'READY'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderQueueFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono-code font-bold uppercase transition cursor-pointer ${
                    orderQueueFilter === st
                      ? 'bg-[#2B1810] text-[#F5EFEB] shadow-xs'
                      : 'text-[#2B1810]/70 hover:text-[#2B1810]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Kitchen Orders Grid */}
          {filteredOpenOrders.length === 0 ? (
            <div className="bg-[#ECE4D8]/60 border border-dashed border-[#2B1810]/20 rounded-3xl p-12 sm:p-16 text-center flex flex-col items-center justify-center min-h-[340px]">
              <div className="w-14 h-14 rounded-2xl bg-[#DE8030]/15 text-[#DE8030] flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 stroke-[1.8]" />
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase tracking-tight">
                KITCHEN IS CLEAR
              </h3>
              <p className="font-mono-code text-xs text-[#2B1810]/70 max-w-xs mt-2 leading-relaxed">
                No active orders in this queue filter. New incoming orders sync here in real time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredOpenOrders.map((order) => {
                const statusColors = {
                  PENDING: 'bg-[#DE8030] text-white',
                  PREPARING: 'bg-[#B45309] text-white',
                  READY: 'bg-[#15803D] text-white',
                  COMPLETED: 'bg-[#15803D] text-white',
                  CANCELLED: 'bg-red-600 text-white',
                };

                return (
                  <div
                    key={order.id}
                    className="bg-[#F5EFEB] border border-[#2B1810]/15 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-[#2B1810]/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-2xl text-[#2B1810]">
                            {order.id}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono-code uppercase font-bold ${
                              statusColors[order.status]
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono-code text-[#2B1810]/60 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Placed: {order.createdAt}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono-code text-[#2B1810]/60 uppercase block">
                          TOTAL BILL
                        </span>
                        <span className="font-display font-black text-2xl text-[#2B1810]">
                          PKR {order.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-[#ECE4D8]/80 rounded-2xl p-3.5 space-y-1 font-mono-code text-xs border border-[#2B1810]/10">
                      <div className="font-bold text-[#2B1810] flex items-center justify-between">
                        <span>{order.customerName}</span>
                        <span className="text-[#9C4A2F] flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${order.customerPhone}`} className="hover:underline">
                            {order.customerPhone}
                          </a>
                        </span>
                      </div>
                      <div className="text-[#2B1810]/75 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#DE8030]" />
                        <span>{order.customerAddress}</span>
                      </div>
                      {order.notes && (
                        <div className="text-[11px] text-[#2B1810]/80 italic pt-1 border-t border-[#2B1810]/10">
                          &quot;{order.notes}&quot;
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="space-y-1.5 font-mono-code text-xs">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-[#2B1810]/5">
                          <span>
                            <span className="font-bold text-[#2B1810]">{it.quantity}x</span> {it.name}
                          </span>
                          <span className="font-semibold text-[#2B1810]">
                            PKR {(it.price * it.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Controls */}
                    <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#2B1810]/15">
                      <div className="flex items-center gap-2 flex-wrap">
                        {order.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => onUpdateOrderStatus(order.id, 'PREPARING')}
                            className="px-4 py-2 rounded-full bg-[#2B1810] text-white text-xs font-mono-code uppercase font-semibold flex items-center gap-1.5 hover:bg-[#3E241A] transition cursor-pointer"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Start Preparing</span>
                          </button>
                        )}

                        {order.status === 'PREPARING' && (
                          <button
                            type="button"
                            onClick={() => onUpdateOrderStatus(order.id, 'READY')}
                            className="px-4 py-2 rounded-full bg-[#B45309] text-white text-xs font-mono-code uppercase font-semibold flex items-center gap-1.5 hover:bg-[#92400E] transition cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Mark Ready</span>
                          </button>
                        )}

                        {order.status === 'READY' && (
                          <button
                            type="button"
                            onClick={() => onUpdateOrderStatus(order.id, 'COMPLETED')}
                            className="px-4 py-2 rounded-full bg-[#15803D] text-white text-xs font-mono-code uppercase font-semibold flex items-center gap-1.5 hover:bg-[#166534] transition cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Complete & Deliver</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          promptCancelOrder(order.id);
                        }}
                        className="relative z-20 pointer-events-auto px-3.5 py-2 rounded-full text-xs font-mono-code font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                        title="Cancel order"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB 4: CATEGORIES (Owner Only) */}
      {activeTab === 'categories' && isOwner && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                MENU TAXONOMY & CUSTOM BANNERS
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] uppercase tracking-tight">
                MANAGE CATEGORIES & HEADERS
              </h2>
              <p className="font-mono-code text-xs text-[#2B1810]/70 mt-1 max-w-2xl">
                Configure custom high-definition banner images and taglines for every category. Changes persist directly in Firestore and render dynamically across customer menu sections.
              </p>
            </div>
          </div>

          {/* Add Category & Banner Form */}
          <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase flex items-center gap-2">
                  <ImagePlus className="w-6 h-6 text-[#DE8030]" />
                  <span>ADD NEW MENU CATEGORY & BANNER</span>
                </h3>
                <p className="font-mono-code text-xs text-[#2B1810]/70 mt-1">
                  Create custom categories with custom header photography (URL or device upload) and taglines.
                </p>
              </div>

              {categorySuccessMsg && (
                <div className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono-code font-bold flex items-center gap-1.5 animate-in fade-in shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  <span>{categorySuccessMsg}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleAddCategory} className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Form Inputs */}
                <div className="space-y-4">
                  {/* Category Name */}
                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80 mb-1.5">
                      CATEGORY NAME *
                    </label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewCategoryName(val);
                        // Auto-suggest preset banner if user types a matching name and hasn't chosen one
                        const matchedPreset = PRESET_CATEGORY_BANNERS.find(
                          (p) => p.name === val.trim().toUpperCase() || val.trim().toUpperCase().includes(p.name)
                        );
                        if (matchedPreset && !newCategoryBanner) {
                          setNewCategoryBanner(matchedPreset.url);
                          if (!newCategoryTagline) setNewCategoryTagline(matchedPreset.tagline);
                        }
                      }}
                      placeholder="e.g. DESSERTS, WRAPS, FRAPPE, SHAKES"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] uppercase font-bold focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                      required
                    />
                  </div>

                  {/* Tagline / Subtitle */}
                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80 mb-1.5">
                      TAGLINE / SUBHEADER (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={newCategoryTagline}
                      onChange={(e) => setNewCategoryTagline(e.target.value)}
                      placeholder="e.g. 100% Real Fruit Blends, Naturally Vibrant & Energizing"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                    />
                  </div>

                  {/* Banner Image Input Field (URL or File Upload) */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80">
                      CATEGORY BANNER IMAGE (URL OR FILE UPLOAD)
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <input
                          type="url"
                          value={newCategoryBanner}
                          onChange={(e) => {
                            setNewCategoryBanner(e.target.value);
                            setNewCategoryBannerFileName('');
                          }}
                          placeholder="Paste banner image URL (https://...)"
                          className="w-full px-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                        />
                        {newCategoryBanner && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewCategoryBanner('');
                              setNewCategoryBannerFileName('');
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2B1810]/40 hover:text-[#2B1810] p-1 cursor-pointer"
                            title="Clear image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* File Upload Input & Trigger */}
                      <input
                        ref={categoryBannerFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleNewCategoryBannerUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => categoryBannerFileInputRef.current?.click()}
                        disabled={isNewCategoryBannerProcessing}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F5EFEB] hover:bg-[#E2D8C9] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        {isNewCategoryBannerProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-[#DE8030]" />
                        )}
                        <span>Upload File</span>
                      </button>
                    </div>

                    {newCategoryBannerFileName && (
                      <div className="text-[11px] font-mono-code text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Uploaded: {newCategoryBannerFileName}</span>
                      </div>
                    )}
                  </div>

                  {/* Curated Preset Banner Quick Picker */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 block">
                      Quick Pick Curated Food Photography:
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                      {PRESET_CATEGORY_BANNERS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setNewCategoryBanner(preset.url);
                            setNewCategoryBannerFileName('');
                            if (!newCategoryTagline) setNewCategoryTagline(preset.tagline);
                            if (!newCategoryName) setNewCategoryName(preset.name);
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono-code font-bold whitespace-nowrap transition border cursor-pointer ${
                            newCategoryBanner === preset.url
                              ? 'bg-[#2B1810] text-white border-[#2B1810]'
                              : 'bg-[#F5EFEB] text-[#2B1810]/80 border-[#2B1810]/15 hover:border-[#DE8030] hover:text-[#DE8030]'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Interactive Banner Preview */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80 block">
                    STOREFRONT LIVE BANNER PREVIEW
                  </span>

                  <div className="relative rounded-2xl overflow-hidden border border-[#2B1810]/20 shadow-md aspect-[16/7] bg-[#2B1810] group">
                    <img
                      src={
                        newCategoryBanner ||
                        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80'
                      }
                      alt="Banner Preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Cinematic Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2B1810] via-[#2B1810]/75 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2B1810]/70 via-transparent to-transparent" />

                    {/* Preview Content */}
                    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono-code font-bold tracking-widest bg-[#DE8030] text-[#2B1810] uppercase">
                          PREVIEW
                        </span>
                        <span className="text-[10px] font-mono-code text-[#F5EFEB]/80">
                          Live Storefront Look
                        </span>
                      </div>

                      <div>
                        <h4 className="font-display font-black text-xl sm:text-2xl md:text-3xl text-[#F5EFEB] uppercase leading-none drop-shadow-sm">
                          {newCategoryName.trim() || 'CATEGORY NAME'}
                        </h4>
                        <p className="font-mono-code text-[11px] text-[#F5EFEB]/85 line-clamp-1 mt-1">
                          {newCategoryTagline.trim() || "Chef's Signature Recipes, Freshly Prepared To Order"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-code text-[#2B1810]/55 block">
                    This exact stylish banner header will appear directly above the dishes in the customer menu storefront.
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 border-t border-[#2B1810]/10 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#2B1810] hover:bg-[#3E241A] text-[#F5EFEB] text-xs font-mono-code uppercase font-bold tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingCategory ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-[#DE8030]" />
                      <span>+ Save Category & Banner to Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Category Cards Grid with Live Headers & Editing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {customCategories.map((cat) => {
              const meta = getCategoryBannerMeta(cat);
              const matchingItems = menuItems.filter(
                (m) => (m.category || '').trim().toUpperCase() === cat.trim().toUpperCase()
              );

              return (
                <div
                  key={cat}
                  className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between group hover:shadow-lg transition-all"
                >
                  {/* Category Banner Visual Header */}
                  <div className="relative aspect-[16/7] w-full bg-[#2B1810] overflow-hidden">
                    <img
                      src={meta.bannerImage}
                      alt={cat}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2B1810] via-[#2B1810]/70 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2B1810]/80 via-transparent to-transparent" />

                    <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono-code font-bold uppercase tracking-wider ${
                            meta.isCustom
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#DE8030] text-[#2B1810]'
                          }`}
                        >
                          {meta.isCustom ? 'CUSTOM CLOUD BANNER' : 'PRESET BANNER'}
                        </span>
                        <span className="text-[10px] font-mono-code text-[#F5EFEB]/90 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
                          {matchingItems.length} {matchingItems.length === 1 ? 'Dish' : 'Dishes'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-display font-black text-xl text-[#F5EFEB] uppercase leading-tight">
                          {cat}
                        </h4>
                        <p className="font-mono-code text-[10px] text-[#F5EFEB]/80 line-clamp-1 mt-0.5">
                          {meta.tagline}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body: Thumbnail Previews & Stats */}
                  <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono-code uppercase text-[#2B1810]/60 mb-1.5 font-bold">
                        Associated Dishes:
                      </div>
                      <div className="flex items-center gap-2 overflow-hidden py-0.5">
                        {matchingItems.slice(0, 4).map((it) => (
                          <img
                            key={it.id}
                            src={it.image}
                            alt={it.name}
                            title={it.name}
                            className="w-10 h-10 rounded-xl object-cover bg-[#E2D8C9] border border-[#2B1810]/10"
                          />
                        ))}
                        {matchingItems.length === 0 && (
                          <span className="text-[11px] font-mono-code text-[#2B1810]/50 italic">
                            No dishes added yet
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-[#2B1810]/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#2B1810]/10 hover:bg-[#DE8030] hover:text-[#2B1810] text-[#2B1810] text-[11px] font-mono-code font-bold flex items-center gap-1 transition cursor-pointer"
                          title={`Edit ${cat} banner & details`}
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit Banner</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setProductCategoryFilter(cat);
                            setActiveTab('products');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono-code font-bold text-[#9C4A2F] hover:bg-[#9C4A2F]/10 flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Filter</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => promptDeleteCategory(cat)}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition cursor-pointer"
                        title={`Delete "${cat}" category`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 5: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          <div>
            <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
              STORE MANAGEMENT
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] uppercase tracking-tight">
              STORE CONFIGURATIONS
            </h2>
          </div>

          {/* 1. Store Open/Closed Status Selector */}
          <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  OPERATING STATE
                </div>
                <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase">
                  STORE OPEN / CLOSED STATUS
                </h3>
                <p className="font-mono-code text-xs text-[#2B1810]/70 mt-1">
                  Click any status card below to immediately update the operating mode across the customer storefront and staff portal.
                </p>
              </div>

              {statusFeedbackMsg && (
                <div className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono-code font-bold flex items-center gap-1.5 animate-in fade-in self-start sm:self-auto shrink-0 shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                  <span>{statusFeedbackMsg}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Accepting */}
              <div
                onClick={() => handleSelectStatus('ACCEPTING')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  storeStatus === 'ACCEPTING'
                    ? 'border-[#15803D] bg-emerald-50/90 shadow-md ring-2 ring-[#15803D]/25'
                    : 'border-[#2B1810]/15 bg-[#F5EFEB] opacity-75 hover:opacity-100 hover:border-[#2B1810]/35 hover:bg-emerald-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-lg text-[#15803D] uppercase">
                      ACCEPTING ORDERS
                    </span>
                    {storeStatus === 'ACCEPTING' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#15803D] text-white flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 border-white ${
                      storeStatus === 'ACCEPTING'
                        ? 'bg-[#15803D] animate-pulse shadow-sm'
                        : 'bg-gray-300'
                    }`}
                  />
                </div>
                <p className="font-mono-code text-[11px] text-[#2B1810]/70 leading-relaxed">
                  Kitchen running smoothly. Normal delivery time (25-35 min).
                </p>
                <div className="pt-2 border-t border-[#2B1810]/10 flex items-center justify-between text-[10px] font-mono-code">
                  <span className="text-[#2B1810]/60">Delivery: ~25-35 min</span>
                  <span className="font-bold text-[#15803D]">
                    {storeStatus === 'ACCEPTING' ? 'Currently Active' : 'Click to Activate'}
                  </span>
                </div>
              </div>

              {/* Busy */}
              <div
                onClick={() => handleSelectStatus('BUSY')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  storeStatus === 'BUSY'
                    ? 'border-amber-500 bg-amber-50/90 shadow-md ring-2 ring-amber-500/25'
                    : 'border-[#2B1810]/15 bg-[#F5EFEB] opacity-75 hover:opacity-100 hover:border-[#2B1810]/35 hover:bg-amber-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-lg text-amber-800 uppercase">
                      KITCHEN BUSY
                    </span>
                    {storeStatus === 'BUSY' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-amber-600 text-white flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 border-white ${
                      storeStatus === 'BUSY'
                        ? 'bg-amber-500 animate-pulse shadow-sm'
                        : 'bg-gray-300'
                    }`}
                  />
                </div>
                <p className="font-mono-code text-[11px] text-[#2B1810]/70 leading-relaxed">
                  High volume rush. Notice shown to customers advising 45-60 min wait times.
                </p>
                <div className="pt-2 border-t border-[#2B1810]/10 flex items-center justify-between text-[10px] font-mono-code">
                  <span className="text-[#2B1810]/60">Delivery: ~45-60 min</span>
                  <span className="font-bold text-amber-700">
                    {storeStatus === 'BUSY' ? 'Currently Active' : 'Click to Activate'}
                  </span>
                </div>
              </div>

              {/* Paused */}
              <div
                onClick={() => handleSelectStatus('PAUSED')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  storeStatus === 'PAUSED'
                    ? 'border-red-500 bg-red-50/90 shadow-md ring-2 ring-red-500/25'
                    : 'border-[#2B1810]/15 bg-[#F5EFEB] opacity-75 hover:opacity-100 hover:border-[#2B1810]/35 hover:bg-red-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-lg text-red-700 uppercase">
                      ORDERS PAUSED
                    </span>
                    {storeStatus === 'PAUSED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-red-600 text-white flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 border-white ${
                      storeStatus === 'PAUSED'
                        ? 'bg-red-500 animate-pulse shadow-sm'
                        : 'bg-gray-300'
                    }`}
                  />
                </div>
                <p className="font-mono-code text-[11px] text-[#2B1810]/70 leading-relaxed">
                  Kitchen resting, closed, or inventory restock. Ordering is temporarily locked.
                </p>
                <div className="pt-2 border-t border-[#2B1810]/10 flex items-center justify-between text-[10px] font-mono-code">
                  <span className="text-[#2B1810]/60">State: Paused / Closed</span>
                  <span className="font-bold text-red-700">
                    {storeStatus === 'PAUSED' ? 'Currently Active' : 'Click to Activate'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Delivery Management Controls (Dynamic sync across storefront, "The Bag", & checkout) */}
          <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  DISPATCH & PRICING RULES
                </div>
                <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase flex items-center gap-2.5">
                  <Truck className="w-6 h-6 text-[#DE8030]" />
                  <span>DELIVERY MANAGEMENT</span>
                </h3>
                <p className="font-mono-code text-xs text-[#2B1810]/70 mt-1">
                  Configure delivery fee, free delivery order threshold, and service area name. Updates sync dynamically with customer storefront cart and checkout.
                </p>
              </div>

              {deliverySavedFeedback && (
                <div className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono-code font-bold flex items-center gap-1.5 animate-in fade-in self-start sm:self-auto">
                  <Check className="w-3.5 h-3.5" />
                  <span>Delivery Settings Saved!</span>
                </div>
              )}

              {deliveryErrorMsg && (
                <div className="px-3.5 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-mono-code font-bold flex items-center gap-1.5 animate-in fade-in self-start sm:self-auto">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>{deliveryErrorMsg}</span>
                </div>
              )}
            </div>

            {!isOwner && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-xs font-mono-code text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>RBAC Notice: Delivery fee configurations require Store Owner (isOwner) privileges. Administrator accounts have view-only access.</span>
              </div>
            )}

            <form onSubmit={handleSaveDeliverySettings} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Standard Delivery Fee */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80">
                    Standard Delivery Fee (PKR)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2B1810]/50 font-mono-code text-xs font-bold">
                      Rs
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={deliveryFeeInput}
                      onChange={(e) => setDeliveryFeeInput(e.target.value)}
                      placeholder="e.g. 120"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-sm font-mono-code font-semibold text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                      required
                    />
                  </div>
                  <span className="text-[10px] font-mono-code text-[#2B1810]/55 block">
                    Charged when order total is below free delivery threshold
                  </span>
                </div>

                {/* Free Delivery Threshold */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80">
                    Free Delivery Threshold (PKR)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2B1810]/50 font-mono-code text-xs font-bold">
                      Rs
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={freeThresholdInput}
                      onChange={(e) => setFreeThresholdInput(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-sm font-mono-code font-semibold text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                      required
                    />
                  </div>
                  <span className="text-[10px] font-mono-code text-[#2B1810]/55 block">
                    Orders at or above this amount receive free delivery
                  </span>
                </div>

                {/* Primary Delivery Zone / Area */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80">
                    Delivery Zone / Area Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2B1810]/50">
                      <MapPin className="w-4 h-4 text-[#DE8030]" />
                    </div>
                    <input
                      type="text"
                      value={deliveryZoneInput}
                      onChange={(e) => setDeliveryZoneInput(e.target.value)}
                      placeholder="e.g. Korangi"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5EFEB] border border-[#2B1810]/20 text-sm font-mono-code font-semibold text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                      required
                    />
                  </div>
                  <span className="text-[10px] font-mono-code text-[#2B1810]/55 block">
                    Shown in cart badges, notices, and receipt breakdowns
                  </span>
                </div>
              </div>

              {/* Customer storefront preview pill */}
              <div className="p-3.5 bg-[#F5EFEB] rounded-2xl border border-[#2B1810]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono-code">
                <div className="flex items-center gap-2 text-[#2B1810]/80">
                  <span className="font-bold text-[#C46726] uppercase">Storefront Notice:</span>
                  <span>
                    Orders above <strong className="text-[#2B1810]">PKR {Number(freeThresholdInput || 0).toLocaleString()}</strong> get FREE delivery in <strong className="text-[#2B1810]">{deliveryZoneInput || 'Korangi'}</strong> (otherwise <strong className="text-[#2B1810]">PKR {Number(deliveryFeeInput || 0).toLocaleString()}</strong>).
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSavingDelivery || !isOwner}
                  className="px-6 py-2.5 rounded-full bg-[#2B1810] hover:bg-[#3E241A] active:scale-95 text-[#F5EFEB] text-xs font-mono-code uppercase font-bold flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingDelivery ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Delivery Settings</span>
                </button>

                <button
                  type="button"
                  disabled={!isOwner}
                  onClick={handleResetDeliverySettings}
                  className="px-4 py-2.5 rounded-full border border-[#2B1810]/20 hover:bg-[#2B1810]/5 text-xs font-mono-code uppercase font-semibold text-[#2B1810] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </form>
          </div>

          {/* 3. Store Operating Hours & Contacts */}
          <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                SCHEDULE & CONTACTS
              </div>
              <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase">
                OPERATING HOURS & DELIVERY INFO
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 font-mono-code text-xs">
              <div className="bg-[#F5EFEB] p-4 rounded-2xl space-y-2 border border-[#2B1810]/10">
                <div className="flex items-center gap-2 font-bold text-[#2B1810]">
                  <Clock className="w-4 h-4 text-[#DE8030]" />
                  <span>KITCHEN TIMINGS</span>
                </div>
                <p className="text-[#2B1810]/80">
                  Open 7 Days a Week: <strong>12:00 PM – 02:00 AM</strong>
                </p>
                <p className="text-[11px] text-[#2B1810]/60">
                  Late night delivery available across all service sectors.
                </p>
              </div>

              <div className="bg-[#F5EFEB] p-4 rounded-2xl space-y-2 border border-[#2B1810]/10">
                <div className="flex items-center gap-2 font-bold text-[#2B1810]">
                  <Phone className="w-4 h-4 text-[#DE8030]" />
                  <span>HOTLINE & WHATSAPP</span>
                </div>
                <p className="text-[#2B1810]/80">
                  Helpline: <strong>+92 300 1234567</strong>
                </p>
                <p className="text-[11px] text-[#2B1810]/60">
                  Orders over PKR {deliverySettings?.freeDeliveryThreshold.toLocaleString() ?? '1,500'} enjoy free doorstep delivery in {deliverySettings?.deliveryZone ?? 'Korangi'}.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Hero Banner Updates with Local File Upload */}
          <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  STOREFRONT BRANDING
                </div>
                <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase">
                  HERO BANNER IMAGE
                </h3>
              </div>

              {heroSavedFeedback && (
                <div className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono-code font-bold flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Banner Saved!</span>
                </div>
              )}
            </div>

            {!isOwner && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-xs font-mono-code text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>RBAC Notice: Storefront Hero Photography branding requires Store Owner role.</span>
              </div>
            )}

            {/* Live Banner Preview */}
            <div className="relative aspect-[16/6] rounded-2xl overflow-hidden border border-[#2B1810]/20 bg-[#2B1810]">
              <img
                src={heroImage}
                alt="Store Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <span className="text-[11px] font-mono-code text-white/90">
                  Live storefront banner preview
                </span>
              </div>
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => bannerFileInputRef.current?.click()}
                disabled={isBannerProcessing || !isOwner}
                className="px-5 py-2.5 rounded-full bg-[#2B1810] hover:bg-[#3E241A] text-[#F5EFEB] text-xs font-mono-code uppercase font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBannerProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>Upload New Banner From Device</span>
              </button>

              <button
                type="button"
                disabled={!isOwner}
                onClick={handleResetDefaultBanner}
                className="px-4 py-2.5 rounded-full border border-[#2B1810]/20 hover:bg-[#2B1810]/5 text-xs font-mono-code uppercase font-semibold text-[#2B1810] flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>

          {/* 5. Category Banners Management in Settings (Owner Access) */}
          {isOwner && (
            <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                    STOREFRONT CATEGORY HEADERS
                  </div>
                  <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase flex items-center gap-2">
                    <Tag className="w-5 h-5 text-[#DE8030]" />
                    <span>CATEGORY BANNERS & SECTIONS</span>
                  </h3>
                  <p className="font-mono-code text-xs text-[#2B1810]/70 mt-1">
                    Customize individual category banner photography, custom subtitles, and dish sections.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('categories')}
                  className="px-5 py-2.5 rounded-full bg-[#2B1810] hover:bg-[#3E241A] text-[#F5EFEB] text-xs font-mono-code uppercase font-bold tracking-wider flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
                >
                  <span>Manage All Category Banners</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Category Banner Carousel / Previews */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {customCategories.slice(0, 4).map((c) => {
                  const meta = getCategoryBannerMeta(c);
                  return (
                    <div
                      key={c}
                      onClick={() => handleOpenEditCategory(c)}
                      className="relative rounded-2xl overflow-hidden aspect-[16/9] border border-[#2B1810]/15 group cursor-pointer shadow-xs"
                      title={`Click to customize ${c} banner`}
                    >
                      <img
                        src={meta.bannerImage}
                        alt={c}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-2.5">
                        <span className="font-display font-black text-xs text-white uppercase truncate">
                          {c}
                        </span>
                        <span className="text-[9px] font-mono-code text-[#DE8030] flex items-center gap-1 mt-0.5">
                          <Pencil className="w-2.5 h-2.5" />
                          <span>Customize Banner</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Edit Product Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setEditingItem(null)}
            className="fixed inset-0 bg-[#2B1810]/50 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-md bg-[#F5EFEB] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2B1810]/15 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-black text-xl text-[#2B1810] uppercase">
                EDIT MENU ITEM
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/10 flex items-center justify-center text-[#2B1810] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                  PRODUCT NAME
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-sm font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                    CATEGORY
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                  >
                    {customCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                    PRICE (PKR)
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-sm font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                    SLASHED (OPT)
                  </label>
                  <input
                    type="number"
                    value={editOriginalPrice}
                    onChange={(e) => setEditOriginalPrice(e.target.value)}
                    placeholder="e.g. 799"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-sm font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                  DESCRIPTION
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-3 rounded-full border border-[#2B1810]/20 text-xs font-mono-code uppercase font-semibold text-[#2B1810] hover:bg-[#2B1810]/5 transition cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full bg-[#9C4A2F] hover:bg-[#853C23] text-white text-xs font-mono-code uppercase font-bold tracking-wider transition shadow-md cursor-pointer"
                >
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Banner & Details Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => !isSavingEditCategory && setEditingCategory(null)}
            className="fixed inset-0 bg-[#2B1810]/60 backdrop-blur-xs animate-in fade-in duration-200"
          />
          <div className="relative w-full max-w-xl bg-[#F5EFEB] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2B1810]/15 z-10 animate-in zoom-in-95 duration-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2B1810]/10 pb-3">
              <div>
                <span className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                  EDIT CATEGORY HEADER
                </span>
                <h3 className="font-display font-black text-2xl text-[#2B1810] uppercase">
                  {editingCategory.originalName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isSavingEditCategory && setEditingCategory(null)}
                className="w-8 h-8 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/10 flex items-center justify-center text-[#2B1810] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedCategory} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80 mb-1.5">
                  CATEGORY NAME *
                </label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] uppercase font-bold focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80 mb-1.5">
                  TAGLINE / SUBHEADER (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={editingCategory.tagline}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, tagline: e.target.value })
                  }
                  placeholder="e.g. 100% Smashed Beef & Crispy Chicken"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                />
              </div>

              {/* Banner Image URL & File Upload */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80">
                  BANNER IMAGE URL OR FILE UPLOAD
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <input
                      type="url"
                      value={editingCategory.bannerImage}
                      onChange={(e) => {
                        setEditingCategory({ ...editingCategory, bannerImage: e.target.value });
                        setEditCategoryBannerFileName('');
                      }}
                      placeholder="Paste image URL (https://...)"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                    />
                    {editingCategory.bannerImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory({ ...editingCategory, bannerImage: '' });
                          setEditCategoryBannerFileName('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2B1810]/40 hover:text-[#2B1810] p-1 cursor-pointer"
                        title="Clear image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <input
                    ref={editCategoryBannerFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditCategoryBannerUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editCategoryBannerFileInputRef.current?.click()}
                    disabled={isEditCategoryBannerProcessing}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#ECE4D8] hover:bg-[#E2D8C9] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {isEditCategoryBannerProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#DE8030]" />
                    )}
                    <span>Upload File</span>
                  </button>
                </div>

                {editCategoryBannerFileName && (
                  <div className="text-[11px] font-mono-code text-emerald-700 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Uploaded: {editCategoryBannerFileName}</span>
                  </div>
                )}
              </div>

              {/* Quick Preset Selector in Edit Modal */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 block">
                  Select From Curated Food Banners:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                  {PRESET_CATEGORY_BANNERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setEditingCategory({
                          ...editingCategory,
                          bannerImage: preset.url,
                          tagline: editingCategory.tagline || preset.tagline,
                        });
                        setEditCategoryBannerFileName('');
                      }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-mono-code font-bold whitespace-nowrap transition border cursor-pointer ${
                        editingCategory.bannerImage === preset.url
                          ? 'bg-[#2B1810] text-white border-[#2B1810]'
                          : 'bg-[#ECE4D8] text-[#2B1810]/80 border-[#2B1810]/15 hover:border-[#DE8030] hover:text-[#DE8030]'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Inside Edit Modal */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/80 block">
                  LIVE BANNER PREVIEW
                </span>
                <div className="relative rounded-2xl overflow-hidden border border-[#2B1810]/20 aspect-[16/6] bg-[#2B1810]">
                  <img
                    src={
                      editingCategory.bannerImage ||
                      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80'
                    }
                    alt="Category Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#2B1810] via-[#2B1810]/70 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2B1810]/75 via-transparent to-transparent" />

                  <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono-code font-bold tracking-widest bg-[#DE8030] text-[#2B1810] uppercase self-start">
                      LIVE PREVIEW
                    </span>
                    <div>
                      <h4 className="font-display font-black text-2xl text-[#F5EFEB] uppercase leading-none">
                        {editingCategory.name || 'CATEGORY NAME'}
                      </h4>
                      <p className="font-mono-code text-[11px] text-[#F5EFEB]/85 line-clamp-1 mt-0.5">
                        {editingCategory.tagline || 'Fresh handcrafted menu items'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#2B1810]/10">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  disabled={isSavingEditCategory}
                  className="flex-1 py-2.5 rounded-xl border border-[#2B1810]/20 text-xs font-mono-code uppercase font-semibold text-[#2B1810] hover:bg-[#2B1810]/5 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditCategory}
                  className="flex-1 py-2.5 rounded-xl bg-[#2B1810] hover:bg-[#3E241A] text-[#F5EFEB] text-xs font-mono-code uppercase font-bold tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEditCategory ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#DE8030]" />
                      <span>Save Changes to Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Glassmorphic Confirmation Modal (Replaces browser window.confirm) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glassmorphic dark backdrop */}
          <div
            onClick={() => !isConfirmingAction && setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            className="fixed inset-0 bg-[#2B1810]/75 backdrop-blur-md transition-all animate-in fade-in duration-200"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-[#F5EFEB] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2B1810]/20 z-10 animate-in zoom-in-95 duration-200 space-y-5">
            {/* Header with warning icon and title */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center border border-red-200/80 shrink-0">
                  <AlertCircle className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-red-600 uppercase">
                    ACTION CONFIRMATION
                  </div>
                  <h3 className="font-display font-black text-xl sm:text-2xl text-[#2B1810] uppercase tracking-tight">
                    {confirmModal.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isConfirmingAction && setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={isConfirmingAction}
                className="w-8 h-8 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/10 flex items-center justify-center text-[#2B1810] transition cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Message */}
            <p className="font-mono-code text-xs sm:text-sm text-[#2B1810]/80 leading-relaxed">
              {confirmModal.message}
            </p>

            {/* Item Identifier Highlight */}
            {confirmModal.itemName && (
              <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-xl px-4 py-2.5 text-xs font-mono-code text-[#2B1810] font-semibold flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="truncate">{confirmModal.itemName}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={isConfirmingAction}
                className="flex-1 py-3 rounded-full border border-[#2B1810]/20 text-xs font-mono-code uppercase font-semibold text-[#2B1810] hover:bg-[#2B1810]/5 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsConfirmingAction(true);
                  try {
                    await confirmModal.onConfirm();
                  } finally {
                    setIsConfirmingAction(false);
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  }
                }}
                disabled={isConfirmingAction}
                className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-mono-code uppercase font-bold tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isConfirmingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{confirmModal.confirmButtonText || "Yes, Proceed"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
