import React, { useState } from 'react';
import { ShoppingBag, UtensilsCrossed, Menu as MenuIcon, X } from 'lucide-react';

interface NavbarProps {
  currentView: 'customer' | 'staff' | 'not-found';
  onSwitchView: (view: 'customer' | 'staff') => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenStory: () => void;
  onOpenContact: () => void;
  onScrollToMenu: () => void;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSwitchView,
  cartCount,
  onOpenCart,
  onOpenStory,
  onOpenContact,
  onScrollToMenu,
  onNavigate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#F5EFEB]/90 backdrop-blur-md border-b border-[#2B1810]/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Home Navigation */}
        <div 
          onClick={() => {
            if (onNavigate) {
              onNavigate('/');
            } else if (currentView === 'staff') {
              onSwitchView('customer');
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-11 h-11 rounded-xl bg-[#DE8030] text-[#2B1810] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <UtensilsCrossed className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-2xl tracking-wide text-[#2B1810] leading-none">
              SHAN
            </span>
            <span className="text-[10px] tracking-[0.25em] font-mono-code font-bold text-[#2B1810]/80 mt-1 uppercase">
              FAST FOOD
            </span>
          </div>
        </div>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-mono-code tracking-wider text-[#2B1810]/80">
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('/menu');
              } else {
                if (currentView === 'staff') onSwitchView('customer');
                setTimeout(onScrollToMenu, 100);
              }
            }}
            className="hover:text-[#9C4A2F] transition-colors uppercase font-medium cursor-pointer"
          >
            Menu
          </button>
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('/our-story');
              } else {
                onOpenStory();
              }
            }}
            className="hover:text-[#9C4A2F] transition-colors uppercase font-medium cursor-pointer"
          >
            OUR STORY
          </button>
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('/contact');
              } else {
                onOpenContact();
              }
            }}
            className="hover:text-[#9C4A2F] transition-colors uppercase font-medium cursor-pointer"
          >
            CONTACT
          </button>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          {currentView === 'staff' && (
            <button
              onClick={() => onSwitchView('customer')}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[#2B1810]/40 text-xs font-mono-code uppercase font-semibold text-[#2B1810] hover:bg-[#2B1810] hover:text-[#F5EFEB] active:scale-95 transition cursor-pointer"
            >
              CUSTOMER VIEW
            </button>
          )}

          {/* Cart / Shopping Bag Button */}
          {currentView === 'customer' && (
            <button
              onClick={onOpenCart}
              className="w-11 h-11 rounded-full bg-[#2B1810] text-[#F5EFEB] flex items-center justify-center relative hover:bg-[#3E241A] active:scale-95 transition-all shadow-sm cursor-pointer"
              aria-label="View shopping bag"
            >
              <ShoppingBag className="w-5 h-5 stroke-[2]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#DE8030] text-[#2B1810] font-mono-code font-bold text-xs rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-11 h-11 rounded-full border border-[#2B1810]/20 flex items-center justify-center text-[#2B1810] hover:bg-[#2B1810]/5 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2B1810]/10 bg-[#F5EFEB] px-6 py-5 flex flex-col gap-4 shadow-lg animate-in slide-in-from-top duration-200">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              if (onNavigate) {
                onNavigate('/menu');
              } else {
                if (currentView === 'staff') onSwitchView('customer');
                setTimeout(onScrollToMenu, 100);
              }
            }}
            className="text-left font-mono-code uppercase font-medium text-base text-[#2B1810] py-2 border-b border-[#2B1810]/10 cursor-pointer"
          >
            Menu
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              if (onNavigate) {
                onNavigate('/our-story');
              } else {
                onOpenStory();
              }
            }}
            className="text-left font-mono-code uppercase font-medium text-base text-[#2B1810] py-2 border-b border-[#2B1810]/10 cursor-pointer"
          >
            OUR STORY
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              if (onNavigate) {
                onNavigate('/contact');
              } else {
                onOpenContact();
              }
            }}
            className="text-left font-mono-code uppercase font-medium text-base text-[#2B1810] py-2 border-b border-[#2B1810]/10 cursor-pointer"
          >
            CONTACT
          </button>
          
          {currentView === 'staff' && (
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSwitchView('customer');
                }}
                className="w-full text-center py-2.5 rounded-full bg-[#2B1810] text-[#F5EFEB] text-xs font-mono-code uppercase font-semibold cursor-pointer"
              >
                BACK TO CUSTOMER VIEW
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
