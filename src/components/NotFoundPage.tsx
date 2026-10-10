import React from 'react';
import { UtensilsCrossed, ArrowRight, Home, HelpCircle, Phone, Sparkles } from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
  onGoMenu: () => void;
  onOpenStory?: () => void;
  onOpenContact?: () => void;
  attemptedPath?: string;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onGoHome,
  onGoMenu,
  onOpenStory,
  onOpenContact,
  attemptedPath,
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Animated Badge & Icon */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#DE8030] text-[#2B1810] flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform">
              <UtensilsCrossed className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2]" />
            </div>
            <div className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full bg-[#2B1810] text-[#DE8030] text-[10px] font-mono-code font-bold uppercase tracking-wider border border-[#DE8030]/30 shadow-md">
              404
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2B1810]/5 border border-[#2B1810]/15 text-[#C46726] text-xs font-mono-code font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ROUTE NOT FOUND</span>
          </div>
        </div>

        {/* Heading & Context */}
        <div className="space-y-3">
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-[#2B1810] uppercase tracking-tight leading-tight">
            THIS DISH IS OFF THE MENU!
          </h1>
          <p className="font-mono-code text-xs sm:text-sm text-[#2B1810]/75 max-w-lg mx-auto leading-relaxed">
            The page or URL you requested{' '}
            {attemptedPath ? (
              <code className="px-1.5 py-0.5 rounded bg-[#2B1810]/10 text-[#2B1810] font-bold">
                {attemptedPath}
              </code>
            ) : (
              'at this address'
            )}{' '}
            does not exist or has been relocated. But don't worry, our kitchen is fired up and ready to serve you!
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#2B1810] hover:bg-[#3E241A] text-[#F5EFEB] text-xs font-mono-code font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4 text-[#DE8030]" />
            <span>Return to Homepage</span>
          </button>

          <button
            type="button"
            onClick={onGoMenu}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#DE8030] hover:bg-[#c97127] text-[#2B1810] text-xs font-mono-code font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md cursor-pointer active:scale-95"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Browse Menu & Deals</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Secondary Helpful Links */}
        <div className="pt-6 border-t border-[#2B1810]/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
          {onOpenStory && (
            <div
              onClick={onOpenStory}
              className="p-4 rounded-2xl bg-[#ECE4D8] border border-[#2B1810]/10 hover:border-[#DE8030]/40 transition cursor-pointer group flex items-start gap-3"
            >
              <HelpCircle className="w-5 h-5 text-[#DE8030] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display font-bold text-sm text-[#2B1810] uppercase group-hover:text-[#DE8030] transition">
                  About Shan Fast Food
                </h2>
                <p className="font-mono-code text-[11px] text-[#2B1810]/70 mt-0.5">
                  Learn about our kitchen heritage in Korangi since 2019.
                </p>
              </div>
            </div>
          )}

          {onOpenContact && (
            <div
              onClick={onOpenContact}
              className="p-4 rounded-2xl bg-[#ECE4D8] border border-[#2B1810]/10 hover:border-[#DE8030]/40 transition cursor-pointer group flex items-start gap-3"
            >
              <Phone className="w-5 h-5 text-[#DE8030] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display font-bold text-sm text-[#2B1810] uppercase group-hover:text-[#DE8030] transition">
                  Need Help Ordering?
                </h2>
                <p className="font-mono-code text-[11px] text-[#2B1810]/70 mt-0.5">
                  Helpline: 0321 555 2199 for fast order assistance.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono-code text-[#2B1810]/50">
          Shan Fast Food · Sector 31-D Korangi, Karachi · 100% Halal
        </div>
      </div>
    </div>
  );
};
