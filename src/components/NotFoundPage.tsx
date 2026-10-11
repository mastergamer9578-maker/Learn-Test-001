import React from 'react';
import { UtensilsCrossed, ArrowRight, Home, HelpCircle, Phone, Search } from 'lucide-react';

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
    <div className="min-h-[82vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-[#F9F6F0]">
      <div className="max-w-3xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Graphic with Huge 404 & Cookware Icon */}
        <div className="relative flex flex-col items-center justify-center select-none pt-4">
          {/* Prominent Huge 404 Text - bold and prominent behind/above title */}
          <div className="text-8xl sm:text-9xl font-black font-display tracking-tighter text-[#DE8030]/20 leading-none select-none drop-shadow-sm scale-110">
            404
          </div>

          {/* Floating Icon badge overlapping the huge 404 */}
          <div className="-mt-16 sm:-mt-20 relative z-10 flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#DE8030] text-[#2A1D17] flex items-center justify-center shadow-xl transform -rotate-3 hover:rotate-0 transition-all duration-300 border-4 border-[#F9F6F0]">
              <UtensilsCrossed className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Heading & Context */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-[#2A1D17] uppercase tracking-tight leading-tight">
            THIS DISH IS OFF THE MENU!
          </h1>
          <p className="font-mono-code text-base sm:text-lg lg:text-xl text-[#2A1D17]/80 max-w-xl mx-auto leading-relaxed">
            The page or URL you requested{' '}
            {attemptedPath ? (
              <code className="px-2 py-0.5 rounded-md bg-[#2A1D17]/10 text-[#2A1D17] font-bold inline-block mx-1">
                {attemptedPath}
              </code>
            ) : (
              'at this address'
            )}{' '}
            does not exist or has been relocated. Don't worry, our kitchen is fired up and ready to serve you freshly prepared favorites!
          </p>
        </div>

        {/* Action Buttons: Clean, pill-shaped rounded buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#2A1D17] hover:bg-[#3E241A] text-[#F9F6F0] text-sm font-mono-code font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition duration-200 shadow-lg hover:shadow-xl cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4 text-[#DE8030]" />
            <span>RETURN TO HOMEPAGE</span>
          </button>

          <button
            type="button"
            onClick={onGoMenu}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#DE8030] hover:bg-[#C46726] text-[#2A1D17] text-sm font-mono-code font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition duration-200 shadow-lg hover:shadow-xl cursor-pointer active:scale-95"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>BROWSE MENU & DEALS →</span>
          </button>
        </div>

        {/* Secondary Helpful Links */}
        <div className="pt-8 border-t border-[#2A1D17]/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
          {onOpenStory && (
            <div
              onClick={onOpenStory}
              className="p-4 rounded-2xl bg-[#ECE4D8]/80 border border-[#2A1D17]/10 hover:border-[#DE8030]/50 hover:bg-[#ECE4D8] transition cursor-pointer group flex items-start gap-3 shadow-sm hover:shadow"
            >
              <HelpCircle className="w-5 h-5 text-[#DE8030] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <h2 className="font-display font-bold text-sm text-[#2A1D17] uppercase group-hover:text-[#DE8030] transition">
                  About Shan Fast Food
                </h2>
                <p className="font-mono-code text-xs text-[#2A1D17]/70 mt-0.5 leading-relaxed">
                  Learn about our kitchen heritage in Korangi since 2019.
                </p>
              </div>
            </div>
          )}

          {onOpenContact && (
            <div
              onClick={onOpenContact}
              className="p-4 rounded-2xl bg-[#ECE4D8]/80 border border-[#2A1D17]/10 hover:border-[#DE8030]/50 hover:bg-[#ECE4D8] transition cursor-pointer group flex items-start gap-3 shadow-sm hover:shadow"
            >
              <Phone className="w-5 h-5 text-[#DE8030] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <h2 className="font-display font-bold text-sm text-[#2A1D17] uppercase group-hover:text-[#DE8030] transition">
                  Need Help Ordering?
                </h2>
                <p className="font-mono-code text-xs text-[#2A1D17]/70 mt-0.5 leading-relaxed">
                  Helpline: 0321 555 2199 for fast order assistance.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs font-mono-code text-[#2A1D17]/60 pt-2">
          Shan Fast Food · Sector 31-D Korangi, Karachi · 100% Halal
        </div>
      </div>
    </div>
  );
};
