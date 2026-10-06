import React from 'react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { CartItem, DeliverySettings, StoreStatus } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  deliverySettings?: DeliverySettings;
  storeStatus?: StoreStatus;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  deliverySettings,
  storeStatus,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.item.price * item.quantity,
    0
  );

  const standardFee = deliverySettings?.standardFee ?? 120;
  const freeThreshold = deliverySettings?.freeDeliveryThreshold ?? 1500;
  const zoneName = deliverySettings?.deliveryZone || 'Korangi';

  const deliveryFee = subtotal >= freeThreshold ? 0 : subtotal > 0 ? standardFee : 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#2B1810]/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#F5EFEB] shadow-2xl flex flex-col justify-between border-l border-[#2B1810]/15 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="px-6 py-6 border-b border-[#2B1810]/10 flex items-center justify-between bg-[#ECE4D8]/50">
            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase">
                YOUR ORDER
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] tracking-tight uppercase leading-none mt-1">
                THE BAG {cart.length > 0 && `(${totalItemCount})`}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/10 text-[#2B1810] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {cart.length === 0 ? (
              /* Empty Bag State */
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 rounded-2xl border-2 border-[#2B1810]/20 flex items-center justify-center text-[#2B1810]/40 mb-6">
                  <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="font-display font-black text-3xl text-[#2B1810] uppercase tracking-tight mb-2">
                  YOUR BAG IS EMPTY
                </h3>
                <p className="font-mono-code text-xs text-[#2B1810]/70 max-w-xs leading-relaxed">
                  Add something delicious from the menu and it will show up here.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-8 px-6 py-2.5 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code text-xs uppercase font-bold tracking-wider hover:bg-[#3E241A] transition cursor-pointer"
                >
                  BROWSE MENU
                </button>
              </div>
            ) : (
              /* Items in Bag List (Clean & Compact) */
              <div className="space-y-4">
                <div className="space-y-3">
                  {cart.map((cartItem) => (
                    <div
                      key={cartItem.item.id}
                      className="flex items-center gap-3 bg-[#ECE4D8]/80 border border-[#2B1810]/15 rounded-2xl p-3 shadow-xs"
                    >
                      <img
                        src={cartItem.item.image}
                        alt={cartItem.item.name}
                        className="w-16 h-16 rounded-xl object-cover bg-[#E2D8C9] shrink-0 border border-[#2B1810]/10"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-base text-[#2B1810] uppercase truncate leading-tight">
                          {cartItem.item.name}
                        </h4>
                        <div className="text-[10px] font-mono-code text-[#C46726] font-semibold uppercase">
                          PKR {cartItem.item.price.toLocaleString()} each
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(
                                cartItem.item.id,
                                cartItem.quantity - 1
                              )
                            }
                            className="w-6 h-6 rounded-full bg-[#2B1810]/10 hover:bg-[#2B1810]/20 flex items-center justify-center text-[#2B1810] transition cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="font-mono-code font-bold text-xs text-[#2B1810] w-6 text-center">
                            {cartItem.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(
                                cartItem.item.id,
                                cartItem.quantity + 1
                              )
                            }
                            className="w-6 h-6 rounded-full bg-[#2B1810]/10 hover:bg-[#2B1810]/20 flex items-center justify-center text-[#2B1810] transition cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          <span className="font-display font-bold text-base text-[#2B1810] ml-auto">
                            PKR {(cartItem.item.price * cartItem.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(cartItem.item.id)}
                        className="p-1.5 text-[#2B1810]/40 hover:text-red-600 transition self-start cursor-pointer"
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Free Delivery threshold helper */}
                {subtotal < freeThreshold ? (
                  <div className="bg-[#DE8030]/10 border border-[#DE8030]/30 rounded-xl p-3 text-[11px] font-mono-code text-[#2B1810]">
                    Add <span className="font-bold text-[#C46726]">PKR {(freeThreshold - subtotal).toLocaleString()}</span> more for <span className="font-bold">FREE DELIVERY</span> in {zoneName}!
                  </div>
                ) : (
                  <div className="bg-[#15803D]/10 border border-[#15803D]/30 rounded-xl p-3 text-[11px] font-mono-code text-[#15803D] font-semibold">
                    ✓ You have qualified for FREE DELIVERY in {zoneName}!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drawer Footer with Subtotal, Delivery & Checkout Action */}
          {cart.length > 0 && (
            <div className="p-6 bg-[#ECE4D8]/80 border-t border-[#2B1810]/15 space-y-4">
              <div className="space-y-1.5 font-mono-code text-xs">
                <div className="flex justify-between text-[#2B1810]/75">
                  <span>Subtotal</span>
                  <span>PKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#2B1810]/75">
                  <span>Delivery Fee ({zoneName})</span>
                  <span className={deliveryFee === 0 ? 'text-[#15803D] font-bold' : ''}>
                    {deliveryFee === 0 ? 'FREE' : `PKR ${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between font-display font-black text-2xl text-[#2B1810] pt-2 border-t border-[#2B1810]/15">
                  <span>TOTAL</span>
                  <span>PKR {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Store Status Notices */}
              {storeStatus === 'PAUSED' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-[11px] font-mono-code text-red-700 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                  <span>Kitchen is currently resting. Online checkout is temporarily paused.</span>
                </div>
              )}

              {storeStatus === 'BUSY' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] font-mono-code text-amber-800 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
                  <span>High kitchen rush! Estimated delivery time is 45–60 minutes.</span>
                </div>
              )}

              {/* Proceed to Dedicated Checkout Modal */}
              <button
                type="button"
                onClick={onProceedToCheckout}
                disabled={storeStatus === 'PAUSED'}
                className="w-full py-3.5 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code text-xs uppercase font-bold tracking-wider hover:bg-[#3E241A] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{storeStatus === 'PAUSED' ? 'ORDERS TEMPORARILY PAUSED' : 'PROCEED TO CHECKOUT'}</span>
                {storeStatus !== 'PAUSED' && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
