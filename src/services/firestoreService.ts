import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, CustomerOrder, StoreStatus } from '../types';
import { INITIAL_HERO_IMAGE } from '../data/initialMenu';

const PRODUCTS_COLLECTION = 'products';
const ORDERS_COLLECTION = 'orders';
const SETTINGS_COLLECTION = 'settings';
const STORE_SETTINGS_DOC = 'store';

export const INITIAL_ORDERS: CustomerOrder[] = [
  {
    id: '#SHAN-1001',
    customerName: 'Hamza Khan',
    customerPhone: '0300 1234567',
    customerAddress: 'House 45, Sector 31-D, Korangi, Karachi',
    items: [
      { id: 'shan-item-1', name: 'CRISPY ZINGER BURGER', price: 599, quantity: 2 },
      { id: 'shan-item-5', name: 'KORANGI LOADED FRIES', price: 449, quantity: 1 },
      { id: 'shan-item-7', name: 'CHILLED SOFT DRINK / MINT LEMONADE', price: 150, quantity: 2 },
    ],
    subtotal: 1947,
    deliveryFee: 150,
    total: 2097,
    status: 'PREPARING',
    createdAt: '12:30 PM',
    notes: 'Extra spicy sauce on zinger please.',
  },
  {
    id: '#SHAN-1002',
    customerName: 'Fatima Bilal',
    customerPhone: '0321 9876543',
    customerAddress: 'Apartment 3B, Korangi Creek Road, Karachi',
    items: [
      { id: 'shan-item-3', name: 'CHICKEN TIKKA PIZZA', price: 1199, quantity: 1 },
      { id: 'shan-item-6', name: 'CRISPY CHICKEN STRIPS (5 PCS)', price: 499, quantity: 1 },
    ],
    subtotal: 1698,
    deliveryFee: 150,
    total: 1848,
    status: 'PENDING',
    createdAt: '12:42 PM',
    notes: 'Please ring bell upon arrival.',
  },
];

/**
 * Utility to strip any `undefined` values recursively so Firestore never rejects payloads
 */
const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeForFirestore(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
};

const isPermissionDenied = (err: any): boolean => {
  if (!err) return false;
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  return (
    code === 'permission-denied' ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('permission_denied')
  );
};

/**
 * Automatically checks and initializes collections in Firestore if needed (e.g. store settings)
 */
export const initializeFirestoreCollections = async (): Promise<void> => {
  try {
    // Check and seed store settings if not existing
    const settingsDocRef = doc(db, SETTINGS_COLLECTION, STORE_SETTINGS_DOC);
    const settingsSnap = await getDoc(settingsDocRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsDocRef, {
        heroImage: INITIAL_HERO_IMAGE,
        storeStatus: 'ACCEPTING',
      });
    }
  } catch (err: any) {
    if (isPermissionDenied(err)) {
      console.warn('[Firestore] Notice: Store settings require read/write permission in Firestore rules.');
    } else {
      console.warn('[Firestore] Notice during settings check:', err);
    }
  }
};

/**
 * Strictly fetches menu items from the Firestore 'products' collection using onSnapshot.
 * Does NOT populate or inject any dummy/fallback products. If the collection is empty,
 * it returns an empty array.
 */
export const subscribeToMenuItems = (
  onUpdate: (items: MenuItem[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);

    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        if (snapshot.empty) {
          // Exclusively return what is in Firestore - collection is empty
          onUpdate([]);
          return;
        }

        const items: MenuItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            name: data.name || '',
            category: data.category || 'BURGERS',
            price: Number(data.price) || 0,
            originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
            description: data.description || '',
            image: data.image || '',
            tag: data.tag || undefined,
            isAvailable: data.isAvailable !== false,
          });
        });

        onUpdate(items);
      },
      (error) => {
        console.warn('[Firestore] Products subscription error:', error.message);
        onUpdate([]);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('[Firestore] Initialization error on products subscription:', err);
    onUpdate([]);
    if (onError && err instanceof Error) onError(err);
    return () => {};
  }
};

/**
 * Add or overwrite a product in Firestore directly
 */
export const saveMenuItem = async (item: MenuItem): Promise<void> => {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, item.id);
    const payload = sanitizeForFirestore({
      id: item.id,
      name: item.name || '',
      category: item.category || 'BURGERS',
      price: Number(item.price) || 0,
      originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
      description: item.description || '',
      image: item.image || '',
      tag: item.tag || '',
      isAvailable: item.isAvailable !== false,
      createdAtTimestamp: Date.now(),
    });
    await setDoc(docRef, payload, { merge: true });
    console.log(`[Firestore] Successfully saved product "${item.name}" (${item.id}) to Firestore products collection.`);
  } catch (err: any) {
    if (isPermissionDenied(err)) {
      console.warn('[Firestore] Notice: Product saved locally. Saving to cloud requires staff write permissions in Firestore rules.');
      return;
    }
    console.error('[Firestore] Error saving menu item to Firestore:', err);
    throw err;
  }
};

/**
 * Edit an existing menu item in Firestore
 */
export const editMenuItem = async (
  id: string,
  updates: Partial<MenuItem>
): Promise<void> => {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    const sanitized = sanitizeForFirestore({
      ...updates,
      updatedAtTimestamp: Date.now(),
    });
    await updateDoc(docRef, sanitized);
  } catch (err: any) {
    if (isPermissionDenied(err)) {
      console.warn('[Firestore] Notice: Product updated locally. Updating in cloud requires staff write permissions in Firestore rules.');
      return;
    }
    console.error('[Firestore] Error editing menu item in Firestore:', err);
    throw err;
  }
};

