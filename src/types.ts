export interface MenuItem {
  id: string;
  name: string;
  category: 'BURGERS' | 'PIZZAS' | 'FAST FOOD' | 'DEALS';
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
