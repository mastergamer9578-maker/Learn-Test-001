import { useState, useEffect } from 'react';
import { signOut, applyActionCode } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { MenuItem, CartItem, CustomerOrder, StoreStatus, DeliverySettings, DEFAULT_DELIVERY_SETTINGS, StaffUser } from './types';
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
import { Footer } from './components/Footer';
import {
  subscribeToMenuItems,
  saveMenuItem,
  editMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
  subscribeToCategories,
  saveCategories,
  subscribeToOrders,
  createCustomerOrder,
  updateOrderStatus,
  subscribeToStoreSettings,
  updateStoreSettings,
  initializeFirestoreCollections,
} from './services/firestoreService';

export default function App() {
  // Storefront & Staff View State
  const [currentView, setCurrentView] = useState<'customer' | 'staff'>('customer');
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('shan_staff_auth') === 'true';
  });
  const [staffUser, setStaffUser] = useState<StaffUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('shan_staff_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

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

  // Shared Categories State (Real-time Firestore collection sync + product category derivation)
  const [categories, setCategories] = useState<string[]>(() => {
    const DEFAULT_CATEGORIES = ['BURGERS', 'PIZZAS', 'FAST FOOD', 'DEALS', 'DRINKS'];
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

  // Real-time Firestore subscriber for 'categories' collection
  useEffect(() => {
    const unsubscribe = subscribeToCategories(
      (liveCategories) => {
        if (liveCategories && liveCategories.length > 0) {
          setCategories((prev) => Array.from(new Set([...liveCategories, ...prev])));
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

  // Initialize store settings and collections in background
  useEffect(() => {
    initializeFirestoreCollections().catch((err) => {
      console.warn('[Firestore] Initialization check note:', err);
    });
  }, []);

  // 1. Live real-time Firestore listener for products ('products' collection)
  useEffect(() => {
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
      if (firebaseUser) {
        if (!firebaseUser.emailVerified) {
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
              setStaffUser(authenticatedUser);
              sessionStorage.setItem('shan_staff_user', JSON.stringify(authenticatedUser));
            }
          }
        } catch (err) {
          console.warn('[App] Firestore user role sync notice:', err);
        }
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
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerAddress: orderData.customerAddress,
      notes: orderData.notes || '',
      items: cart.map((ci) => ({
        id: ci.item.id,
        name: ci.item.name,
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
      if (isStaffAuthenticated) {
        // Double check email verification if logged in with Firebase Auth
        if (auth.currentUser && !auth.currentUser.emailVerified) {
          setIsStaffModalOpen(true);
          return;
        }
        setCurrentView('staff');
      } else {
        setIsStaffModalOpen(true);
      }
    } else {
      setCurrentView('customer');
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
    setCurrentView('staff');
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
    setCurrentView('customer');
  };

  // Staff Menu Item Management (Synced to Firestore 'products' collection)
  const handleAddMenuItem = async (item: Omit<MenuItem, 'id'>): Promise<void> => {
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
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await deleteMenuItem(id);
    } catch (err) {
      console.warn('[Firestore] Notice during product deletion:', err);
    }
  };

  const handleEditMenuItem = (id: string, updates: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    editMenuItem(id, updates).catch((err) => {
      console.warn('[Firestore] Error editing product in Firestore:', err);
    });
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
    const nextStatus: StoreStatus =
      storeStatus === 'ACCEPTING' ? 'BUSY' : storeStatus === 'BUSY' ? 'PAUSED' : 'ACCEPTING';
    handleSetStoreStatus(nextStatus);
  };

  // Staff Hero Banner Update (Synced to Firestore 'settings' collection)
  const handleUpdateHeroImage = (newImage: string) => {
    setHeroImage(newImage);
    updateStoreSettings({ heroImage: newImage }).catch((err) => {
      console.warn('[Firestore] Error updating hero banner in Firestore:', err);
    });
  };

  // Staff Delivery Settings Update (Synced to Firestore 'settings' collection and localStorage)
  const handleUpdateDeliverySettings = async (newSettings: DeliverySettings) => {
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

  const scrollToMenu = () => {
    const menuEl = document.getElementById('menu-section');
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5EFEB] text-[#2B1810] selection:bg-[#DE8030] selection:text-[#2B1810]">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onSwitchView={handleRequestSwitchView}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenStory={() => setIsStoryModalOpen(true)}
        onOpenContact={() => setIsContactModalOpen(true)}
        onScrollToMenu={scrollToMenu}
      />

      {/* Main View Router */}
      <main className="flex-grow">
        {currentView === 'customer' ? (
          <>
            {/* Customer Storefront: Hero Section */}
            <Hero
              heroImage={heroImage}
              onOrderOnline={scrollToMenu}
              onExploreSignature={scrollToMenu}
            />

            {/* Customer Storefront: Menu Section with Filters & Search */}
            <MenuSection
              items={menuItems}
              categories={categories}
              onAddToCart={handleAddToCart}
              isLoading={isLoadingMenu}
            />
          </>
        ) : (
          /* Staff Management Dashboard */
          <StaffDashboard
            menuItems={menuItems}
            categories={categories}
            onUpdateCategories={handleUpdateCategories}
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
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenStory={() => setIsStoryModalOpen(true)}
        onOpenContact={() => setIsContactModalOpen(true)}
        onOpenStaff={() => handleRequestSwitchView('staff')}
        onScrollToMenu={scrollToMenu}
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
        onClose={() => setIsStoryModalOpen(false)}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      <StaffAccessModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSuccess={handleStaffAuthSuccess}
      />
    </div>
  );
}
