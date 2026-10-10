import { useState, useEffect } from 'react';
import { signOut, applyActionCode } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { MenuItem, CartItem, CustomerOrder, StoreStatus, DeliverySettings, DEFAULT_DELIVERY_SETTINGS, StaffUser, CategoryDetail } from './types';
import { sanitizeString } from './utils/security';
import { INITIAL_MENU_ITEMS, INITIAL_HERO_IMAGE } from './data/initialMenu';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MenuSection } from './components/MenuSection';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { StaffAccessModal } from './components/StaffAccessModal';
import { StaffDashboard } from './components/StaffDashboard';
import { StoryModal } from './components/StoryModal';
import { ContactModal } from './components/ContactModal';
import { NotFoundPage } from './components/NotFoundPage';
import { ProtectedAuthGuard } from './components/ProtectedAuthGuard';
import { Footer } from './components/Footer';
import { updatePageSEO, ROUTE_SEO } from './utils/seo';
import {
  subscribeToMenuItems,
  fetchMenuItemsOnce,
  saveMenuItem,
  editMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
  subscribeToCategories,
  subscribeToCategoryDetails,
  fetchCategoryDetailsOnce,
  saveCategories,
  saveCategoryWithBanner,
  deleteCategoryDocument,
  subscribeToOrders,
  createCustomerOrder,
  updateOrderStatus,
  subscribeToStoreSettings,
  updateStoreSettings,
  initializeFirestoreCollections,
} from './services/firestoreService';

export type AppRoute = 'home' | 'menu' | 'story' | 'contact' | 'staff' | 'not-found';

export const isProtectedDashboardPath = (path: string): boolean => {
  if (!path) return false;
  const raw = path.toLowerCase().trim();
  const clean = raw.length > 1 ? raw.replace(/\/+$/, '') : raw;
  return (
    clean === '/staff' ||
    clean === '/admin' ||
    clean === '/dashboard' ||
    clean.startsWith('/staff/') ||
    clean.startsWith('/admin/') ||
    clean.startsWith('/dashboard/')
  );
};

const resolveRoute = (pathname: string): { route: AppRoute; path: string } => {
  if (typeof window === 'undefined') return { route: 'home', path: '/' };
  const raw = (pathname || '/').toLowerCase().trim();
  const clean = raw.length > 1 ? raw.replace(/\/+$/, '') : raw;

  if (clean === '/' || clean === '' || clean === '/index.html') {
    return { route: 'home', path: '/' };
  }
  if (clean === '/menu') {
    return { route: 'menu', path: '/menu' };
  }
  if (clean === '/our-story' || clean === '/story' || clean === '/about') {
    return { route: 'story', path: '/our-story' };
  }
  if (clean === '/contact' || clean === '/contact-us') {
    return { route: 'contact', path: '/contact' };
  }
  if (isProtectedDashboardPath(clean)) {
    return { route: 'staff', path: clean };
  }
  return { route: 'not-found', path: pathname };
};

