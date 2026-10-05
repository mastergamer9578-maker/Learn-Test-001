import React, { useState, useRef } from 'react';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  Package,
  TrendingUp,
  UtensilsCrossed,
  Image as ImageIcon,
  Save,
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
  Loader2
} from 'lucide-react';
import { MenuItem, CustomerOrder, StoreStatus } from '../types';
import { INITIAL_HERO_IMAGE } from '../data/initialMenu';

// Helper to convert and compress uploaded files into clean Base64 data URLs
const readFileAsBase64 = (
  file: File,
  maxWidth = 1200,
  maxHeight = 900,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
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

interface StaffDashboardProps {
  menuItems: MenuItem[];
  onAddMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void> | void;
  onEditMenuItem?: (id: string, updates: Partial<MenuItem>) => Promise<void> | void;
  onToggleMenuItem: (id: string) => void;
  onDeleteMenuItem: (id: string) => Promise<void> | void;
  orders: CustomerOrder[];
  onUpdateOrderStatus: (orderId: string, status: CustomerOrder['status']) => void;
  storeStatus: StoreStatus;
  onToggleStoreStatus: () => void;
  heroImage: string;
  onUpdateHeroImage: (url: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  menuItems,
  onAddMenuItem,
  onEditMenuItem,
  onToggleMenuItem,
  onDeleteMenuItem,
  orders,
  onUpdateOrderStatus,
  storeStatus,
  onToggleStoreStatus,
  heroImage,
  onUpdateHeroImage,
}) => {
  // Hero Image Editor State with Local File Upload
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [bannerFileName, setBannerFileName] = useState<string>('');
  const [isBannerProcessing, setIsBannerProcessing] = useState(false);
  const [heroSavedFeedback, setHeroSavedFeedback] = useState(false);

  // New Product Form State with Local File Upload
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<MenuItem['category']>('BURGERS');
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

  // Edit Product Modal State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<MenuItem['category']>('BURGERS');
  const [editPrice, setEditPrice] = useState('');
  const [editOriginalPrice, setEditOriginalPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete Product State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteProduct = async (productId: string) => {
    // 1. Confirmation popup before proceeding
    const isConfirmed = window.confirm("Are you sure you want to delete this product?");
    if (!isConfirmed) return;

    // 2. Log exact ID and auth state
    console.log("Deleting Product ID:", productId, "Current User:", auth.currentUser?.uid);

    try {
      setDeletingId(productId);
      // 3. Execute deleteDoc on Firestore products collection
      await deleteDoc(doc(db, "products", productId));
      console.log(`[Firestore] Successfully deleted product document "products/${productId}"`);
    } catch (error: any) {
      console.error("Error deleting product:", error);
      alert(error.message);
    } finally {
      // 4. Update the UI state immediately without requiring a page refresh
      if (onDeleteMenuItem) {
        onDeleteMenuItem(productId);
      }
      setDeletingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    // 1. Confirmation popup before proceeding
    const isConfirmed = window.confirm("Are you sure you want to cancel this order?");
    if (!isConfirmed) return;

    // 2. Log exact ID and auth state
    console.log("Cancelling Order ID:", orderId, "Current User:", auth.currentUser?.uid);

    try {
      // 3. Execute updateDoc on Firestore orders collection with unique orderId
      await updateDoc(doc(db, "orders", orderId), { status: "CANCELLED" });
      console.log(`[Firestore] Successfully cancelled order "orders/${orderId}"`);
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      alert(error.message);
    } finally {
      // 4. Update the UI state immediately to remove from live kitchen queue
      onUpdateOrderStatus(orderId, 'CANCELLED');
    }
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditPrice(String(item.price));
    setEditOriginalPrice(item.originalPrice ? String(item.originalPrice) : '');
    setEditDescription(item.description);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const origPriceNum = editOriginalPrice ? parseFloat(editOriginalPrice) : undefined;

    if (onEditMenuItem) {
      onEditMenuItem(editingItem.id, {
        name: editName.trim().toUpperCase(),
        category: editCategory,
        price: priceNum,
        originalPrice: origPriceNum && origPriceNum > priceNum ? origPriceNum : undefined,
        description: editDescription.trim(),
      });
    }
    setEditingItem(null);
  };

  // Derived metrics
  const openOrders = orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  const completedRevenue = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + o.total, 0);
  const liveProductsCount = menuItems.filter((m) => m.isAvailable).length;

  // Time based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? 'GOOD MORNING, SHAN TEAM.'
      : hour < 18
      ? 'GOOD AFTERNOON, SHAN TEAM.'
      : 'GOOD EVENING, SHAN TEAM.';

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
      console.error('Failed to read image file:', err);
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

  // Handle Local Device File Upload for New Product
  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProductImageProcessing(true);
      setProductErrorMessage(null);
      // Fast compression for Firestore document size safety
      const base64 = await readFileAsBase64(file, 650, 480, 0.75);
      setProductImageBase64(base64);
      setProductImageFileName(file.name);
    } catch (err) {
      console.error('Failed to read product image file:', err);
      setProductErrorMessage('Could not process the selected image file. Please try a different photo.');
    } finally {
      setIsProductImageProcessing(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice || !newItemDescription.trim()) {
      setProductErrorMessage('Please fill in all required fields (Name, Price, Description).');
      return;
    }

    const priceNum = parseFloat(newItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setProductErrorMessage('Please enter a valid price in PKR (greater than 0).');
      return;
    }

    setIsSubmittingProduct(true);
    setProductErrorMessage(null);
    setProductSuccessMessage(null);

    const defaultImages: Record<MenuItem['category'], string> = {
      BURGERS: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      PIZZAS: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      'FAST FOOD': 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80',
      DEALS: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
    };

    const addedTitle = newItemName.trim().toUpperCase();
    const origPriceNum = newItemOriginalPrice ? parseFloat(newItemOriginalPrice) : undefined;

    try {
      await onAddMenuItem({
        name: addedTitle,
        category: newItemCategory,
        price: priceNum,
        originalPrice: origPriceNum && origPriceNum > priceNum ? origPriceNum : undefined,
        description: newItemDescription.trim(),
        image: productImageBase64 || defaultImages[newItemCategory],
        tag: 'NEW ARRIVAL',
        isAvailable: true,
      });

      // Clear input fields on successful write
      setNewItemName('');
      setNewItemPrice('');
      setNewItemOriginalPrice('');
      setNewItemDescription('');
      setProductImageBase64('');
      setProductImageFileName('');
      if (productFileInputRef.current) productFileInputRef.current.value = '';

      setProductSavedFeedback(true);
      setProductSuccessMessage(`✓ "${addedTitle}" successfully saved directly to Firestore 'products' and is now live on the storefront!`);
      setTimeout(() => {
        setProductSavedFeedback(false);
        setProductSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('[StaffDashboard] Error adding product to Firestore:', err);
      setProductErrorMessage(
        err?.message || 'Failed to save product to Firestore. Please check your network and Firestore rules.'
      );
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-300">
      
      {/* Top Banner / Greeting and Store Status matching Screenshot 7 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
            <span>LIVE OPERATIONS</span>
          </div>
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-[#2B1810] tracking-tight uppercase leading-none">
            {greeting}
          </h1>
          <p className="font-mono-code text-xs sm:text-sm text-[#2B1810]/75 mt-2 max-w-xl">
            Keep the kitchen moving. New customer orders appear here instantly.
          </p>
        </div>

        {/* Store Status Toggle Widget */}
        <div className="bg-[#2B1810] text-[#F5EFEB] rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-6 shadow-xl shrink-0 border border-[#2B1810]/20">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#DE8030] text-[#2B1810] flex items-center justify-center">
              <Store className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-[10px] font-mono-code tracking-[0.2em] uppercase text-[#F5EFEB]/60">
                STORE STATUS
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
                <span>
                  {storeStatus === 'ACCEPTING'
                    ? 'Accepting orders'
                    : storeStatus === 'BUSY'
                    ? 'High volume (Busy)'
                    : 'Paused / Closed'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onToggleStoreStatus}
            className="px-3.5 py-1.5 rounded-full border border-[#F5EFEB]/20 text-[11px] font-mono-code uppercase hover:bg-white/10 transition active:scale-95 cursor-pointer text-[#F5EFEB]"
            title="Click to cycle status"
          >
            Change
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards (3 columns) matching Screenshot 7 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
        {/* Metric 1: Open Orders */}
        <div className="bg-[#ECE4D8]/80 border border-[#2B1810]/15 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-mono-code font-bold tracking-wider text-[#2B1810]/70 uppercase">
            <Package className="w-4 h-4 text-[#DE8030]" />
            <span>OPEN ORDERS</span>
          </div>
          <div className="font-display font-black text-5xl sm:text-6xl text-[#2B1810] mt-4">
            {openOrders.length}
          </div>
        </div>

        {/* Metric 2: Completed Revenue */}
        <div className="bg-[#ECE4D8]/80 border border-[#2B1810]/15 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-mono-code font-bold tracking-wider text-[#2B1810]/70 uppercase">
            <TrendingUp className="w-4 h-4 text-[#2E7D32]" />
            <span>COMPLETED REVENUE</span>
          </div>
          <div className="font-display font-black text-4xl sm:text-5xl text-[#2B1810] mt-4 truncate">
            PKR {completedRevenue.toLocaleString()}
          </div>
        </div>

        {/* Metric 3: Live Products */}
        <div className="bg-[#ECE4D8]/80 border border-[#2B1810]/15 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-mono-code font-bold tracking-wider text-[#2B1810]/70 uppercase">
            <UtensilsCrossed className="w-4 h-4 text-[#C46726]" />
            <span>LIVE PRODUCTS</span>
          </div>
          <div className="font-display font-black text-5xl sm:text-6xl text-[#2B1810] mt-4">
            {liveProductsCount}
          </div>
        </div>
      </div>

      {/* Homepage Spotlight / Hero Image Editor Card matching Screenshot 8 */}
      <div className="bg-[#ECE4D8]/80 border border-[#2B1810]/15 rounded-3xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#DE8030] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <ImageIcon className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase">
                HOMEPAGE SPOTLIGHT
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase tracking-tight">
                HERO IMAGE
              </h2>
              <p className="font-mono-code text-xs text-[#2B1810]/70 mt-1">
                Change the featured banner customers see at the top of the storefront.
              </p>
            </div>
          </div>

          {/* Current Banner Preview Thumbnail */}
          <div className="shrink-0 flex items-center gap-3">
            <div className="w-24 sm:w-32 h-16 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#2B1810]/20 bg-[#E2D8C9] shadow-inner">
              <img
                src={heroImage}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Hidden File Input for Banner */}
        <input
          type="file"
          ref={bannerFileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleBannerFileUpload}
        />

        {/* Device File Upload & Action Controls */}
        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#2B1810]/10">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => bannerFileInputRef.current?.click()}
              disabled={isBannerProcessing}
              className="px-6 py-3 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code text-xs uppercase font-bold tracking-wider hover:bg-[#3E241A] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-[#DE8030]" />
              <span>{isBannerProcessing ? 'PROCESSING FILE...' : 'UPLOAD IMAGE FROM DEVICE'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaultBanner}
              className="px-4 py-3 rounded-full bg-[#ECE4D8] border border-[#2B1810]/20 hover:bg-[#E2D8C9] text-[#2B1810] font-mono-code text-xs font-semibold uppercase flex items-center gap-1.5 transition cursor-pointer"
              title="Revert back to original wooden platter photo"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C46726]" />
              <span>Reset to Default</span>
            </button>
          </div>

          {/* Feedback & File Name Status */}
          <div className="flex items-center gap-2 text-xs font-mono-code">
            {heroSavedFeedback ? (
              <span className="text-[#2E7D32] font-bold flex items-center gap-1.5 bg-[#2E7D32]/10 px-3 py-1.5 rounded-full">
                <Check className="w-4 h-4" />
                <span>Banner Saved to Storefront!</span>
              </span>
            ) : bannerFileName ? (
              <span className="text-[#2B1810]/70 truncate max-w-xs bg-[#F5EFEB] px-3 py-1.5 rounded-full border border-[#2B1810]/15">
                📁 {bannerFileName}
              </span>
            ) : (
              <span className="text-[11px] text-[#2B1810]/50 italic">
                Device images save directly to browser storage
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Split Layout: Kitchen Queue (Left) & Menu Control (Right) matching Screenshot 8 & 9 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Kitchen Queue */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                KITCHEN QUEUE
              </div>
              <h3 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] uppercase tracking-tight">
                INCOMING ORDERS
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-[#DE8030] text-[#2B1810] font-mono-code font-bold text-xs px-3 py-1 rounded-full uppercase">
                {openOrders.length} TOTAL
              </span>
            </div>
          </div>

          {/* Kitchen Orders Display */}
          {openOrders.length === 0 ? (
            /* Kitchen is Clear empty state matching Screenshot 8 & 9 */
            <div className="bg-[#ECE4D8]/60 border border-dashed border-[#2B1810]/20 rounded-3xl p-10 sm:p-14 text-center flex flex-col items-center justify-center min-h-[340px]">
              <div className="w-14 h-14 rounded-2xl bg-[#DE8030]/15 text-[#DE8030] flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 stroke-[1.8]" />
              </div>
              <h4 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase tracking-tight">
                KITCHEN IS CLEAR
              </h4>
              <p className="font-mono-code text-xs text-[#2B1810]/70 max-w-xs mt-2 leading-relaxed">
                New orders will appear here in real-time when customers place orders through the live storefront.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {openOrders.map((order) => {
                const statusColors = {
                  PENDING: 'bg-[#DE8030] text-white',
                  PREPARING: 'bg-[#1E40AF] text-white',
                  READY: 'bg-[#B45309] text-white',
                  COMPLETED: 'bg-[#15803D] text-white',
                  CANCELLED: 'bg-red-600 text-white',
                };

                return (
                  <div
                    key={order.id}
                    className="bg-[#ECE4D8] border border-[#2B1810]/20 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-[#2B1810]/10 pb-3">
                      <div>
                        <div className="font-display font-black text-xl text-[#2B1810]">
                          {order.id}
                        </div>
                        <div className="text-[11px] font-mono-code text-[#2B1810]/60 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-[#C46726]" />
                          <span>{order.createdAt}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono-code font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                          statusColors[order.status]
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-code text-[#2B1810]/80 bg-[#F5EFEB]/60 p-3 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2B1810]">{order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#DE8030]" />
                        <a href={`tel:${order.customerPhone}`} className="hover:underline">
                          {order.customerPhone}
                        </a>
                      </div>
                      <div className="sm:col-span-2 flex items-start gap-2 pt-1 border-t border-[#2B1810]/10">
                        <MapPin className="w-3.5 h-3.5 text-[#DE8030] shrink-0 mt-0.5" />
                        <span className="truncate">{order.customerAddress}</span>
                      </div>
                      {order.notes && (
                        <div className="sm:col-span-2 text-[11px] italic text-[#C46726] pt-1">
                          Note: &quot;{order.notes}&quot;
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    <div className="space-y-1.5 font-mono-code text-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-[#2B1810]/5">
                          <span>
                            <span className="font-bold text-[#2B1810]">{item.quantity}x</span> {item.name}
                          </span>
                          <span className="font-semibold text-[#2B1810]">
                            PKR {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#2B1810]/15">
                      <div>
                        <span className="text-[10px] font-mono-code text-[#2B1810]/60 uppercase block">
                          Total (Cash on delivery)
                        </span>
                        <span className="font-display font-black text-2xl text-[#2B1810]">
                          PKR {order.total.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'PREPARING')}
                            className="px-4 py-2 rounded-full bg-[#2B1810] text-white text-xs font-mono-code uppercase font-semibold flex items-center gap-1.5 hover:bg-[#3E241A] transition"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Start Preparing</span>
                          </button>
                        )}

                        {order.status === 'PREPARING' && (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'READY')}
                            className="px-4 py-2 rounded-full bg-[#B45309] text-white text-xs font-mono-code uppercase font-semibold flex items-center gap-1.5 hover:bg-[#92400E] transition"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Mark Ready</span>
                          </button>
                        )}

                        {order.status === 'READY' && (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'COMPLETED')}
                            className="px-4 py-2 rounded-full bg-[#15803D] text-white text-xs font-mono-code uppercase font-semibold flex items-center gap-1.5 hover:bg-[#166534] transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Complete & Deliver</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelOrder(order.id);
                          }}
                          className="px-3 py-2 rounded-full text-xs font-mono-code text-red-700 hover:bg-red-100 transition cursor-pointer"
                          title="Cancel order"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Menu Control & Product List matching Screenshot 8 & 9 */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
              MENU CONTROL
            </div>
            <h3 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] uppercase tracking-tight">
              PRODUCTS
            </h3>
          </div>

          {/* Add New Product Form matching Screenshot 8 & 9 */}
          <div className="bg-[#ECE4D8]/80 border border-[#2B1810]/15 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="text-xs font-mono-code font-bold tracking-wider text-[#C46726] uppercase flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>ADD NEW PRODUCT</span>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              {/* Item Name */}
              <div>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Item name"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5EFEB] border border-[#2B1810]/20 font-mono-code text-xs text-[#2B1810] placeholder:text-[#2B1810]/40 focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                />
              </div>

              {/* Category Dropdown, Price in PKR & Optional Slashed Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as MenuItem['category'])}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5EFEB] border border-[#2B1810]/20 font-mono-code text-xs text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                >
                  <option value="BURGERS">Burgers</option>
                  <option value="PIZZAS">Pizzas</option>
                  <option value="FAST FOOD">Fast Food</option>
                  <option value="DEALS">Deals</option>
                </select>

                <input
                  type="number"
                  required
                  min="50"
                  step="10"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="Selling Price (PKR)"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5EFEB] border border-[#2B1810]/20 font-mono-code text-xs text-[#2B1810] placeholder:text-[#2B1810]/40 focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                />

                <input
                  type="number"
                  min="50"
                  step="10"
                  value={newItemOriginalPrice}
                  onChange={(e) => setNewItemOriginalPrice(e.target.value)}
                  placeholder="Slashed Price (opt)"
                  title="If higher than selling price, original price will appear slashed out"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5EFEB] border border-[#2B1810]/20 font-mono-code text-xs text-[#2B1810] placeholder:text-[#2B1810]/40 focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                />
              </div>

              {/* Short Description */}
              <div>
                <input
                  type="text"
                  required
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Short description"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5EFEB] border border-[#2B1810]/20 font-mono-code text-xs text-[#2B1810] placeholder:text-[#2B1810]/40 focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                />
              </div>

              {/* Local Device Image File Upload */}
              <div>
                <input
                  type="file"
                  ref={productFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleProductFileUpload}
                />

                {!productImageBase64 ? (
                  <button
                    type="button"
                    onClick={() => productFileInputRef.current?.click()}
                    disabled={isProductImageProcessing}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#F5EFEB] border border-dashed border-[#2B1810]/30 hover:border-[#DE8030] text-[#2B1810] font-mono-code text-xs flex items-center justify-center gap-2 transition group cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 text-[#DE8030] group-hover:-translate-y-0.5 transition-transform" />
                    <span className="font-bold">
                      {isProductImageProcessing ? 'Processing image...' : 'Upload Image from Device'}
                    </span>
                    <span className="text-[10px] text-[#2B1810]/50 hidden sm:inline">(Local photo)</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-[#F5EFEB] rounded-2xl border border-[#2B1810]/20 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={productImageBase64}
                        alt="Product upload preview"
                        className="w-11 h-11 rounded-xl object-cover border border-[#2B1810]/15 shrink-0 bg-[#ECE4D8]"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono-code font-bold text-[#2E7D32] flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Image loaded from device</span>
                        </div>
                        <div className="text-[10px] font-mono-code text-[#2B1810]/60 truncate max-w-[190px]">
                          {productImageFileName || 'Uploaded local photo'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProductImageBase64('');
                        setProductImageFileName('');
                        if (productFileInputRef.current) productFileInputRef.current.value = '';
                      }}
                      className="p-1.5 text-[#2B1810]/40 hover:text-red-600 transition cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Feedback Notifications */}
              {productSuccessMessage && (
                <div className="flex items-start gap-2.5 p-3.5 bg-emerald-100/90 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-mono-code animate-in fade-in duration-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{productSuccessMessage}</span>
                </div>
              )}

              {productErrorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-100/90 border border-red-300 rounded-2xl text-red-800 text-xs font-mono-code animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{productErrorMessage}</span>
                </div>
              )}

              {/* Submit Button in terracotta matching screenshot */}
              <button
                type="submit"
                disabled={isSubmittingProduct || isProductImageProcessing}
                className="w-full py-3.5 rounded-full bg-[#9C4A2F] hover:bg-[#853C23] text-white font-mono-code text-xs uppercase font-bold tracking-wider active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingProduct ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>SAVING TO FIRESTORE...</span>
                  </>
                ) : productSavedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>PRODUCT SAVED TO FIRESTORE!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>+ ADD TO LIVE MENU</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Product List with Toggles & Delete matching Screenshot 9 */}
          <div className="space-y-3">
            <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#2B1810]/60 uppercase">
              ACTIVE STOREFRONT MENU ITEMS ({menuItems.length})
            </div>

            {menuItems.length === 0 ? (
              <div className="text-center py-12 px-4 bg-[#ECE4D8]/50 rounded-2xl border border-dashed border-[#2B1810]/20 font-mono-code text-xs text-[#2B1810]/60">
                <UtensilsCrossed className="w-8 h-8 text-[#2B1810]/30 mx-auto mb-2" />
                <div className="font-bold text-[#2B1810] uppercase mb-1">Firestore 'products' is empty</div>
                <p className="text-[11px] text-[#2B1810]/50 max-w-xs mx-auto">
                  No products found in your database. Use the form on the left to add your first menu item.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-2xl p-3.5 flex items-center justify-between gap-4 shadow-xs"
                >
                  {/* Image & Title & Price */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover bg-[#E2D8C9] shrink-0"
                    />
                    <div className="min-w-0">
                      <h5 className="font-display font-bold text-sm text-[#2B1810] uppercase truncate leading-tight">
                        {item.name}
                      </h5>
                      <div className="text-[11px] font-mono-code text-[#2B1810]/70 mt-0.5">
                        PKR {item.price.toLocaleString()} • {item.category}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Toggle Switch & Delete Trash Icon */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Toggle Switch matching Screenshot 9 */}
                    <button
                      onClick={() => onToggleMenuItem(item.id)}
                      className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
                        item.isAvailable ? 'bg-[#00B074]' : 'bg-[#BA9D8C]'
                      }`}
                      title={item.isAvailable ? 'Item is live (click to disable)' : 'Item is disabled (click to enable)'}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          item.isAvailable ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Edit icon */}
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 text-[#2B1810]/40 hover:text-[#DE8030] transition cursor-pointer"
                      title="Edit item"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(item.id);
                      }}
                      disabled={deletingId === item.id}
                      className="p-1.5 text-[#2B1810]/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                      title={`Delete "${item.name}" from Firestore`}
                      aria-label={`Delete ${item.name}`}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

        </div>

      </div>

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
                className="w-8 h-8 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/10 flex items-center justify-center text-[#2B1810]"
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
                    onChange={(e) => setEditCategory(e.target.value as MenuItem['category'])}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] focus:ring-2 focus:ring-[#DE8030] focus:outline-none"
                  >
                    <option value="BURGERS">BURGERS</option>
                    <option value="PIZZAS">PIZZAS</option>
                    <option value="FAST FOOD">FAST FOOD</option>
                    <option value="DEALS">DEALS</option>
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

    </div>
  );
};
