import React, { useState } from 'react';
import { X, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck, MapPin, Phone, User, FileText, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import { CartItem, DeliverySettings } from '../types';
import { sanitizeString, isValidPhone, checkRateLimit } from '../utils/security';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToCart: () => void;
  cart: CartItem[];
  deliverySettings?: DeliverySettings;
  onClearCart: () => void;
  onCheckout: (orderData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    notes?: string;
  }) => string; // returns created order ID
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onBackToCart,
  cart,
  deliverySettings,
  onClearCart,
  onCheckout,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.item.price * item.quantity,
    0
  );

  const standardFee = deliverySettings?.standardFee ?? 120;
  const freeThreshold = deliverySettings?.freeDeliveryThreshold ?? 1500;
  const zoneName = deliverySettings?.deliveryZone || 'Korangi';

  const deliveryFee = subtotal >= freeThreshold ? 0 : subtotal > 0 ? standardFee : 0;
  const total = subtotal + deliveryFee;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Input sanitization against XSS and control characters
    const cleanName = sanitizeString(customerName, 80);
    const cleanPhone = sanitizeString(customerPhone, 25);
    const cleanAddress = sanitizeString(customerAddress, 250);
    const cleanNotes = sanitizeString(orderNotes, 300);

    if (!cleanName || !cleanPhone || !cleanAddress) {
      setErrorMessage('Please fill in your name, contact phone, and delivery address.');
      return;
    }

    if (!isValidPhone(cleanPhone)) {
      setErrorMessage('Please enter a valid phone number (e.g., 0300 1234567 or +92 300 1234567).');
      return;
    }

    // Rate-limiting check: max 5 order submissions per 3 minutes
    const rateCheck = checkRateLimit('customer_order_checkout', 5, 180);
    if (!rateCheck.allowed) {
      setErrorMessage(`Order rate limit reached. Please wait ${rateCheck.waitSeconds} seconds before placing another order.`);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const orderId = onCheckout({
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerAddress: cleanAddress,
        notes: cleanNotes || undefined,
      });

      setCompletedOrderId(orderId);
      setIsSubmitting(false);
      onClearCart();
    }, 600);
  };

  const handleCloseAndReset = () => {
    setCompletedOrderId(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Dark/Cream Glassmorphic Backdrop */}
      <div
        onClick={handleCloseAndReset}
        className="fixed inset-0 bg-[#2B1810]/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      <div className="min-h-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative w-full max-w-2xl bg-[#F5EFEB] rounded-3xl shadow-2xl border border-[#2B1810]/15 z-10 overflow-hidden animate-in zoom-in-95 duration-200">
          
          {completedOrderId ? (
            /* Order Placed Success Confirmation Receipt */
            <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-[#15803D]/15 text-[#15803D] flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
              </div>

              <div>
                <div className="text-[10px] font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase mb-1">
                  ORDER PLACED SUCCESSFULLY
                </div>
                <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] uppercase tracking-tight">
                  KITCHEN IS FIRING UP!
                </h2>
                <p className="font-mono-code text-xs sm:text-sm text-[#2B1810]/75 max-w-md mx-auto mt-2 leading-relaxed">
                  Thank you, <strong className="text-[#2B1810]">{customerName}</strong>! Your order is now in the live kitchen queue and being prepared fresh.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="w-full bg-[#ECE4D8] border border-[#2B1810]/15 rounded-2xl p-5 font-mono-code text-xs text-left space-y-2.5">
                <div className="flex justify-between py-1 border-b border-[#2B1810]/10">
                  <span className="text-[#2B1810]/60">ORDER ID:</span>
                  <span className="font-bold text-[#2B1810] text-sm">{completedOrderId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#2B1810]/10">
                  <span className="text-[#2B1810]/60">ESTIMATED DELIVERY:</span>
                  <span className="font-bold text-[#DE8030]">25–35 MINS</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#2B1810]/10">
                  <span className="text-[#2B1810]/60">DELIVERY TO:</span>
                  <span className="font-bold text-[#2B1810] truncate max-w-[240px]">{customerAddress}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#2B1810]/10">
                  <span className="text-[#2B1810]/60">CONTACT PHONE:</span>
                  <span className="font-bold text-[#2B1810]">{customerPhone}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-bold text-[#2B1810]">
                  <span>TOTAL TO PAY:</span>
                  <span>PKR {total.toLocaleString()} (Cash on Delivery)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseAndReset}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#2B1810] hover:bg-[#3E241A] text-[#F5EFEB] font-mono-code text-xs uppercase font-bold tracking-wider transition shadow-lg cursor-pointer"
              >
                RETURN TO STOREFRONT
              </button>
            </div>
          ) : (
            /* Dedicated Checkout Screen */
            <div>
              {/* Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-[#2B1810]/10 bg-[#ECE4D8]/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onBackToCart}
                    className="p-2 rounded-full hover:bg-[#2B1810]/10 text-[#2B1810] transition cursor-pointer"
                    title="Back to Bag"
                    aria-label="Back to Bag"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="text-[10px] font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase">
                      FINAL STEP
                    </div>
                    <h2 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] tracking-tight uppercase leading-none">
                      CHECKOUT & DELIVERY
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseAndReset}
                  className="w-9 h-9 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/10 text-[#2B1810] flex items-center justify-center transition cursor-pointer"
                  aria-label="Close checkout"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form & Order Review */}
              <form onSubmit={handleSubmitOrder} className="p-6 sm:p-8 space-y-6">
                
                {/* Compact Order Summary Accordion/Card */}
                <div className="bg-[#ECE4D8] border border-[#2B1810]/15 rounded-2xl p-4 space-y-3 font-mono-code text-xs">
                  <div className="flex items-center justify-between text-[#2B1810] font-bold border-b border-[#2B1810]/10 pb-2">
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#DE8030]" />
                      <span>ORDER SUMMARY ({cart.reduce((s, i) => s + i.quantity, 0)} ITEMS)</span>
                    </span>
                    <button
                      type="button"
                      onClick={onBackToCart}
                      className="text-[11px] text-[#9C4A2F] hover:underline cursor-pointer"
                    >
                      Edit Bag
                    </button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1 divide-y divide-[#2B1810]/5">
                    {cart.map((cartItem) => (
                      <div key={cartItem.item.id} className="flex justify-between items-center pt-1.5 first:pt-0">
                        <span className="text-[#2B1810]/80">
                          <strong className="text-[#2B1810]">{cartItem.quantity}x</strong> {cartItem.item.name}
                        </span>
                        <span className="font-semibold text-[#2B1810]">
                          PKR {(cartItem.item.price * cartItem.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#2B1810]/10 space-y-1 text-[#2B1810]/70 text-[11px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>PKR {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee ({zoneName}):</span>
                      <span className={deliveryFee === 0 ? 'text-[#15803D] font-bold' : ''}>
                        {deliveryFee === 0 ? 'FREE' : `PKR ${deliveryFee}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-display font-black text-[#2B1810] pt-1 border-t border-[#2B1810]/10">
                      <span>TOTAL DUE:</span>
                      <span>PKR {total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Form Fields */}
                <div className="space-y-4">
                  <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                    YOUR DELIVERY DETAILS
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs font-mono-code flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Name Input */}
                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                      FULL NAME *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Hamza Khan"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                      />
                      <User className="w-4 h-4 text-[#2B1810]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                      PHONE NUMBER *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 0300 1234567"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                      />
                      <Phone className="w-4 h-4 text-[#2B1810]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Address Textarea */}
                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                      DELIVERY ADDRESS IN {zoneName.toUpperCase()}, KARACHI *
                    </label>
                    <div className="relative">
                      <textarea
                        required
                        rows={2}
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="House/Apartment #, Street, Sector (e.g. Sector 31-D, near Bilal Chowk, Korangi)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-2 focus:ring-[#DE8030] resize-none"
                      />
                      <MapPin className="w-4 h-4 text-[#2B1810]/50 absolute left-3.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Special Cooking Note */}
                  <div>
                    <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#2B1810]/70 mb-1.5">
                      SPECIAL COOKING NOTE (OPTIONAL)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="e.g. Extra spicy sauce, no mayo, please ring bell"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#ECE4D8] border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 focus:outline-none focus:ring-2 focus:ring-[#DE8030]"
                      />
                      <FileText className="w-4 h-4 text-[#2B1810]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Cash on Delivery Badge */}
                <div className="bg-[#15803D]/10 border border-[#15803D]/25 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#15803D] text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="font-mono-code text-xs text-[#2B1810]">
                    <div className="font-bold text-[#15803D] uppercase">CASH ON DELIVERY (COD)</div>
                    <div className="text-[11px] text-[#2B1810]/70 mt-0.5">
                      No advance payment needed. Pay cash directly to the rider upon arrival.
                    </div>
                  </div>
                </div>

                {/* Submit Order Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-full bg-[#2B1810] hover:bg-[#3E241A] text-[#F5EFEB] font-mono-code text-xs sm:text-sm uppercase font-bold tracking-wider transition shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#DE8030]" />
                        <span>TRANSMITTING ORDER TO LIVE KITCHEN...</span>
                      </>
                    ) : (
                      <>
                        <span>CONFIRM & PLACE ORDER • PKR {total.toLocaleString()}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
