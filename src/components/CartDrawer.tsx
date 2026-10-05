import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: (orderData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    notes?: string;
  }) => string; // returns created order ID
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.item.price * item.quantity,
    0
  );
  const deliveryFee = subtotal > 1500 ? 0 : subtotal > 0 ? 120 : 0;
  const total = subtotal + deliveryFee;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const orderId = onCheckout({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        notes: orderNotes.trim() || undefined,
      });

      setCompletedOrderId(orderId);
      setIsSubmitting(false);
      onClearCart();
    }, 600);
  };

  const handleCloseAndReset = () => {
    setCompletedOrderId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={handleCloseAndReset}
        className="absolute inset-0 bg-[#2B1810]/40 backdrop-blur-sm transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#F5EFEB] shadow-2xl flex flex-col justify-between border-l border-[#2B1810]/15">
          
          {/* Header */}
          <div className="px-6 py-6 border-b border-[#2B1810]/10 flex items-center justify-between bg-[#ECE4D8]/50">
            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase">
                YOUR ORDER
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] tracking-tight uppercase leading-none mt-1">
                THE BAG
              </h2>
            </div>

            <button
              onClick={handleCloseAndReset}
              className="w-9 h-9 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/10 text-[#2B1810] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {completedOrderId ? (
              /* Order Completed Success Screen */
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#2E7D32]/15 text-[#2E7D32] flex items-center justify-center mb-5 animate-bounce">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>
                <div className="text-xs font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase mb-1">
                  ORDER CONFIRMED
                </div>
                <h3 className="font-display font-black text-3xl text-[#2B1810] uppercase mb-2">
                  KITCHEN IS FIRING UP!
                </h3>
                <p className="font-mono-code text-xs text-[#2B1810]/75 max-w-xs leading-relaxed mb-6">
                  Thank you, <span className="font-bold text-[#2B1810]">{customerName}</span>! Your order has been placed into the live kitchen queue.
                </p>

                <div className="w-full bg-[#ECE4D8] border border-[#2B1810]/15 rounded-2xl p-4 mb-6 font-mono-code text-xs text-left">
                  <div className="flex justify-between py-1 border-b border-[#2B1810]/10">
                    <span className="text-[#2B1810]/60">ORDER ID:</span>
                    <span className="font-bold text-[#2B1810]">{completedOrderId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2B1810]/10">
                    <span className="text-[#2B1810]/60">EST. DELIVERY:</span>
                    <span className="font-bold text-[#DE8030]">25-35 MINS</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2B1810]/10">
                    <span className="text-[#2B1810]/60">DELIVER TO:</span>
                    <span className="font-bold text-[#2B1810] truncate max-w-[180px]">{customerAddress}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="text-[#2B1810]/60">PAYMENT:</span>
                    <span className="font-bold text-[#2B1810]">CASH ON DELIVERY (PKR {total.toLocaleString()})</span>
                  </div>
                </div>

                <button
                  onClick={handleCloseAndReset}
                  className="w-full py-3.5 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code text-xs uppercase font-bold tracking-wider hover:bg-[#3E241A] transition shadow-md"
                >
                  RETURN TO STOREFRONT
                </button>
              </div>
            ) : cart.length === 0 ? (
              /* Empty Bag State matching Screenshot 2 */
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
                  onClick={onClose}
                  className="mt-8 px-6 py-2.5 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code text-xs uppercase font-bold tracking-wider hover:bg-[#3E241A] transition"
                >
                  BROWSE MENU
                </button>
              </div>
            ) : (
              /* Items in Bag List */
              <div className="space-y-6">
                <div className="space-y-3">
                  {cart.map((cartItem) => (
                    <div
                      key={cartItem.item.id}
                      className="flex items-center gap-3 bg-[#ECE4D8]/80 border border-[#2B1810]/15 rounded-2xl p-3 shadow-xs"
                    >
                      <img
                        src={cartItem.item.image}
                        alt={cartItem.item.name}
                        className="w-16 h-16 rounded-xl object-cover bg-[#E2D8C9] shrink-0"
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
                            onClick={() =>
                              onUpdateQuantity(
                                cartItem.item.id,
                                cartItem.quantity - 1
                              )
                            }
                            className="w-6 h-6 rounded-full bg-[#2B1810]/10 hover:bg-[#2B1810]/20 flex items-center justify-center text-[#2B1810] transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="font-mono-code font-bold text-xs text-[#2B1810] w-6 text-center">
                            {cartItem.quantity}
                          </span>

                          <button
                            onClick={() =>
                              onUpdateQuantity(
                                cartItem.item.id,
                                cartItem.quantity + 1
                              )
                            }
                            className="w-6 h-6 rounded-full bg-[#2B1810]/10 hover:bg-[#2B1810]/20 flex items-center justify-center text-[#2B1810] transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          <span className="font-display font-bold text-base text-[#2B1810] ml-auto">
                            PKR {(cartItem.item.price * cartItem.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onRemoveItem(cartItem.item.id)}
                        className="p-1.5 text-[#2B1810]/40 hover:text-[#9C4A2F] transition self-start"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Free Delivery threshold helper */}
                {subtotal < 1500 ? (
                  <div className="bg-[#DE8030]/10 border border-[#DE8030]/30 rounded-xl p-3 text-[11px] font-mono-code text-[#2B1810]">
                    Add <span className="font-bold text-[#C46726]">PKR {(1500 - subtotal).toLocaleString()}</span> more for <span className="font-bold">FREE DELIVERY</span> in Korangi!
                  </div>
                ) : (
                  <div className="bg-[#2E7D32]/10 border border-[#2E7D32]/30 rounded-xl p-3 text-[11px] font-mono-code text-[#2E7D32] font-semibold">
                    ✓ You have qualified for FREE DELIVERY in Korangi!
                  </div>
                )}

                {/* Customer Checkout Details Form */}
                <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-3 pt-2">
                  <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                    DELIVERY DETAILS (KORANGI, KARACHI)
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Your Name *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-1 focus:ring-[#DE8030]"
                    />
                  </div>

                  <div>
                    <input
                      type="tel"
                      required
                      placeholder="Phone (e.g. 0321-1234567) *"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-1 focus:ring-[#DE8030]"
                    />
                  </div>

                  <div>
                    <textarea
                      required
                      rows={2}
                      placeholder="Delivery Address (Sector, Street, Landmark in Korangi) *"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-1 focus:ring-[#DE8030] resize-none"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Special Cooking Note (e.g. Extra spicy, no mayo)"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-1 focus:ring-[#DE8030]"
                    />
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Drawer Footer with Calculation & Submit */}
          {!completedOrderId && cart.length > 0 && (
            <div className="p-6 bg-[#ECE4D8]/80 border-t border-[#2B1810]/15 space-y-4">
              <div className="space-y-1.5 font-mono-code text-xs">
                <div className="flex justify-between text-[#2B1810]/75">
                  <span>Subtotal</span>
                  <span>PKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#2B1810]/75">
                  <span>Delivery Fee (Korangi)</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `PKR ${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between font-display font-black text-2xl text-[#2B1810] pt-2 border-t border-[#2B1810]/15">
                  <span>TOTAL</span>
                  <span>PKR {total.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code text-xs uppercase font-bold tracking-wider hover:bg-[#3E241A] active:scale-95 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>TRANSMITTING ORDER...</span>
                ) : (
                  <>
                    <span>CONFIRM ORDER (CASH ON DELIVERY)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
