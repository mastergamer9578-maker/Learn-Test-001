import { useState, useEffect } from 'react';
import { MenuItem, CartItem, CustomerOrder, StoreStatus } from './types';
import { INITIAL_MENU_ITEMS, INITIAL_HERO_IMAGE } from './data/initialMenu';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MenuSection } from './components/MenuSection';
import { CartDrawer } from './components/CartDrawer';
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

  // Modals State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Menu Items State (Strictly loaded from Firestore 'products' collection)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);

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

  // Clear any legacy cached dummy products on mount and initialize settings
  useEffect(() => {
    localStorage.removeItem('shan_menu_items');
    initializeFirestoreCollections().catch((err) => {
      console.warn('[Firestore] Initialization check note:', err);
    });
  }, []);

  // 1. Strictly fetch menu items from Firestore 'products' collection via onSnapshot
  useEffect(() => {
    const unsubscribe = subscribeToMenuItems(
      (items) => {
        setMenuItems(items);
        setIsLoadingMenu(false);
      },
      (err) => {
        console.warn('[Firestore] Error fetching products:', err);
        setIsLoadingMenu(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore synchronization for Kitchen Queue & Orders
  useEffect(() => {
    const unsubscribe = subscribeToOrders((liveOrders) => {
      setOrders(liveOrders);
    });
    return () => unsubscribe();
  }, []);

  // 3. Real-time Firestore synchronization for Store Settings (Banner & Status)
  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((settings) => {
      if (settings.heroImage) setHeroImage(settings.heroImage);
      if (settings.storeStatus) setStoreStatus(settings.storeStatus);
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
    const deliveryFee = subtotal > 1500 ? 0 : 120;
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
        setCurrentView('staff');
      } else {
        setIsStaffModalOpen(true);
      }
    } else {
      setCurrentView('customer');
    }
  };

  const handleStaffAuthSuccess = () => {
    setIsStaffAuthenticated(true);
    sessionStorage.setItem('shan_staff_auth', 'true');
    setIsStaffModalOpen(false);
    setCurrentView('staff');
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

  // Staff Store Status Toggle (Synced to Firestore 'settings' collection)
  const handleToggleStoreStatus = () => {
    const nextStatus: StoreStatus =
      storeStatus === 'ACCEPTING' ? 'BUSY' : storeStatus === 'BUSY' ? 'PAUSED' : 'ACCEPTING';
    setStoreStatus(nextStatus);
    updateStoreSettings({ storeStatus: nextStatus }).catch((err) => {
      console.warn('[Firestore] Error updating store status in Firestore:', err);
    });
  };

  // Staff Hero Banner Update (Synced to Firestore 'settings' collection)
  const handleUpdateHeroImage = (newImage: string) => {
    setHeroImage(newImage);
    updateStoreSettings({ heroImage: newImage }).catch((err) => {
      console.warn('[Firestore] Error updating hero banner in Firestore:', err);
    });
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
              onAddToCart={handleAddToCart}
              isLoading={isLoadingMenu}
            />
          </>
        ) : (
          /* Staff Management Dashboard */
          <StaffDashboard
            menuItems={menuItems}
            onAddMenuItem={handleAddMenuItem}
            onEditMenuItem={handleEditMenuItem}
            onToggleMenuItem={handleToggleMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            storeStatus={storeStatus}
            onToggleStoreStatus={handleToggleStoreStatus}
            heroImage={heroImage}
            onUpdateHeroImage={handleUpdateHeroImage}
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
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
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
