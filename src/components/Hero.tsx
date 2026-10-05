import React, { useState } from 'react';
import { ArrowRight, Clock, Flame } from 'lucide-react';
import { FALLBACK_HERO_IMAGE } from '../data/initialMenu';

interface HeroProps {
  heroImage: string;
  onOrderOnline: () => void;
  onExploreSignature: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  heroImage,
  onOrderOnline,
  onExploreSignature,
}) => {
  const [imgSrc, setImgSrc] = useState(heroImage);

  // Sync if heroImage changes from staff panel
  React.useEffect(() => {
    setImgSrc(heroImage);
  }, [heroImage]);

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Bold Typography & Narrative */}
          <div className="lg:col-span-6 flex flex-col items-start">
            
            {/* Location & Establishment Badge */}
            <div className="flex items-center gap-2 text-xs font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase mb-4">
              <span className="w-2 h-2 rounded-full bg-[#C46726] inline-block animate-pulse"></span>
              <span>KORANGI, KARACHI • EST. 2019</span>
            </div>

            {/* Giant Display Title */}
            <h1 className="font-display font-black text-6xl sm:text-7xl lg:text-8xl leading-[0.88] tracking-tight uppercase text-[#2B1810] select-none">
              <span className="block">FRESH.</span>
              <span className="block text-[#A24E2B]">FAST.</span>
              <span className="block">FULL OF</span>
              <span className="block">FLAVOUR.</span>
            </h1>

            {/* Orange Underline Accent Bar */}
            <div className="w-16 h-2 bg-[#DE8030] rounded-sm mt-3 mb-6"></div>

            {/* Monospace Subtitle Description */}
            <p className="font-mono-code text-sm sm:text-base text-[#2B1810]/80 max-w-md leading-relaxed mb-8">
              Cray cravings, locked down. From crispy fried chicken to fire-baked pizzas, we make comfort food worth coming back for.
            </p>

            {/* CTA & Delivery Estimate */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-6">
              <button
                onClick={onOrderOnline}
                className="px-7 py-3.5 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code text-xs uppercase tracking-wider font-bold hover:bg-[#3E241A] active:scale-95 transition-all shadow-md flex items-center gap-2.5 cursor-pointer group"
              >
                <span>ORDER ONLINE</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-2 text-xs font-mono-code text-[#2B1810]/75">
                <Clock className="w-4 h-4 text-[#C46726]" />
                <span>25-35 min delivery</span>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Food Platter Imagery & Card Badge */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-xl lg:max-w-none">
              {/* Outer decorative soft border */}
              <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-[#2B1810]/15 shadow-xl bg-[#EFE8DE] aspect-[4/3] sm:aspect-[16/11]">
                <img
                  src={imgSrc}
                  alt="Shan Fast Food signature burgers and fries spread"
                  onError={() => setImgSrc(FALLBACK_HERO_IMAGE)}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
                  loading="eager"
                />
              </div>

              {/* Floating Signature Tag Card */}
              <div 
                onClick={onExploreSignature}
                className="absolute -bottom-5 sm:-bottom-6 left-4 sm:left-8 right-4 sm:right-auto bg-[#F5EFEB]/95 backdrop-blur-md border border-[#2B1810]/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4 cursor-pointer hover:border-[#DE8030]/40 transition group"
              >
                <div>
                  <div className="text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#C46726] uppercase">
                    THE SIGNATURE
                  </div>
                  <div className="font-display font-black text-xl sm:text-2xl text-[#2B1810] uppercase tracking-tight group-hover:text-[#A24E2B] transition-colors">
                    MAKE ROOM FOR FLAVOUR.
                  </div>
                </div>

                <div className="w-11 h-11 rounded-full bg-[#DE8030] text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5 fill-white stroke-none" />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
