import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, Check, Flame, Clock, ShieldCheck } from 'lucide-react';
import { MenuItem } from '../types';

interface ProductDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  // Reset quantity whenever opened with a new item
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setIsAddedFeedback(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleAdd = () => {
    onAddToCart(item, quantity);
    setIsAddedFeedback(true);
    setTimeout(() => {
      setIsAddedFeedback(false);
      onClose();
    }, 800);
  };

  const totalPrice = item.price * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#2B1810]/50 backdrop-blur-xs transition-opacity"
      />

      {/* Compact Centered Modal Dialog Card */}
      <div className="relative w-full max-w-[420px] max-h-[90vh] bg-[#F5EFEB] rounded-[1.75rem] overflow-hidden shadow-2xl border border-[#2B1810]/15 animate-in zoom-in-95 duration-200 z-10 flex flex-col my-auto">
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-[#F5EFEB]/90 hover:bg-[#F5EFEB] text-[#2B1810] flex items-center justify-center shadow-md transition-all cursor-pointer"
          aria-label="Close detail modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Compact Proportioned Product Image */}
        <div className="relative h-44 sm:h-48 w-full bg-[#E2D8C9] shrink-0 overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />

          {/* Tag Badge */}
          {item.tag && (
            <div className="absolute top-3 left-3 bg-[#F5EFEB]/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono-code font-bold tracking-wider text-[#2B1810] shadow-sm">
              {item.tag}
            </div>
          )}

          {!item.isAvailable && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-[#2B1810] text-white text-[11px] font-mono-code px-3 py-1.5 rounded-full uppercase tracking-widest font-bold">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            {/* Category */}
            <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
              {item.category}
            </div>

            {/* Product Title & Price Header */}
            <div className="flex items-start justify-between gap-3 mt-0.5">
              <h2 className="font-display font-black text-2xl text-[#2B1810] uppercase tracking-tight leading-tight">
                {item.name}
              </h2>
              <div className="shrink-0 text-right">
                <span className="font-display font-black text-xl text-[#2B1810] block">
                  PKR {item.price.toLocaleString()}
                </span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <span className="font-mono-code line-through text-xs text-[#2B1810]/45 block">
                    PKR {item.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#ECE4D8]/60 border border-[#2B1810]/10 rounded-xl p-3">
            <p className="font-mono-code text-xs text-[#2B1810]/80 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Freshness Features Badges */}
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono-code text-[#2B1810]/70 pt-0.5">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#DE8030]" />
              <span>Fresh</span>
            </span>
            <span className="text-[#2B1810]/30">•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#DE8030]" />
              <span>25-35 Mins</span>
            </span>
            <span className="text-[#2B1810]/30">•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>100% Halal</span>
            </span>
          </div>

          {/* Action Row: Quantity Selector & Add to Bag CTA */}
          <div className="pt-3 border-t border-[#2B1810]/15 flex items-center gap-3">
            
            {/* Quantity Selector */}
            <div className="flex items-center gap-2 bg-[#ECE4D8] border border-[#2B1810]/20 rounded-full px-3 py-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || !item.isAvailable}
                className="w-6 h-6 rounded-full bg-[#2B1810]/10 hover:bg-[#2B1810]/20 text-[#2B1810] flex items-center justify-center transition disabled:opacity-30 cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3 h-3" />
              </button>

              <span className="font-mono-code font-bold text-sm text-[#2B1810] w-5 text-center select-none">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                disabled={!item.isAvailable}
                className="w-6 h-6 rounded-full bg-[#2B1810]/10 hover:bg-[#2B1810]/20 text-[#2B1810] flex items-center justify-center transition disabled:opacity-30 cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Add to Bag Button */}
            <button
              type="button"
              onClick={handleAdd}
              disabled={!item.isAvailable}
              className={`flex-1 py-3 px-4 rounded-full font-mono-code text-xs uppercase font-bold tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                isAddedFeedback
                  ? 'bg-[#2E7D32] text-white'
                  : 'bg-[#2B1810] text-[#F5EFEB] hover:bg-[#3E241A] active:scale-95'
              }`}
            >
              {isAddedFeedback ? (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>ADDED!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="truncate">ADD · PKR {totalPrice.toLocaleString()}</span>
                </>
              )}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};