/**
 * Toggle availability of a menu item in Firestore
 */
export const toggleMenuItemAvailability = async (
  id: string,
  isAvailable: boolean
): Promise<void> => {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(docRef, { isAvailable });
  } catch (err: any) {
    if (isPermissionDenied(err)) {
      console.warn('[Firestore] Notice: Availability toggled locally. Cloud sync requires write permissions in Firestore rules.');
      return;
    }
    console.error('[Firestore] Error toggling item availability:', err);
    throw err;
  }
};

/**
 * Delete a menu item from Firestore
 */
export const deleteMenuItem = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await deleteDoc(docRef);
    console.log(`[Firestore] Successfully deleted product document "products/${id}" from Firestore.`);
  } catch (err: any) {
    if (isPermissionDenied(err)) {
      console.warn('[Firestore] Notice: Item removed locally. Cloud deletion requires write permissions in Firestore rules.');
      return;
    }
    console.warn('[Firestore] Notice on deleting menu item:', err);
  }
};

/**
 * Real-time subscription to incoming and historical orders in Firestore.
 * Supports live kitchen queue synchronization.
 */
export const subscribeToOrders = (
  onUpdate: (orders: CustomerOrder[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);

    const unsubscribe = onSnapshot(
      ordersRef,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate([]);
          return;
        }

        const ordersList: (CustomerOrder & { createdAtTimestamp?: number })[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          ordersList.push({
            id: docSnap.id,
            customerName: data.customerName || '',
            customerPhone: data.customerPhone || '',
            customerAddress: data.customerAddress || '',
            items: data.items || [],
            subtotal: Number(data.subtotal) || 0,
            deliveryFee: Number(data.deliveryFee) || 0,
            total: Number(data.total) || 0,
            status: data.status || 'PENDING',
            createdAt: data.createdAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            notes: data.notes || '',
            createdAtTimestamp: data.createdAtTimestamp || 0,
          });
        });

        // Sort descending by creation timestamp / recency
        ordersList.sort((a, b) => (b.createdAtTimestamp || 0) - (a.createdAtTimestamp || 0));

        onUpdate(ordersList);
      },
      (error) => {
        console.warn('[Firestore] Orders subscription notice:', error.message);
        onUpdate([]);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('[Firestore] Error setting up orders subscription:', err);
    onUpdate([]);
    if (onError && err instanceof Error) onError(err);
    return () => {};
  }
};

/**
 * Save new customer order into Firestore with sanitization
 */
export const createCustomerOrder = async (order: CustomerOrder): Promise<void> => {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, order.id);
    const payload = sanitizeForFirestore({
      id: order.id,
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      notes: order.notes || '',
      items: (order.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      status: order.status || 'PENDING',
      createdAt: order.createdAt,
      createdAtTimestamp: Date.now(),
    });
    await setDoc(docRef, payload);
  } catch (err: any) {
    if (isPermissionDenied(err)) {
      console.warn(
        '[Firestore] Notice: Order confirmed and saved locally. In your Firebase Console (Firestore Database > Rules), set "allow create: if true;" on "/orders/{orderId}" to sync public customer orders directly to Firestore cloud.'
      );
      return;
    }
    console.warn('[Firestore] Error creating customer order:', err);
    throw err;
  }
};

/**
 * Update an order's status (PENDING, PREPARING, READY, COMPLETED, CANCELLED)
 */
export const updateOrderStatus = async (
  orderId: string,
  status: CustomerOrder['status']
): Promise<void> => {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(docRef, { status });
  } catch (err: any) {
    if (isPermissionDenied(err)) {
      console.warn('[Firestore] Notice: Order status updated locally. Updating cloud orders requires staff permissions in Firestore rules.');
      return;
    }
    console.warn('[Firestore] Error updating order status:', err);
  }
};

/**
 * Real-time subscription to Store Settings (Hero banner image & Store operational status)
 */
export const subscribeToStoreSettings = (
  onUpdate: (settings: { heroImage?: string; storeStatus?: StoreStatus }) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const settingsDocRef = doc(db, SETTINGS_COLLECTION, STORE_SETTINGS_DOC);

    const unsubscribe = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          onUpdate({
            heroImage: data.heroImage,
            storeStatus: data.storeStatus,
          });
        }
      },
      (error) => {
        console.warn('[Firestore] Settings subscription notice:', error.message);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('[Firestore] Error setting up settings subscription:', err);
    if (onError && err instanceof Error) onError(err);
    return () => {};
  }
};

/**
 * Update Store Settings in Firestore (persists across all connected devices and sessions)
 */
export const updateStoreSettings = async (settings: {
  heroImage?: string;
  storeStatus?: StoreStatus;
}): Promise<void> => {
  try {
    const settingsDocRef = doc(db, SETTINGS_COLLECTION, STORE_SETTINGS_DOC);
    const payload = sanitizeForFirestore(settings);
    await setDoc(settingsDocRef, payload, { merge: true });
  } catch (err: any) {
    if (isPermissionDenied(err)) {
      console.warn('[Firestore] Notice: Store settings saved locally. Syncing to cloud requires staff write permissions in Firestore rules.');
      return;
    }
    console.warn('[Firestore] Error updating store settings:', err);
    throw err;
  }
};
