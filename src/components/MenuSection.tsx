import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Check, Loader2, UtensilsCrossed } from 'lucide-react';
import { MenuItem } from '../types';
import { ProductDetailModal } from './ProductDetailModal';

interface MenuSectionProps {
  items: MenuItem[];
  onAddToCart: (item: MenuItem, quantity?: number) => void;
  isLoading?: boolean;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  items,
  onAddToCart,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  
  // Mobile horizontal scroll tracking state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const categories = ['ALL', 'BURGERS', 'PIZZAS', 'FAST FOOD', 'DEALS'];

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 0) {
      const progress = Math.min(Math.max(el.scrollLeft / maxScroll, 0), 1);
      setScrollProgress(progress);
      setCanScrollLeft(el.scrollLeft > 6);
      setCanScrollRight(el.scrollLeft < maxScroll - 6);
    } else {
      setScrollProgress(0);
      setCanScrollLeft(false);
      setCanScrollRight(false);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState]);

  const handleCategoryClick = (cat: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedCategory(cat);
    // Smoothly center the clicked category pill on mobile
    e.currentTarget.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (item: MenuItem) => {
    onAddToCart(item);
    setAddedItemIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [item.id]: false }));
    }, 1200);
  };

  return (
    <section id="menu-section" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="text-xs font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase mb-1.5">
            PICK YOUR MOOD
          </div>
          <h2 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-[#2B1810] uppercase tracking-tight">
            WHAT ARE YOU CRAVING?
          </h2>
        </div>

        {/* Search Bar matching screenshot */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FIND A DISH"
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-[#2B1810]/20 bg-[#ECE4D8]/80 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/50 placeholder:font-mono-code focus:outline-none focus:ring-2 focus:ring-[#DE8030] focus:border-transparent transition-all shadow-inner"
          />
          <Search className="w-4 h-4 text-[#2B1810]/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono-code text-[#2B1810]/60 hover:text-[#2B1810]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Wrapper with Fade Indicators and Scroll Tracking */}
      <div className="relative mb-10">
        {/* Left Fade Indicator on Mobile */}
        <div
          className={`md:hidden absolute left-0 top-0 bottom-6 w-8 bg-gradient-to-r from-[#F5EFEB] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Right Fade Indicator on Mobile */}
        <div
          className={`md:hidden absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-[#F5EFEB] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Category Filter Pills (Horizontal scrollable with smooth physics) */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollState}
          className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none scroll-smooth touch-pan-x overscroll-x-contain select-none px-1"
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={(e) => handleCategoryClick(cat, e)}
                className={`px-6 py-2.5 rounded-full font-mono-code text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer select-none shrink-0 ${
                  isActive
                    ? 'bg-[#2B1810] text-[#F5EFEB] font-bold shadow-md scale-105'
                    : 'bg-[#ECE4D8] text-[#2B1810]/75 hover:bg-[#E2D8C9] font-medium'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Subtle Bottom Slider Track Line beneath the category pills (Visible on Mobile) */}
        <div className="md:hidden flex flex-col items-center justify-center pt-2">
          <div className="w-28 h-1 bg-[#2B1810]/15 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-[#DE8030] rounded-full transition-transform duration-100 ease-out"
              style={{
                width: '40%',
                transform: `translateX(${scrollProgress * 150}%)`,
              }}
            />
          </div>
          <span className="text-[9px] font-mono-code text-[#2B1810]/40 uppercase tracking-widest mt-1">
            Swipe categories
          </span>
        </div>
      </div>

      {/* Food Cards Grid */}
      {isLoading ? (
        <div className="text-center py-24 bg-[#ECE4D8]/30 rounded-3xl border border-dashed border-[#2B1810]/15 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#DE8030] animate-spin mb-3" />
          <h3 className="font-display font-black text-xl text-[#2B1810] uppercase">
            CONNECTING TO FIRESTORE...
          </h3>
          <p className="font-mono-code text-xs text-[#2B1810]/60 mt-1">
            Fetching live products directly from cloud database
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 px-4 bg-[#ECE4D8]/40 rounded-3xl border border-dashed border-[#2B1810]/20 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#DE8030]/15 text-[#DE8030] flex items-center justify-center mb-3">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h3 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase mb-1">
            NO PRODUCTS AVAILABLE
          </h3>
          <p className="font-mono-code text-xs text-[#2B1810]/70 max-w-md mx-auto mb-2 leading-relaxed">
            The Firestore <span className="bg-[#2B1810]/10 px-1.5 py-0.5 rounded text-[#2B1810] font-bold">products</span> collection is currently empty.
          </p>
          <p className="font-mono-code text-[11px] text-[#2B1810]/50 max-w-sm mx-auto">
            Authorized staff can add live menu items from the Staff Access dashboard.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-[#ECE4D8]/40 rounded-3xl border border-dashed border-[#2B1810]/20">
          <div className="font-display text-2xl text-[#2B1810] uppercase mb-2">
            No dishes found matching &quot;{searchQuery}&quot;
          </div>
          <p className="font-mono-code text-xs text-[#2B1810]/70 mb-4">
            Try adjusting your search terms or category filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="px-5 py-2 bg-[#2B1810] text-[#F5EFEB] rounded-full text-xs font-mono-code uppercase font-semibold cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {filteredItems.map((item) => {
            const isJustAdded = addedItemIds[item.id];
            const hasDiscount = Boolean(item.originalPrice && item.originalPrice > item.price);
            const discountPercentage = hasDiscount
              ? Math.round((((item.originalPrice as number) - item.price) / (item.originalPrice as number)) * 100)
              : 0;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedProduct(item)}
                className={`group flex flex-col justify-between bg-[#ECE4D8]/80 hover:bg-[#ECE4D8] border border-[#2B1810]/15 rounded-2xl sm:rounded-3xl p-2 sm:p-3 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none ${
                  !item.isAvailable ? 'opacity-65 grayscale' : ''
                }`}
              >
                {/* Food Image Container with smooth rounded corners */}
                <div className="relative aspect-square sm:aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-[#E2D8C9]">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />

                  {/* Top Left Tag / Badge */}
                  {item.tag && (
                    <div className="absolute top-2 left-2 bg-[#F5EFEB]/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono-code font-bold tracking-wider text-[#2B1810] shadow-xs">
                      {item.tag}
                    </div>
                  )}

                  {/* Discount Percentage Badge (Top-Right) */}
                  {hasDiscount && (
                    <div className="absolute top-2 right-2 bg-[#9C4A2F] text-white px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono-code font-black tracking-wider shadow-xs">
                      -{discountPercentage}%
                    </div>
                  )}

                  {/* Sold Out Overlay */}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center z-10">
                      <span className="bg-[#2B1810] text-white text-[10px] sm:text-xs font-mono-code px-2.5 py-1 rounded-full uppercase tracking-widest font-bold">
                        Sold Out
                      </span>
                    </div>
                  )}

                  {/* Prominent Circular "+" Add Button directly on Bottom-Right of Image */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd(item);
                    }}
                    disabled={!item.isAvailable}
                    className={`absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer z-10 active:scale-90 ${
                      isJustAdded
                        ? 'bg-[#2E7D32] text-white scale-110 shadow-lg'
                        : 'bg-[#2B1810] text-[#F5EFEB] hover:bg-[#DE8030] hover:text-[#2B1810]'
                    }`}
                    aria-label={`Quick add ${item.name} to bag`}
                    title="Quick add to bag"
                  >
                    {isJustAdded ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    ) : (
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    )}
                  </button>
                </div>

                {/* Content Container below image */}
                <div className="pt-2 px-1 flex flex-col flex-grow justify-between">
                  <div>
                    {/* Category Label */}
                    <div className="text-[9px] sm:text-[10px] font-mono-code font-bold tracking-[0.18em] text-[#C46726] uppercase mb-0.5 truncate">
                      {item.category}
                    </div>

                    {/* Dish Name */}
                    <h3 className="font-display font-black text-sm sm:text-base md:text-xl text-[#2B1810] uppercase tracking-tight leading-snug line-clamp-1 group-hover:text-[#A24E2B] transition-colors">
                      {item.name}
                    </h3>

                    {/* Description */}
                    <p className="font-mono-code text-[10px] sm:text-xs text-[#2B1810]/70 line-clamp-1 mt-0.5 leading-relaxed hidden sm:block">
                      {item.description}
                    </p>
                  </div>

                  {/* Pricing: Price and Original Slashed Price */}
                  <div className="pt-2 mt-1.5 border-t border-[#2B1810]/10 flex items-baseline justify-between">
                    <div className="flex items-baseline flex-wrap gap-1.5">
                      <span className="font-display font-black text-sm sm:text-base md:text-xl text-[#2B1810]">
                        PKR {item.price.toLocaleString()}
                      </span>
                      {hasDiscount && (
                        <span className="font-mono-code line-through text-[10px] sm:text-xs text-[#2B1810]/45">
                          PKR {(item.originalPrice as number).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        item={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(item, qty) => onAddToCart(item, qty)}
      />
    </section>
  );
};
