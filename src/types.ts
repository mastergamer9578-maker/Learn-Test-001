export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  tag?: string;
  isAvailable: boolean;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface CustomerOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
}

export type StoreStatus = 'ACCEPTING' | 'BUSY' | 'PAUSED';

export interface DeliverySettings {
  standardFee: number;
  freeDeliveryThreshold: number;
  deliveryZone: string;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  standardFee: 120,
  freeDeliveryThreshold: 1500,
  deliveryZone: 'Korangi',
};

export interface StaffUser {
  uid?: string;
  email?: string;
  name?: string;
  role?: 'owner' | 'admin' | 'staff';
  isAdmin: boolean;
  isOwner: boolean;
}

export interface CategoryDetail {
  id: string;
  name: string;
  bannerImage?: string;
  tagline?: string;
  updatedAt?: number;
}

