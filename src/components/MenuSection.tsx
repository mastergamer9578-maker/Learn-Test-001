import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Check, Loader2, UtensilsCrossed, ArrowRight } from 'lucide-react';
import { MenuItem } from '../types';
import { ProductDetailModal } from './ProductDetailModal';

interface CategoryMeta {
  bannerImage: string;
  tagline: string;
  badgeText: string;
}

// Curated high-resolution food photography & stylish metadata for category banners
const CATEGORY_META_MAP: Record<string, CategoryMeta> = {
  BURGERS: {
    bannerImage:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=80',
    tagline: '100% Smashed Beef & Crispy Chicken with Signature Sauces',
    badgeText: 'HOUSE SPECIALTY',
  },
  PIZZAS: {
    bannerImage:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Hand-Tossed Dough, Rich Marinara & Golden Bubbly Mozzarella',
    badgeText: 'STONE OVEN BAKED',
  },
  'FAST FOOD': {
    bannerImage:
      'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Crispy Golden Tenders, Loaded Fries & Sizzling Crunchy Bites',
    badgeText: 'HOT & CRISPY',
  },
  DEALS: {
    bannerImage:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Unbeatable Sharing Feasts & Value-Packed Combo Boxes',
    badgeText: 'MEGA VALUE',
  },
  DRINKS: {
    bannerImage:
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Chilled Ice Sodas, Refreshing Mocktails & Cold Brews',
    badgeText: 'CHILLED REFRESHMENT',
  },
  FRAPPE: {
    bannerImage:
      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Artisan Ice-Blended Coffee, Whipped Cream & Decadent Drizzles',
    badgeText: 'ICE BLENDED',
  },
  SMOOTHIES: {
    bannerImage:
      'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=1600&q=80',
    tagline: '100% Real Fruit Blends, Naturally Vibrant & Energizing',
    badgeText: 'PURE FRUIT',
  },
  SHAKES: {
    bannerImage:
      'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Thick Hand-Spun Gourmet Milkshakes with Sweet Toppings',
    badgeText: 'HAND SPUN',
  },
  DESSERTS: {
    bannerImage:
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Warm Molten Lava Cakes, Brownies & Sweet Treats',
    badgeText: 'SWEET INDULGENCE',
  },
  SIDES: {
    bannerImage:
      'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Seasoned French Fries, Mozzarella Sticks & Crispy Bites',
    badgeText: 'PERFECT SIDES',
  },
  CHICKEN: {
    bannerImage:
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Spicy Broast, Crispy Wings & Freshly Fried Chicken',
    badgeText: 'SPICY BROAST',
  },
  SANDWICHES: {
    bannerImage:
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Toasted Club Sandwiches, Paninis & Artisan Subs',
    badgeText: 'TOASTED FRESH',
  },
};

const DEFAULT_CATEGORY_META: CategoryMeta = {
  bannerImage:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
  tagline: "Chef's Signature Recipes, Freshly Prepared To Order",
  badgeText: 'KITCHEN SPECIAL',
};

// Resolve category metadata by direct key or fuzzy keyword match
const getCategoryMeta = (catName: string): CategoryMeta => {
  const norm = catName.trim().toUpperCase();
  if (CATEGORY_META_MAP[norm]) {
    return CATEGORY_META_MAP[norm];
  }
  const lower = norm.toLowerCase();
  if (lower.includes('burger')) return CATEGORY_META_MAP['BURGERS'];
  if (lower.includes('pizza')) return CATEGORY_META_MAP['PIZZAS'];
  if (lower.includes('fast') || lower.includes('fry') || lower.includes('fried') || lower.includes('snack')) {
    return CATEGORY_META_MAP['FAST FOOD'];
  }
  if (lower.includes('deal') || lower.includes('combo') || lower.includes('platter')) {
    return CATEGORY_META_MAP['DEALS'];
  }
  if (lower.includes('frappe')) return CATEGORY_META_MAP['FRAPPE'];
  if (lower.includes('smoothie')) return CATEGORY_META_MAP['SMOOTHIES'];
  if (lower.includes('shake')) return CATEGORY_META_MAP['SHAKES'];
  if (lower.includes('drink') || lower.includes('beverage') || lower.includes('soda') || lower.includes('juice')) {
    return CATEGORY_META_MAP['DRINKS'];
  }
  if (lower.includes('dessert') || lower.includes('cake') || lower.includes('sweet') || lower.includes('ice cream')) {
    return CATEGORY_META_MAP['DESSERTS'];
  }
  if (lower.includes('side') || lower.includes('finger') || lower.includes('appetizer')) {
    return CATEGORY_META_MAP['SIDES'];
  }
  if (lower.includes('chicken') || lower.includes('wing') || lower.includes('broast')) {
    return CATEGORY_META_MAP['CHICKEN'];
  }
  if (lower.includes('sandwich') || lower.includes('sub') || lower.includes('wrap')) {
    return CATEGORY_META_MAP['SANDWICHES'];
  }

  return DEFAULT_CATEGORY_META;
};

