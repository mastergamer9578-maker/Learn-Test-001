import React from 'react';
import { UtensilsCrossed, MapPin, Clock, Phone, Heart, Lock } from 'lucide-react';

interface FooterProps {
  onOpenStory: () => void;
  onOpenContact: () => void;
  onOpenStaff: () => void;
  onScrollToMenu: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenStory,
  onOpenContact,
  onOpenStaff,
  onScrollToMenu,
}) => {
  return (
    <footer className="bg-[#EAE2D5] border-t border-[#2B1810]/15 mt-20 text-[#2B1810]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DE8030] text-[#2B1810] flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="font-display font-black text-2xl tracking-wide text-[#2B1810] block leading-none">
                  SHAN
                </span>
                <span className="text-[9px] tracking-[0.25em] font-mono-code font-bold text-[#2B1810]/80 uppercase">
                  FAST FOOD
                </span>
              </div>
            </div>

            <p className="font-mono-code text-xs text-[#2B1810]/75 leading-relaxed">
              Serving handcrafted crispy zinger burgers, fire-baked pizzas, and loaded fast food in Korangi, Karachi since 2019.
            </p>
            <div className="text-[11px] font-mono-code font-bold text-[#C46726] uppercase">
              • EST. 2019 • 100% HALAL
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3 font-mono-code text-xs">
            <div className="font-display font-bold text-lg uppercase text-[#2B1810] tracking-wider mb-2">
              QUICK ACCESS
            </div>
            <div>
              <button
                onClick={onScrollToMenu}
                className="hover:text-[#DE8030] transition text-[#2B1810]/80 cursor-pointer"
              >
                Full Menu & Deals
              </button>
            </div>
            <div>
              <button
                onClick={onOpenStory}
                className="hover:text-[#DE8030] transition text-[#2B1810]/80 cursor-pointer"
              >
                Our Story & Kitchen
              </button>
            </div>
            <div>
              <button
                onClick={onOpenContact}
                className="hover:text-[#DE8030] transition text-[#2B1810]/80 cursor-pointer"
              >
                Contact & Delivery Zone
              </button>
            </div>
            <div className="hidden lg:block">
              <button
                onClick={onOpenStaff}
                className="hover:text-[#DE8030] transition text-[#2B1810]/80 flex items-center gap-1.5 cursor-pointer pt-1"
              >
                <Lock className="w-3.5 h-3.5 text-[#DE8030]" />
                <span>Staff Portal Access</span>
              </button>
            </div>
          </div>

          {/* Col 3: Operating Hours */}
          <div className="space-y-3 font-mono-code text-xs">
            <div className="font-display font-bold text-lg uppercase text-[#2B1810] tracking-wider mb-2">
              OPERATING HOURS
            </div>
            <div className="flex items-start gap-2.5 text-[#2B1810]/80">
              <Clock className="w-4 h-4 text-[#DE8030] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#2B1810]">Open daily: 12 PM - 2 AM</div>
                <div className="text-[11px] text-[#2B1810]/60 mt-0.5">
                  Lunch, Dinner & Late Night Delivery
                </div>
              </div>
            </div>
            <div className="pt-2 text-[11px] text-[#2E7D32] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
              <span>Kitchen open for delivery right now</span>
            </div>
          </div>

          {/* Col 4: Location & Contact */}
          <div className="space-y-3 font-mono-code text-xs">
            <div className="font-display font-bold text-lg uppercase text-[#2B1810] tracking-wider mb-2">
              CONTACT & ADDRESS
            </div>
            <div className="flex items-start gap-2 text-[#2B1810]/80">
              <MapPin className="w-4 h-4 text-[#DE8030] shrink-0 mt-0.5" />
              <span>Sector 31-D, Korangi, Karachi</span>
            </div>
            <div className="flex items-center gap-2 text-[#2B1810]/80">
              <Phone className="w-4 h-4 text-[#DE8030] shrink-0" />
              <a href="tel:03215552199" className="font-bold hover:underline">
                0321 555 2199
              </a>
            </div>
            <div className="pt-2">
              <a
                href="https://wa.me/923215552199"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white font-mono-code text-xs font-bold uppercase shadow-xs hover:bg-[#20ba59] transition"
              >
                <span>WhatsApp Order</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom copyright row */}
        <div className="mt-14 pt-8 border-t border-[#2B1810]/15 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono-code text-xs text-[#2B1810]/60">
          <div>
            © 2019 – {new Date().getFullYear()} SHAN FAST FOOD. All rights reserved. Korangi, Karachi.
          </div>
          <div className="flex items-center gap-2">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-[#DE8030] fill-[#DE8030]" />
            <span>for Karachi Food Lovers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