export default function App() {
  // Client-Side Routing & View State
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      return resolveRoute(window.location.pathname).route;
    }
    return 'home';
  });
  const [attemptedPath, setAttemptedPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  // Strict Authentication Guard State (Firebase Auth onAuthStateChanged verification)
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(false);
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);

  // Storefront & Staff View State (Secure: defaults to customer until Firebase verifies staff)
  const [currentView, setCurrentView] = useState<'customer' | 'staff'>('customer');

  // Modals State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Menu Items State (Real-time Firestore sync with instant state caching)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const cached = localStorage.getItem('shan_cached_menu_items');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Cache] Error loading cached menu items:', e);
    }
    return [];
  });

  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('shan_cached_menu_items');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });

  // Hero Image State
  const [heroImage, setHeroImage] = useState<string>(() => {
    try {
      return localStorage.getItem('shan_hero_image') || INITIAL_HERO_IMAGE;
    } catch {
      return INITIAL_HERO_IMAGE;
    }
  });

  // Store Status State
  const [storeStatus, setStoreStatus] = useState<StoreStatus>(() => {
    try {
      return (localStorage.getItem('shan_store_status') as StoreStatus) || 'ACCEPTING';
    } catch {
      return 'ACCEPTING';
    }
  });

  // Delivery Settings State (Dynamic across admin and customer storefront)
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(() => {
    try {
      const saved = localStorage.getItem('shan_delivery_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.standardFee === 'number' &&
          typeof parsed?.freeDeliveryThreshold === 'number' &&
          typeof parsed?.deliveryZone === 'string'
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Cache] Could not parse cached delivery settings:', e);
    }
    return DEFAULT_DELIVERY_SETTINGS;
  });

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('shan_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Orders State (Real-time synced with Firestore 'orders' collection)
  const [orders, setOrders] = useState<CustomerOrder[]>(() => {
    try {
      const saved = localStorage.getItem('shan_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const DEFAULT_CATEGORIES = ['BURGERS', 'PIZZAS', 'FAST FOOD', 'DEALS', 'DRINKS'];

  // Shared Categories State (Real-time Firestore collection sync + product category derivation)
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shan_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map((c: string) => c.trim().toUpperCase()).filter(Boolean);
          return Array.from(new Set([...DEFAULT_CATEGORIES, ...cleaned]));
        }
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  // Category Details State (with custom banners & metadata from Firestore)
  const [categoryDetails, setCategoryDetails] = useState<CategoryDetail[]>(() => {
    try {
      const saved = localStorage.getItem('shan_category_details');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Real-time Firestore subscriber + initial fetch for detailed categories ('categories' collection)
  useEffect(() => {
    // 1. Instant direct fetch from Firestore 'categories' collection
    fetchCategoryDetailsOnce().then((liveDetails) => {
      if (liveDetails.length > 0) {
        setCategoryDetails(liveDetails);
        setCategories((prev) => {
          const names = liveDetails.map((d) => d.name);
          return Array.from(new Set([...DEFAULT_CATEGORIES, ...names, ...prev]));
        });
      }
    });

    // 2. Continuous real-time listener for categories collection
    const unsubscribe = subscribeToCategoryDetails(
      (liveDetails) => {
        if (liveDetails) {
          setCategoryDetails(liveDetails);
          try {
            localStorage.setItem('shan_category_details', JSON.stringify(liveDetails));
          } catch {}
          setCategories((prev) => {
            const names = liveDetails.map((d) => d.name);
            return Array.from(new Set([...DEFAULT_CATEGORIES, ...names, ...prev]));
          });
        }
      },
      (err) => {
        console.warn('[Firestore] Categories subscription note:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Automatically merge any newly created product categories
  useEffect(() => {
    if (menuItems.length > 0) {
      const itemCats = menuItems
        .map((m) => (m.category || '').trim().toUpperCase())
        .filter(Boolean);
      setCategories((prev) => Array.from(new Set([...prev, ...itemCats])));
    }
  }, [menuItems]);

  // Persist categories to localStorage and sync with Firestore
  useEffect(() => {
    try {
      localStorage.setItem('shan_categories', JSON.stringify(categories));
    } catch (e) {
      console.warn('[Cache] Could not save categories:', e);
    }
  }, [categories]);

  // Category update handler for Admin Portal
  const handleUpdateCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    saveCategories(newCategories).catch((err) => {
      console.warn('[Firestore] Error persisting categories to Firestore:', err);
    });
  };

  // Save/Update category with custom banner in Firestore (Owner Only)
  const handleSaveCategoryWithBanner = async (category: {
    id?: string;
    name: string;
    bannerImage?: string;
    tagline?: string;
  }) => {
    if (!staffUser?.isOwner) {
      throw new Error('Access Denied: Category management is restricted to Store Owner.');
    }
    try {
      await saveCategoryWithBanner(category);
      const cleanName = category.name.trim().toUpperCase();
      setCategoryDetails((prev) => {
        const idx = prev.findIndex((c) => c.name === cleanName || c.id === category.id);
        const item: CategoryDetail = {
          id: category.id || cleanName,
          name: cleanName,
          bannerImage: category.bannerImage,
          tagline: category.tagline,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = item;
          return next;
        }
        return [...prev, item];
      });
      setCategories((prev) => Array.from(new Set([cleanName, ...prev])));
    } catch (err) {
      console.warn('[Firestore] Error saving category with banner:', err);
      throw err;
    }
  };

  // Delete category from Firestore (Owner Only)
  const handleDeleteCategory = async (catIdOrName: string) => {
    if (!staffUser?.isOwner) {
      throw new Error('Access Denied: Category deletion is restricted to Store Owner.');
    }
    try {
      await deleteCategoryDocument(catIdOrName);
      const clean = catIdOrName.trim().toUpperCase();
      setCategoryDetails((prev) => prev.filter((c) => c.id !== catIdOrName && c.name !== clean));
      setCategories((prev) => prev.filter((c) => c !== clean));
    } catch (err) {
      console.warn('[Firestore] Error deleting category from Firestore:', err);
      throw err;
    }
  };

  // Initialize store settings and collections in background
  useEffect(() => {
    initializeFirestoreCollections().catch((err) => {
      console.warn('[Firestore] Initialization check note:', err);
    });
  }, []);

  // 1. Live real-time Firestore listener + initial direct fetch for products ('products' collection)
  useEffect(() => {
    // Immediate direct query for instant rendering
    fetchMenuItemsOnce().then((items) => {
      if (items.length > 0) {
        setMenuItems(items);
        setIsLoadingMenu(false);
      }
    });

    // Real-time onSnapshot listener for instant continuous synchronization
    const unsubscribe = subscribeToMenuItems(
      (liveItems) => {
        setMenuItems(liveItems);
        try {
          localStorage.setItem('shan_cached_menu_items', JSON.stringify(liveItems));
        } catch (err) {
          console.warn('[Cache] Could not write menu items to cache:', err);
        }
        setIsLoadingMenu(false);
      },
      (err) => {
        console.warn('[Firestore] Error fetching products:', err);
        setIsLoadingMenu(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Keep local cache synced when products are added/edited/deleted
  useEffect(() => {
    if (menuItems.length > 0) {
      try {
        localStorage.setItem('shan_cached_menu_items', JSON.stringify(menuItems));
      } catch (err) {
        console.warn('[Cache] Failed to persist menu items:', err);
      }
    }
  }, [menuItems]);

  // 2. Real-time Firestore synchronization for Kitchen Queue & Orders
  useEffect(() => {
    const unsubscribe = subscribeToOrders((liveOrders) => {
      setOrders(liveOrders);
    });
    return () => unsubscribe();
  }, []);

  // 3. Real-time Firestore synchronization for Store Settings (Banner, Status, & Delivery)
  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((settings) => {
      if (settings.heroImage) setHeroImage(settings.heroImage);
      if (settings.storeStatus) setStoreStatus(settings.storeStatus);
      if (settings.deliverySettings) {
        setDeliverySettings((prev) => {
          const merged: DeliverySettings = {
            standardFee:
              typeof settings.deliverySettings?.standardFee === 'number'
                ? settings.deliverySettings.standardFee
                : prev.standardFee,
            freeDeliveryThreshold:
              typeof settings.deliverySettings?.freeDeliveryThreshold === 'number'
                ? settings.deliverySettings.freeDeliveryThreshold
                : prev.freeDeliveryThreshold,
            deliveryZone:
              typeof settings.deliverySettings?.deliveryZone === 'string'
                ? settings.deliverySettings.deliveryZone
                : prev.deliveryZone,
          };
          try {
            localStorage.setItem('shan_delivery_settings', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // 4. Handle Firebase Email Verification Redirect ('mode=verifyEmail') on component load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (mode === 'verifyEmail') {
      const handleEmailVerification = async () => {
        try {
          // If action code exists from Firebase email, apply it
          if (oobCode) {
            try {
              await applyActionCode(auth, oobCode);
            } catch (actionErr) {
              console.warn('[Auth] Notice applying email action code:', actionErr);
            }
          }

          // Force reload of currentUser to update emailVerified property
          if (auth.currentUser) {
            await auth.currentUser.reload();

            if (auth.currentUser.emailVerified) {
              try {
                let docSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (!docSnap.exists()) {
                  const staffSnap = await getDoc(doc(db, 'staff', auth.currentUser.uid));
                  if (staffSnap.exists()) docSnap = staffSnap;
                }
                const data = docSnap?.exists() ? docSnap.data() : null;
                const isOwner = Boolean(data?.isOwner === true || data?.role === 'owner');
                const isAdmin = Boolean(data?.isAdmin === true || data?.role === 'admin' || isOwner);

                if (isAdmin || isOwner) {
                  const authenticatedUser: StaffUser = {
                    uid: auth.currentUser.uid,
                    email: auth.currentUser.email || '',
                    name: data?.name || data?.displayName || (isOwner ? 'Store Owner' : 'Store Administrator'),
                    isAdmin,
                    isOwner,
                    role: isOwner ? 'owner' : 'admin',
                  };
                  handleStaffAuthSuccess(authenticatedUser);
                }
              } catch (profileErr) {
                console.warn('[Auth] Error resolving user profile after email verification:', profileErr);
              }
            }
          }
        } catch (err) {
          console.error('[Auth] Error during email verification handling:', err);
        } finally {
          // Clear URL search params so the flow doesn't trigger on every re-render
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      handleEmailVerification();
    }
  }, []);

  // 5. Dynamic sync of authenticated staff permissions directly from Firestore 'users' collection
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          if (!firebaseUser.emailVerified) {
            setIsStaffAuthenticated(false);
            setStaffUser(null);
            try {
              sessionStorage.removeItem('shan_staff_auth');
              sessionStorage.removeItem('shan_staff_user');
            } catch {}
            return;
          }
          try {
            let docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (!docSnap.exists()) {
              const staffSnap = await getDoc(doc(db, 'staff', firebaseUser.uid));
              if (staffSnap.exists()) docSnap = staffSnap;
            }
            if (docSnap.exists()) {
              const data = docSnap.data();
              const isOwner = Boolean(data?.isOwner === true || data?.role === 'owner');
              const isAdmin = Boolean(data?.isAdmin === true || data?.role === 'admin' || isOwner);
              if (isAdmin || isOwner) {
                const authenticatedUser: StaffUser = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  name: data?.name || data?.displayName || (isOwner ? 'Store Owner' : 'Store Administrator'),
                  isAdmin,
                  isOwner,
                  role: isOwner ? 'owner' : 'admin',
                };
                setIsStaffAuthenticated(true);
                setStaffUser(authenticatedUser);
                try {
                  sessionStorage.setItem('shan_staff_auth', 'true');
                  sessionStorage.setItem('shan_staff_user', JSON.stringify(authenticatedUser));
                } catch {}
                if (isProtectedDashboardPath(window.location.pathname)) {
                  setCurrentView('staff');
                }
              } else {
                // User has no staff/owner roles assigned in Firestore
                setIsStaffAuthenticated(false);
                setStaffUser(null);
                try {
                  sessionStorage.removeItem('shan_staff_auth');
                  sessionStorage.removeItem('shan_staff_user');
                } catch {}
                await signOut(auth);
              }
            } else {
              // Profile document absent in Firestore
              setIsStaffAuthenticated(false);
              setStaffUser(null);
              try {
                sessionStorage.removeItem('shan_staff_auth');
                sessionStorage.removeItem('shan_staff_user');
              } catch {}
            }
          } catch (err) {
            console.warn('[App] Firestore user role sync notice:', err);
            setIsStaffAuthenticated(false);
            setStaffUser(null);
          }
        } else {
          // Firebase Auth user signed out or token expired: immediately clear staff authorization state
          setIsStaffAuthenticated(false);
          setStaffUser(null);
          try {
            sessionStorage.removeItem('shan_staff_auth');
            sessionStorage.removeItem('shan_staff_user');
          } catch {}
          if (isProtectedDashboardPath(window.location.pathname)) {
            setCurrentView('customer');
          }
        }
      } finally {
        setIsAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fallback local persistence for settings and status
  useEffect(() => {
    localStorage.setItem('shan_hero_image', heroImage);
  }, [heroImage]);

  useEffect(() => {
    localStorage.setItem('shan_store_status', storeStatus);
  }, [storeStatus]);

  useEffect(() => {
    try {
      localStorage.setItem('shan_delivery_settings', JSON.stringify(deliverySettings));
    } catch (e) {
      console.warn('[Cache] Could not save delivery settings:', e);
    }
  }, [deliverySettings]);

  useEffect(() => {
    localStorage.setItem('shan_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('shan_orders', JSON.stringify(orders));
  }, [orders]);

  // Dynamic SEO Synchronization
  useEffect(() => {
    if (currentRoute === 'home') {
      updatePageSEO(ROUTE_SEO.home);
    } else if (currentRoute === 'menu') {
      updatePageSEO(ROUTE_SEO.menu);
    } else if (currentRoute === 'story') {
      updatePageSEO(ROUTE_SEO.story);
    } else if (currentRoute === 'contact') {
      updatePageSEO(ROUTE_SEO.contact);
    } else if (currentRoute === 'staff') {
      updatePageSEO(ROUTE_SEO.staff);
    } else if (currentRoute === 'not-found') {
      updatePageSEO(ROUTE_SEO.notFound);
    }
  }, [currentRoute]);

  const scrollToMenu = () => {
    const menuEl = document.getElementById('menu-section');
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Client-Side Router Navigation Handler
  const navigate = (targetPath: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetPath);
    }
    const { route, path } = resolveRoute(targetPath);
    setCurrentRoute(route);
    setAttemptedPath(path);

    if (route === 'home') {
      setCurrentView('customer');
      setIsStoryModalOpen(false);
      setIsContactModalOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (route === 'menu') {
      setCurrentView('customer');
      setIsStoryModalOpen(false);
      setIsContactModalOpen(false);
      setTimeout(() => {
        scrollToMenu();
      }, 100);
    } else if (route === 'story') {
      setCurrentView('customer');
      setIsStoryModalOpen(true);
      setIsContactModalOpen(false);
    } else if (route === 'contact') {
      setCurrentView('customer');
      setIsContactModalOpen(true);
      setIsStoryModalOpen(false);
    } else if (route === 'staff' || isProtectedDashboardPath(path)) {
      if (isStaffAuthenticated && staffUser && auth.currentUser?.emailVerified) {
        setCurrentView('staff');
      } else {
        // Direct unauthenticated access is intercepted by the ProtectedAuthGuard
        setCurrentView('customer');
      }
    } else if (route === 'not-found') {
      setIsStoryModalOpen(false);
      setIsContactModalOpen(false);
    }
  };

  // Browser History (Popstate) & Initial Mount Route Dispatch
  useEffect(() => {
    const handlePopState = () => {
      const { route, path } = resolveRoute(window.location.pathname);
      setCurrentRoute(route);
      setAttemptedPath(path);

      if (route === 'home') {
        setCurrentView('customer');
        setIsStoryModalOpen(false);
        setIsContactModalOpen(false);
      } else if (route === 'menu') {
        setCurrentView('customer');
        setIsStoryModalOpen(false);
        setIsContactModalOpen(false);
        setTimeout(scrollToMenu, 100);
      } else if (route === 'story') {
        setCurrentView('customer');
        setIsStoryModalOpen(true);
        setIsContactModalOpen(false);
      } else if (route === 'contact') {
        setCurrentView('customer');
        setIsContactModalOpen(true);
        setIsStoryModalOpen(false);
      } else if (route === 'staff' || isProtectedDashboardPath(path)) {
        if (isStaffAuthenticated && staffUser && auth.currentUser?.emailVerified) {
          setCurrentView('staff');
        } else {
          setCurrentView('customer');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initial mount action if URL has public deep path
    const initial = resolveRoute(window.location.pathname);
    if (initial.route === 'menu') {
      setTimeout(scrollToMenu, 350);
    } else if (initial.route === 'story') {
      setIsStoryModalOpen(true);
    } else if (initial.route === 'contact') {
      setIsContactModalOpen(true);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [isStaffAuthenticated, staffUser]);

  // Cart Operations
  const handleAddToCart = (item: MenuItem, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + quantity } : ci
        );
      }
      return [...prev, { item, quantity }];
    });
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((ci) => (ci.item.id === itemId ? { ...ci, quantity: newQuantity } : ci))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Customer Checkout (Persists immediately to Firestore 'orders' collection)
  const handleCheckout = (orderData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    notes?: string;
  }) => {
    const subtotal = cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
    const deliveryFee =
      subtotal >= deliverySettings.freeDeliveryThreshold
        ? 0
        : subtotal > 0
        ? deliverySettings.standardFee
        : 0;
    const orderId = `#SHAN-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: CustomerOrder = {
      id: orderId,
      customerName: sanitizeString(orderData.customerName, 80),
      customerPhone: sanitizeString(orderData.customerPhone, 25),
      customerAddress: sanitizeString(orderData.customerAddress, 250),
      notes: sanitizeString(orderData.notes || '', 300),
      items: cart.map((ci) => ({
        id: ci.item.id,
        name: sanitizeString(ci.item.name, 100),
        price: ci.item.price,
        quantity: ci.quantity,
      })),
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      status: 'PENDING',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Immediate local optimistic update + real-time Firestore synchronization
    setOrders((prev) => [newOrder, ...prev]);
    createCustomerOrder(newOrder).catch((err) => {
      console.warn('[Firestore] Error persisting new order to Firestore:', err);
    });

    return orderId;
  };

  // Staff Authentication & View Switching
  const handleRequestSwitchView = (targetView: 'customer' | 'staff') => {
    if (targetView === 'staff') {
      navigate('/staff');
    } else {
      navigate('/');
    }
  };

  const handleStaffAuthSuccess = (user: StaffUser) => {
    setIsStaffAuthenticated(true);
    setStaffUser(user);
    try {
      sessionStorage.setItem('shan_staff_auth', 'true');
      sessionStorage.setItem('shan_staff_user', JSON.stringify(user));
    } catch {}
    setIsStaffModalOpen(false);
    setCurrentRoute('staff');
    setCurrentView('staff');
    if (typeof window !== 'undefined' && window.location.pathname !== '/staff') {
      window.history.pushState(null, '', '/staff');
    }
  };

  const handleStaffLogout = async () => {
    setIsStaffAuthenticated(false);
    setStaffUser(null);
    try {
      sessionStorage.removeItem('shan_staff_auth');
      sessionStorage.removeItem('shan_staff_user');
      await signOut(auth);
    } catch (e) {
      console.warn('[Auth] Sign out notice:', e);
    }
    navigate('/');
  };

  // Staff Menu Item Management (Synced to Firestore 'products' collection - Owner Only)
  const handleAddMenuItem = async (item: Omit<MenuItem, 'id'>): Promise<void> => {
    if (!staffUser?.isOwner) {
      throw new Error('Access Denied: Product creation requires Store Owner privileges.');
    }
    const newItem: MenuItem = {
      ...item,
      id: `shan-prod-${Date.now()}`,
    };
    setMenuItems((prev) => [newItem, ...prev]);
    try {
      await saveMenuItem(newItem);
    } catch (err) {
      console.warn('[Firestore] Error adding product to Firestore:', err);
      throw err;
    }
  };

  const handleToggleMenuItem = (id: string) => {
    if (!staffUser?.isOwner && !staffUser?.isAdmin) {
      return;
    }
    const targetItem = menuItems.find((i) => i.id === id);
    const nextAvailability = targetItem ? !targetItem.isAvailable : false;
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
      )
    );
    toggleMenuItemAvailability(id, nextAvailability).catch((err) => {
      console.warn('[Firestore] Error toggling availability in Firestore:', err);
    });
  };

  const handleDeleteMenuItem = async (id: string): Promise<void> => {
    if (!staffUser?.isOwner) {
      throw new Error('Access Denied: Product deletion requires Store Owner privileges.');
    }
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await deleteMenuItem(id);
    } catch (err) {
      console.warn('[Firestore] Notice during product deletion:', err);
    }
  };

  const handleEditMenuItem = async (id: string, updates: Partial<MenuItem>): Promise<void> => {
    if (!staffUser?.isOwner) {
      throw new Error('Access Denied: Product editing requires Store Owner privileges.');
    }
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    try {
      await editMenuItem(id, updates);
    } catch (err) {
      console.warn('[Firestore] Error editing product in Firestore:', err);
      throw err;
    }
  };

  // Staff Order Management (Real-time updates to Firestore 'orders' collection)
  const handleUpdateOrderStatus = (orderId: string, status: CustomerOrder['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    updateOrderStatus(orderId, status).catch((err) => {
      console.warn('[Firestore] Error updating order status in Firestore:', err);
    });
  };

  // Set Store Status directly (Synced to Firestore 'settings' and localStorage)
  const handleSetStoreStatus = (newStatus: StoreStatus) => {
    if (!staffUser?.isOwner && !staffUser?.isAdmin) {
      return;
    }
    setStoreStatus(newStatus);
    try {
      localStorage.setItem('shan_store_status', newStatus);
    } catch {}
    updateStoreSettings({ storeStatus: newStatus }).catch((err) => {
      console.warn('[Firestore] Error updating store status in Firestore:', err);
    });
  };

  // Staff Store Status Toggle (Cycles: ACCEPTING -> BUSY -> PAUSED -> ACCEPTING)
  const handleToggleStoreStatus = () => {
    if (!staffUser?.isOwner && !staffUser?.isAdmin) {
      return;
    }
    const nextStatus: StoreStatus =
      storeStatus === 'ACCEPTING' ? 'BUSY' : storeStatus === 'BUSY' ? 'PAUSED' : 'ACCEPTING';
    handleSetStoreStatus(nextStatus);
  };

  // Staff Hero Banner Update (Synced to Firestore 'settings' collection - Owner Only)
  const handleUpdateHeroImage = (newImage: string) => {
    if (!staffUser?.isOwner) {
      return;
    }
    setHeroImage(newImage);
    updateStoreSettings({ heroImage: newImage }).catch((err) => {
      console.warn('[Firestore] Error updating hero banner in Firestore:', err);
    });
  };

  // Staff Delivery Settings Update (Synced to Firestore 'settings' collection - Owner Only)
  const handleUpdateDeliverySettings = async (newSettings: DeliverySettings) => {
    if (!staffUser?.isOwner) {
      throw new Error('Access Denied: Delivery configuration requires Store Owner privileges.');
    }
    setDeliverySettings(newSettings);
    try {
      localStorage.setItem('shan_delivery_settings', JSON.stringify(newSettings));
    } catch {}
    try {
      await updateStoreSettings({ deliverySettings: newSettings });
    } catch (err) {
      console.warn('[Firestore] Error updating delivery settings in Firestore:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5EFEB] text-[#2B1810] selection:bg-[#DE8030] selection:text-[#2B1810]">
      {/* Top Navbar with Enhanced Route Navigation */}
      <Navbar
        currentView={
          currentRoute === 'not-found'
            ? 'not-found'
            : isStaffAuthenticated && staffUser && currentView === 'staff'
            ? 'staff'
            : 'customer'
        }
        onSwitchView={handleRequestSwitchView}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenStory={() => navigate('/our-story')}
        onOpenContact={() => navigate('/contact')}
        onScrollToMenu={scrollToMenu}
        onNavigate={navigate}
      />

      {/* Main View Router with Strict Protected Route Guard */}
      <main className="flex-grow">
        {currentRoute === 'not-found' ? (
          /* Branded 404 Not Found Page */
          <NotFoundPage
            onGoHome={() => navigate('/')}
            onGoMenu={() => navigate('/menu')}
            onOpenStory={() => navigate('/our-story')}
            onOpenContact={() => navigate('/contact')}
            attemptedPath={attemptedPath}
          />
        ) : isProtectedDashboardPath(attemptedPath) || currentRoute === 'staff' || currentView === 'staff' ? (
          /* Strict Protected Route Guard: /admin, /staff, /dashboard */
          isAuthChecking ? (
            <ProtectedAuthGuard
              attemptedPath={attemptedPath}
              isAuthChecking={true}
              onSuccess={handleStaffAuthSuccess}
              onGoHome={() => navigate('/')}
            />
          ) : isStaffAuthenticated && staffUser && auth.currentUser && auth.currentUser.emailVerified ? (
            /* Verified Staff & Admin Management Dashboard */
            <StaffDashboard
              menuItems={menuItems}
              categories={categories}
              categoryDetails={categoryDetails}
              onUpdateCategories={handleUpdateCategories}
              onSaveCategoryWithBanner={handleSaveCategoryWithBanner}
              onDeleteCategory={handleDeleteCategory}
              deliverySettings={deliverySettings}
              onUpdateDeliverySettings={handleUpdateDeliverySettings}
              onAddMenuItem={handleAddMenuItem}
              onEditMenuItem={handleEditMenuItem}
              onToggleMenuItem={handleToggleMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
              orders={orders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              storeStatus={storeStatus}
              onToggleStoreStatus={handleToggleStoreStatus}
              onSetStoreStatus={handleSetStoreStatus}
              heroImage={heroImage}
              onUpdateHeroImage={handleUpdateHeroImage}
              isOwner={Boolean(staffUser?.isOwner)}
              isAdmin={Boolean(staffUser?.isAdmin)}
              staffUser={staffUser || undefined}
              onLogout={handleStaffLogout}
            />
          ) : (
            /* Unauthorized Access Blocked: Enforce Login Screen */
            <ProtectedAuthGuard
              attemptedPath={attemptedPath}
              isAuthChecking={false}
              onSuccess={handleStaffAuthSuccess}
              onGoHome={() => navigate('/')}
            />
          )
        ) : (
          <>
            {/* Customer Storefront: Hero Section */}
            <Hero
              heroImage={heroImage}
              onOrderOnline={() => navigate('/menu')}
              onExploreSignature={() => navigate('/menu')}
            />

            {/* Customer Storefront: Menu Section with Filters & Search */}
            <MenuSection
              items={menuItems}
              categories={categories}
              categoryDetails={categoryDetails}
              onAddToCart={handleAddToCart}
              isLoading={isLoadingMenu}
            />
          </>
        )}
      </main>

      {/* Footer with Semantic Internal Linking */}
      <Footer
        onOpenStory={() => navigate('/our-story')}
        onOpenContact={() => navigate('/contact')}
        onOpenStaff={() => navigate('/staff')}
        onScrollToMenu={() => navigate('/menu')}
        onNavigate={navigate}
      />

      {/* Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        deliverySettings={deliverySettings}
        storeStatus={storeStatus}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onBackToCart={() => {
          setIsCheckoutOpen(false);
          setIsCartOpen(true);
        }}
        cart={cart}
        deliverySettings={deliverySettings}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
      />

      <StoryModal
        isOpen={isStoryModalOpen}
        onClose={() => {
          setIsStoryModalOpen(false);
          if (currentRoute === 'story') {
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
            setCurrentRoute('home');
          }
        }}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          if (currentRoute === 'contact') {
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
            setCurrentRoute('home');
          }
        }}
      />

      <StaffAccessModal
        isOpen={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false);
          if (currentRoute === 'staff' && !isStaffAuthenticated) {
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
            setCurrentRoute('home');
          }
        }}
        onSuccess={handleStaffAuthSuccess}
      />
    </div>
  );
}
