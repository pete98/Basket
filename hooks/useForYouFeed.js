import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchProducts } from '../lib/api/products';

const HERO_PLACEHOLDER = require('../assets/for-you/A_user_interface_design_of_a_grocery_shopping_mobi.png');

const baseItems = [
  {
    id: 'hero-berry-kit',
    title: 'Sunrise Smoothie Stack',
    caption: "Your breakfast won't hit without this 😭",
    price: 14.5,
    image: HERO_PLACEHOLDER,
  },
  {
    id: 'umami-noodles',
    title: 'Midnight Umami Noodles',
    caption: 'Lowkey your fav item 😮‍💨',
    price: 9.75,
    image: 'https://images.unsplash.com/photo-1604908177453-7462950b1b63?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'snack-board',
    title: 'Cozy Snack Board',
    caption: 'Your comfort snack energy',
    price: 12.25,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'citrus-refresh',
    title: 'Citrus Glow Refresh',
    caption: 'Because you bought onions 🧅',
    price: 7.5,
    image: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'lazy-brunch',
    title: 'Lazy Brunch Staples',
    caption: 'This slaps, be fr 🔥',
    price: 16.0,
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'spice-bundle',
    title: 'Spice Rack Reset',
    caption: 'Upgrade the vibe, chef 🧑‍🍳',
    price: 11.35,
    image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'zero-proof',
    title: 'Zero-Proof Nightcap',
    caption: 'Your wind-down ritual rn',
    price: 13.99,
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'fresh-crunch',
    title: 'Fresh Crunch Salad Kit',
    caption: 'Hydrate but make it crunchy 🧊',
    price: 10.49,
    image: 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=1200&q=80',
  },
];

const captions = [
  "Your breakfast won't hit without this 😭",
  'Your comfort snack energy',
  'Because you bought onions 🧅',
  'Lowkey your fav item 😮‍💨',
  'This slaps, be fr 🔥',
  'Trust, chef would approve ✨',
  'You earned a cozy night in 🍜',
];

function buildBatch(multiplier) {
  return baseItems.map((item, index) => {
    const priceBump = ((multiplier + 1) * 0.22 + index * 0.07);
    return {
      ...item,
      id: `${item.id}-${multiplier}-${index}-${Date.now()}`,
      caption: captions[(index + multiplier) % captions.length],
      price: Number((item.price + priceBump).toFixed(2)),
      image: index === 0 ? HERO_PLACEHOLDER : item.image,
    };
  });
}

function buildCaption(product, index) {
  const pool = [
    `Fresh from ${product.brand || 'the market'} 💫`,
    `Pairs with ${product.categories || 'your staples'} 🛒`,
    'Swipe-worthy groceries 📸',
    'Add to your story-worthy haul ✨',
    'Chef-coded pick for tonight 🍝',
    'Algorithm thinks you need this 🤍',
  ];
  return pool[index % pool.length];
}

function mapProductToFeedItem(product, index) {
  return {
    id: product.id?.toString() || `inventory-${index}`,
    title: product.itemName || 'New pantry drop',
    caption: buildCaption(product, index),
    price: Number(product.price ?? 0),
    image: product.imageUrl || HERO_PLACEHOLDER,
  };
}

const PAGE_SIZE = 8;

export function useForYouFeed() {
  const [items, setItems] = useState(buildBatch(0));
  const [inventoryFeed, setInventoryFeed] = useState([]);
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const hasFetchedOnce = useRef(false);

  const heroPreview = useMemo(() => {
    const source = items[0]?.image;
    if (!source) return HERO_PLACEHOLDER;
    if (typeof source === 'string') {
      return { uri: source };
    }
    return source;
  }, [items]);

  const mergeWithFallback = useCallback((nextItems) => {
    if (!nextItems.length) {
      return buildBatch(0);
    }
    return nextItems;
  }, []);

  const hydrateFromProducts = useCallback(
    (products) => {
      const mapped = products.map(mapProductToFeedItem);
      const withFallback = mergeWithFallback(mapped);
      setInventoryFeed(withFallback);
      setItems(withFallback.slice(0, PAGE_SIZE));
      setPage(1);
    },
    [mergeWithFallback],
  );

  const fetchInventory = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const products = await fetchProducts();
      hydrateFromProducts(products);
      hasFetchedOnce.current = true;
    } catch (error) {
      console.warn('Failed to fetch inventory feed', error);
      if (!hasFetchedOnce.current) {
        hydrateFromProducts([]);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [hydrateFromProducts]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const refresh = useCallback(() => {
    fetchInventory();
  }, [fetchInventory]);

  const loadMore = useCallback(() => {
    if (isFetchingMore) return;
    if (inventoryFeed.length === 0) return;

    const nextPage = page + 1;
    const nextSlice = inventoryFeed.slice(0, nextPage * PAGE_SIZE);

    if (nextSlice.length === items.length) {
      return;
    }

    setIsFetchingMore(true);
    setTimeout(() => {
      setItems(nextSlice);
      setPage(nextPage);
      setIsFetchingMore(false);
    }, 300);
  }, [isFetchingMore, inventoryFeed, items.length, page]);

  return {
    items,
    refresh,
    loadMore,
    isRefreshing,
    isFetchingMore,
    heroPreview,
  };
}
