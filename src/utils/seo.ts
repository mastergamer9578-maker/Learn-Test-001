export interface PageSEOConfig {
  title: string;
  description: string;
  canonicalPath: string;
}

export const ROUTE_SEO: Record<string, PageSEOConfig> = {
  home: {
    title: 'Shan Fast Food · Korangi, Karachi | Fresh Burgers & Pizzas',
    description: 'Shan Fast Food in Korangi, Karachi (Est. 2019). Fresh, fast, full of flavour handcrafted burgers, fire-baked pizzas, and crispy fried comfort food.',
    canonicalPath: '/',
  },
  menu: {
    title: 'Menu & Deals | Shan Fast Food · Korangi, Karachi',
    description: 'Explore our full menu of crispy zinger burgers, cheesy pizzas, loaded fries, family deals, and chilled drinks. Fast delivery across Korangi.',
    canonicalPath: '/menu',
  },
  story: {
    title: 'Our Story & Kitchen Heritage | Shan Fast Food',
    description: 'Discover the journey of Shan Fast Food since 2019. Authentic halal comfort food crafted with love, secret spice blends, and fire-grilled mastery in Karachi.',
    canonicalPath: '/our-story',
  },
  contact: {
    title: 'Contact Us & Delivery Helpline | Shan Fast Food',
    description: 'Get in touch with Shan Fast Food in Sector 31-D Korangi, Karachi. Call 0321 555 2199 for fast order delivery and customer inquiries.',
    canonicalPath: '/contact',
  },
  staff: {
    title: 'Staff Portal | Shan Fast Food',
    description: 'Secure staff, kitchen operations, and store management access portal for Shan Fast Food.',
    canonicalPath: '/staff',
  },
  notFound: {
    title: '404 Page Not Found | Shan Fast Food',
    description: 'The dish or page you are looking for is off the menu. Return to Shan Fast Food homepage or browse our full menu.',
    canonicalPath: '/404',
  },
};

export function updatePageSEO(config: PageSEOConfig) {
  if (typeof document === 'undefined') return;

  // 1. Update Document Title
  document.title = config.title;

  // 2. Helper to set or create meta tag
  const setMeta = (selector: string, attrName: string, attrVal: string, content: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 3. Meta Descriptions & OpenGraph
  setMeta('meta[name="description"]', 'name', 'description', config.description);
  setMeta('meta[property="og:title"]', 'property', 'og:title', config.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', config.description);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', config.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', config.description);

  // 4. Update canonical link
  const origin = window.location.origin;
  const canonicalUrl = `${origin}${config.canonicalPath}`;
  setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);

  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);
}
