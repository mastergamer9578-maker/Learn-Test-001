import React, { useEffect } from 'react';
import { X, UtensilsCrossed, Award, Heart, Flame } from 'lucide-react';

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({ isOpen, onClose }) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#2B1810]/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-2xl bg-[#F5EFEB] rounded-3xl sm:rounded-[2rem] shadow-2xl border border-[#2B1810]/15 max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Fixed Header with Branding and Close ('X') Button */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-[#2B1810]/10 flex items-center justify-between gap-3 bg-[#F5EFEB] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#DE8030] text-[#2B1810] flex items-center justify-center shrink-0 shadow-xs">
              <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                OUR JOURNEY • EST. 2019
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase tracking-tight truncate">
                BORN IN KORANGI
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/12 active:scale-95 text-[#2B1810] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
            aria-label="Close dialog"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Story Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm font-mono-code text-[#2B1810]/80 leading-relaxed pr-3 sm:pr-6">
          <p>
            In 2019, Shan Fast Food opened its first kitchen in Korangi, Karachi with a straightforward mission: serve unapologetically bold, mouth-watering comfort food that pairs high-grade fresh ingredients with the fierce flavours Karachi loves.
          </p>

          <p>
            We don’t cut corners. Our Zinger chicken fillets are double-breaded in house by hand each morning, fried to golden crispy perfection, and paired with custom garlic mayo that took over six months to balance.
          </p>

          {/* Three Highlight Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 py-1">
            <div className="bg-[#ECE4D8] p-3.5 sm:p-4 rounded-2xl border border-[#2B1810]/10 text-center flex sm:flex-col items-center sm:justify-center gap-3 sm:gap-1.5 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#DE8030]/15 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-[#DE8030]" />
              </div>
              <div className="text-left sm:text-center">
                <div className="font-display font-bold text-base sm:text-lg text-[#2B1810]">500°C OVEN</div>
                <div className="text-[10px] text-[#2B1810]/60 uppercase">Fire-Baked Pizzas</div>
              </div>
            </div>

            <div className="bg-[#ECE4D8] p-3.5 sm:p-4 rounded-2xl border border-[#2B1810]/10 text-center flex sm:flex-col items-center sm:justify-center gap-3 sm:gap-1.5 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#2E7D32]/15 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 text-[#2E7D32]" />
              </div>
              <div className="text-left sm:text-center">
                <div className="font-display font-bold text-base sm:text-lg text-[#2B1810]">100% FRESH</div>
                <div className="text-[10px] text-[#2B1810]/60 uppercase">Halal Daily Sourced</div>
              </div>
            </div>

            <div className="bg-[#ECE4D8] p-3.5 sm:p-4 rounded-2xl border border-[#2B1810]/10 text-center flex sm:flex-col items-center sm:justify-center gap-3 sm:gap-1.5 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#9C4A2F]/15 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 text-[#9C4A2F]" />
              </div>
              <div className="text-left sm:text-center">
                <div className="font-display font-bold text-base sm:text-lg text-[#2B1810]">7 YEARS</div>
                <div className="text-[10px] text-[#2B1810]/60 uppercase">Serving Karachi</div>
              </div>
            </div>
          </div>

          <p>
            Whether you&apos;re getting a late-night midnight craving at 1:30 AM or hosting a weekend family gathering, our kitchen works around the clock to make every bite unforgettable.
          </p>
        </div>

        {/* Fixed Footer with Action Button */}
        <div className="p-3.5 sm:p-5 border-t border-[#2B1810]/12 flex justify-end bg-[#ECE4D8]/40 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code text-xs uppercase font-bold tracking-wider hover:bg-[#3E241A] active:scale-95 transition shadow-sm cursor-pointer"
          >
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};