// Dedicated stylish banner header for each category section
const CategoryBanner: React.FC<{
  categoryName: string;
  itemCount: number;
  meta: CategoryMeta;
}> = ({ categoryName, itemCount, meta }) => {
  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden mb-5 sm:mb-7 border border-[#2B1810]/15 shadow-sm group">
      {/* Background Banner Photography with Smooth Scale on Hover */}
      <div className="relative h-32 sm:h-40 md:h-48 w-full bg-[#2B1810] overflow-hidden">
        <img
          src={meta.bannerImage}
          alt={categoryName}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Multi-layered Warm Cinematic Overlay for High Contrast Text */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#2B1810] via-[#2B1810]/80 sm:via-[#2B1810]/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2B1810]/60 via-transparent to-transparent" />
        <div className="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-[#DE8030]/20 blur-2xl pointer-events-none" />

        {/* Content Inside Banner */}
        <div className="relative h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 z-10">
          {/* Eyebrow & Dish Count Metadata */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-mono-code font-bold tracking-[0.25em] text-[#DE8030] uppercase">
              {meta.badgeText}
            </span>
            <span className="text-[#F5EFEB]/40 text-xs select-none">·</span>
            <span className="text-[10px] sm:text-xs font-mono-code text-[#F5EFEB]/80">
              {itemCount} {itemCount === 1 ? 'Dish' : 'Dishes'}
            </span>
          </div>

          {/* Category Title & Tagline */}
          <div>
            <h3 className="font-display font-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[#F5EFEB] uppercase tracking-tight leading-none drop-shadow-sm">
              {categoryName}
            </h3>
            <p className="font-mono-code text-[11px] sm:text-xs text-[#F5EFEB]/85 max-w-lg line-clamp-1 mt-1 sm:mt-1.5 hidden xs:block">
              {meta.tagline}
            </p>
          </div>
        </div>

        {/* Decorative subtle brand tag on the right for desktop */}
        <div className="hidden lg:flex absolute right-6 bottom-6 items-center gap-2 bg-[#2B1810]/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[#F5EFEB]/80 text-[10px] font-mono-code font-bold tracking-widest uppercase">
          <span>SHAN FAST FOODS</span>
        </div>
      </div>
    </div>
  );
};

// Customer-facing single product card
const ProductCard: React.FC<{
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  onAdd: (item: MenuItem) => void;
  isJustAdded: boolean;
}> = ({ item, onSelect, onAdd, isJustAdded }) => {
  const hasDiscount = Boolean(item.originalPrice && item.originalPrice > item.price);
  const discountPercentage = hasDiscount
    ? Math.round((((item.originalPrice as number) - item.price) / (item.originalPrice as number)) * 100)
    : 0;

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group flex flex-col justify-between bg-[#ECE4D8]/80 hover:bg-[#ECE4D8] border border-[#2B1810]/15 rounded-2xl sm:rounded-3xl p-2 sm:p-3 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none ${
        !item.isAvailable ? 'opacity-65 grayscale' : ''
      }`}
    >
      {/* Food Image Container */}
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
      </div>

      {/* Content Container below image */}
      <div className="pt-2 px-1 flex flex-col flex-grow justify-between">
        <div>
          {/* Category Label */}
          <div className="text-[9px] sm:text-[10px] font-mono-code font-bold tracking-[0.18em] text-[#C46726] uppercase mb-0.5 truncate">
            {item.category}
          </div>

          {/* Dish Name */}
          <h4 className="font-display font-black text-sm sm:text-base md:text-xl text-[#2B1810] uppercase tracking-tight leading-snug line-clamp-1 group-hover:text-[#A24E2B] transition-colors">
            {item.name}
          </h4>

          {/* Description */}
          <p className="font-mono-code text-[10px] sm:text-xs text-[#2B1810]/70 line-clamp-1 mt-0.5 leading-relaxed hidden sm:block">
            {item.description}
          </p>
        </div>

        {/* Pricing & Circular "+" Add Button */}
        <div className="pt-2 mt-2 border-t border-[#2B1810]/10 flex items-center justify-between gap-2">
          <div className="flex items-baseline flex-wrap gap-1.5 min-w-0">
            <span className="font-display font-black text-sm sm:text-base md:text-xl text-[#2B1810] leading-none">
              PKR {item.price.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="font-mono-code line-through text-[10px] sm:text-xs text-[#2B1810]/45">
                PKR {(item.originalPrice as number).toLocaleString()}
              </span>
            )}
          </div>

          {/* Circular "+" Add Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(item);
            }}
            disabled={!item.isAvailable}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm cursor-pointer z-10 active:scale-90 ${
              isJustAdded
                ? 'bg-[#2E7D32] text-white scale-105 shadow-md'
                : 'bg-[#2B1810] text-[#F5EFEB] hover:bg-[#DE8030] hover:text-[#2B1810] hover:shadow-md'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            aria-label={`Quick add ${item.name} to bag`}
            title={item.isAvailable ? 'Quick add to bag' : 'Sold out'}
          >
            {isJustAdded ? (
              <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            ) : (
              <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface MenuSectionProps {
  items: MenuItem[];
  categories?: string[];
  onAddToCart: (item: MenuItem, quantity?: number) => void;
  isLoading?: boolean;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  items,
  categories,
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

  // Dynamically compute all customer-facing categories: 'ALL' + presets + custom categories + live product categories
  const dynamicCategories = useMemo(() => {
    const defaultList = ['BURGERS', 'PIZZAS', 'FAST FOOD', 'DEALS', 'DRINKS', 'FRAPPE', 'SMOOTHIES'];
    const propCats = (categories || []).map((c) => c.trim().toUpperCase()).filter(Boolean);
    const itemCats = items.map((i) => (i.category || '').trim().toUpperCase()).filter(Boolean);
    const allUnique = Array.from(new Set([...defaultList, ...propCats, ...itemCats]));
    return ['ALL', ...allUnique];
  }, [categories, items]);

  // Dynamically group products by category
  const categoryGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normSelected = selectedCategory.trim().toUpperCase();

    // 1. Gather all unique category names present in items and configured categories
    const defaultOrder = [
      'BURGERS',
      'PIZZAS',
      'FAST FOOD',
      'DEALS',
      'DRINKS',
      'FRAPPE',
      'SMOOTHIES',
      'SHAKES',
      'DESSERTS',
      'SIDES',
      'CHICKEN',
      'SANDWICHES',
    ];

    const propCats = (categories || []).map((c) => c.trim().toUpperCase()).filter(Boolean);
    const itemCats = items.map((i) => (i.category || '').trim().toUpperCase()).filter(Boolean);

    // Build the ordered master category list
    const masterCategories: string[] = [];
    defaultOrder.forEach((cat) => {
      if (itemCats.includes(cat) || propCats.includes(cat)) {
        if (!masterCategories.includes(cat)) masterCategories.push(cat);
      }
    });
    // Add any remaining categories
    [...propCats, ...itemCats].forEach((cat) => {
      if (!masterCategories.includes(cat)) masterCategories.push(cat);
    });

    // 2. Group items into their respective categories
    const groups = masterCategories
      .map((catName) => {
        const catItems = items.filter((item) => {
          const itemCat = (item.category || '').trim().toUpperCase();
          if (itemCat !== catName) return false;

          // Keyword search filtering
          if (!query) return true;
          return (
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            itemCat.toLowerCase().includes(query)
          );
        });

        return {
          category: catName,
          items: catItems,
        };
      })
      .filter((group) => {
        // If a specific category is selected, filter to that category only
        if (normSelected !== 'ALL' && group.category !== normSelected) {
          return false;
        }
        // Only include groups that have products
        return group.items.length > 0;
      });

    // 3. Collect any uncategorized items into a fallback group
    const uncategorizedItems = items.filter((item) => {
      const itemCat = (item.category || '').trim().toUpperCase();
      if (itemCat && masterCategories.includes(itemCat)) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });

    if (uncategorizedItems.length > 0 && (normSelected === 'ALL' || normSelected === 'OTHER')) {
      groups.push({
        category: 'CHEF SPECIALTIES',
        items: uncategorizedItems,
      });
    }

    return groups;
  }, [items, categories, searchQuery, selectedCategory]);

  // Total matching products count across all groups
  const totalMatchingProducts = useMemo(() => {
    return categoryGroups.reduce((acc, g) => acc + g.items.length, 0);
  }, [categoryGroups]);

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10">
        <div>
          <div className="text-xs font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase mb-1.5">
            PICK YOUR MOOD
          </div>
          <h2 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-[#2B1810] uppercase tracking-tight">
            WHAT ARE YOU CRAVING?
          </h2>
        </div>

        {/* Search Bar */}
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono-code text-[#2B1810]/60 hover:text-[#2B1810] cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Wrapper with Fade Indicators and Scroll Tracking */}
      <div className="relative mb-8 sm:mb-12">
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
          {dynamicCategories.map((cat) => {
            const isActive = selectedCategory.trim().toUpperCase() === cat.trim().toUpperCase();
            return (
              <button
                key={cat}
                type="button"
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
        </div>
      </div>

      {/* Active Filter or Search Status Info Bar */}
      {(selectedCategory !== 'ALL' || searchQuery) && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 px-4 py-3 rounded-2xl bg-[#ECE4D8]/60 border border-[#2B1810]/10">
          <div className="flex items-center gap-2 text-xs font-mono-code text-[#2B1810]/80">
            <span>Showing:</span>
            {selectedCategory !== 'ALL' && (
              <span className="font-bold text-[#DE8030] uppercase">
                {selectedCategory}
              </span>
            )}
            {selectedCategory !== 'ALL' && searchQuery && <span>•</span>}
            {searchQuery && (
              <span>
                Matching &quot;<strong className="text-[#2B1810]">{searchQuery}</strong>&quot;
              </span>
            )}
            <span>
              ({totalMatchingProducts} {totalMatchingProducts === 1 ? 'dish' : 'dishes'} in {categoryGroups.length}{' '}
              {categoryGroups.length === 1 ? 'section' : 'sections'})
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="text-xs font-mono-code font-bold text-[#9C4A2F] hover:text-[#7A3620] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Show All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading && items.length === 0 ? (
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
            The Firestore{' '}
            <span className="bg-[#2B1810]/10 px-1.5 py-0.5 rounded text-[#2B1810] font-bold">
              products
            </span>{' '}
            collection is currently empty.
          </p>
          <p className="font-mono-code text-[11px] text-[#2B1810]/50 max-w-sm mx-auto">
            Authorized staff can add live menu items from the Staff Access dashboard.
          </p>
        </div>
      ) : categoryGroups.length === 0 ? (
        <div className="text-center py-20 bg-[#ECE4D8]/40 rounded-3xl border border-dashed border-[#2B1810]/20 px-4">
          <div className="font-display text-2xl text-[#2B1810] uppercase mb-2">
            No dishes found {searchQuery ? `matching "${searchQuery}"` : `in ${selectedCategory}`}
          </div>
          <p className="font-mono-code text-xs text-[#2B1810]/70 mb-4">
            Try adjusting your search terms or view all categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="px-5 py-2 bg-[#2B1810] text-[#F5EFEB] rounded-full text-xs font-mono-code uppercase font-semibold cursor-pointer hover:bg-[#DE8030] hover:text-[#2B1810] transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Category-Wise Sections with Individual Banners */
        <div className="space-y-12 sm:space-y-16">
          {categoryGroups.map((group) => {
            const meta = getCategoryMeta(group.category);
            const sectionId = `category-${group.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

            return (
              <section
                key={group.category}
                id={sectionId}
                className="scroll-mt-24 animate-in fade-in duration-300"
              >
                {/* 2. Dedicated Category Banner */}
                <CategoryBanner
                  categoryName={group.category}
                  itemCount={group.items.length}
                  meta={meta}
                />

                {/* 3. Products belonging strictly to this category in a clean grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {group.items.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      onSelect={setSelectedProduct}
                      onAdd={handleAdd}
                      isJustAdded={Boolean(addedItemIds[item.id])}
                    />
                  ))}
                </div>
              </section>
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
