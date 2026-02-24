import { ProductCard } from '@/components/product-card';
import { ThemedText } from '@/components/themed-text';
import { useLocation } from '@/contexts/location-context';
import { useCart } from '@/contexts/cart-context';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { AGENT_EVENTS, agentBus, SelectCategoryPayload } from '@/lib/agent-bus';
import { getApiUrl, getInventoryServiceBaseUrl } from '@/lib/api/client';
import { getAutocompleteSuggestions, searchProducts } from '@/lib/api/search';
import { getStoreCategories, getStoreHomeLayout, getStoreInventory } from '@/lib/api/stores';
import { getActiveStore, getUserByAuth0 } from '@/lib/api/users';
import { Category, StoreHomeLayout } from '@/lib/types/api';
import { UIProduct } from '@/lib/types/ui';
import { buildCategoryNameCandidates } from '@/lib/utils/category';
import { formatWeight, mapApiProductToProduct, mapSearchHitToProduct } from '@/lib/utils/products';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Calculate category card width: (screen width - glass margins - glass padding - gaps) / cards per row
// Glass container: 16px left + 16px right margins = 32px, 16px padding each side = 32px total
// Compact design: smaller square/circular cards for horizontal scroll
const CATEGORY_CARD_SIZE = 64; // Compact square cards
const CATEGORY_CARD_HEIGHT = 64;
// Product card width for horizontal lists - shows ~2.5 cards at once
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 32 - 24) / 2.5; // Screen width - padding (16*2) - gaps (12*2) / 2.5 cards
const BACK_BUTTON_SIZE = 54;

// Default category display order for home page
// Match by both code and displayName for flexibility
const DEFAULT_CATEGORY_CODES = [
  'DAIRY_EGGS',
  'SNACKS_CHIPS',
  'BEV_SODA',
];

const DEFAULT_CATEGORY_NAMES = [
  'Soda',
  'Candy',
  'Dairy',
  'Snacks',
  'Energy',
];

const ACCESS_TOKEN_KEY = 'auth0_access_token';

function tintWithAlpha(hexColor: string, alpha: number, fallback: string) {
  if (!hexColor) return fallback;
  const sanitized = hexColor.replace('#', '');
  const normalized = sanitized.length === 3
    ? sanitized.split('').map((char) => char + char).join('')
    : sanitized;
  if (normalized.length !== 6) return fallback;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return fallback;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Mock Data

interface HeroOfferCard {
  id: string;
  title: string;
  value: string;
  detail: string;
  image: ImageSourcePropType;
}

interface HomeCategoryEntry {
  category: Category;
  sectionTitle: string;
}

const heroCards: HeroOfferCard[] = [
  {
    id: 'membership',
    title: 'Membership',
    value: 'Standard',
    detail: '0.00 cashback',
    image: require('../../assets/for-you/A_user_interface_design_of_a_grocery_shopping_mobi.png'),
  },
  {
    id: 'purchase-power',
    title: 'Purchase Power',
    value: 'Boosted',
    detail: 'Action required',
    image: require('../../assets/for-you/A_user_interface_design_of_a_grocery_shopping_mobi.png'),
  },
  {
    id: 'milk-deal',
    title: 'Fresh Dairy',
    value: 'Milk',
    detail: 'Buy 1 get 1',
    image: { uri: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800' },
  },
  {
    id: 'soda-deal',
    title: 'Sparkling',
    value: 'Soda',
    detail: '2 for $5',
    image: { uri: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800' },
  },
  {
    id: 'fruit-deal',
    title: 'Fresh Picks',
    value: 'Fruits',
    detail: 'Seasonal drop',
    image: { uri: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800' },
  },
  {
    id: 'bakery-deal',
    title: 'Bakery',
    value: 'Daily',
    detail: 'Warm & fresh',
    image: { uri: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800' },
  },
  {
    id: 'coffee-deal',
    title: 'Morning Brew',
    value: 'Coffee',
    detail: 'New blends',
    image: { uri: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800' },
  },
];

function buildHeroCards(imageLinks: string[], sectionTitle?: string): HeroOfferCard[] {
  if (imageLinks.length === 0) return heroCards;
  const normalizedTitle = sanitizeCategoryTitle(sectionTitle?.trim() || 'Top Deals');
  return imageLinks.map((link, index) => ({
    id: `hero-${index}`,
    title: normalizedTitle,
    value: `Deal ${index + 1}`,
    detail: 'Limited-time offer',
    image: { uri: link },
  }));
}

function dedupeProductsById(items: UIProduct[]): UIProduct[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getActiveStoreId(activeStore: unknown): number | null {
  if (!activeStore || typeof activeStore !== 'object') return null;
  const store = activeStore as { storeId?: number | string; id?: number | string };

  if (typeof store.storeId === 'number') return store.storeId;
  if (typeof store.storeId === 'string') {
    const parsedStoreId = Number.parseInt(store.storeId, 10);
    if (!Number.isNaN(parsedStoreId)) return parsedStoreId;
  }

  if (typeof store.id === 'number') return store.id;
  if (typeof store.id === 'string') {
    const parsedId = Number.parseInt(store.id, 10);
    if (!Number.isNaN(parsedId)) return parsedId;
  }

  return null;
}

function parseStoreId(locationId: string): number | null {
  if (!locationId.startsWith('store-')) return null;
  const rawId = locationId.replace('store-', '');
  const parsedStoreId = Number.parseInt(rawId, 10);
  if (Number.isNaN(parsedStoreId)) return null;
  return parsedStoreId;
}

function normalizeCategoryValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function tokenizeCategoryValue(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(/[,/|>]/)
    .map((token) => normalizeCategoryValue(token))
    .filter((token) => token.length > 0);
}

function sanitizeCategoryTitle(value: string): string {
  return value
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/[\u200D\uFE0E\uFE0F\u20E3]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function coerceNumberArray(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => coerceNumber(value))
    .filter((value): value is number => value !== null);
}

function sanitizeImageLinks(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);
}

function buildSyntheticCategory(categoryId: number, title?: string | null): Category {
  const fallbackTitle = sanitizeCategoryTitle(title?.trim() || `Category ${categoryId}`);
  return {
    id: categoryId,
    code: `CATEGORY_${categoryId}`,
    displayName: fallbackTitle,
    description: '',
    createdAt: '',
    updatedAt: '',
  };
}

function buildCategoryCandidateSet(category: Category): Set<string> {
  const candidates = new Set<string>();
  const names = buildCategoryNameCandidates(category);
  names.forEach((name) => {
    const normalized = normalizeCategoryValue(name);
    if (normalized) candidates.add(normalized);
    tokenizeCategoryValue(name).forEach((token) => candidates.add(token));
  });
  candidates.add(normalizeCategoryValue(category.displayName));
  candidates.add(normalizeCategoryValue(category.code));
  return candidates;
}

function buildCategoryProductsMap(
  storeProducts: UIProduct[],
  categories: Category[]
): Record<number, UIProduct[]> {
  const map: Record<number, UIProduct[]> = {};
  const categoryCandidates = categories.map((category) => ({
    categoryId: category.id,
    candidates: buildCategoryCandidateSet(category),
  }));

  categories.forEach((category) => {
    map[category.id] = [];
  });

  storeProducts.forEach((product) => {
    const tokens = tokenizeCategoryValue(product.category || '');
    if (tokens.length === 0) return;

    const match = categoryCandidates.find(({ candidates }) =>
      tokens.some((token) => candidates.has(token))
    );
    if (!match) return;

    map[match.categoryId].push(product);
  });

  return map;
}

function HeroSection({
  imageLinks,
  title,
}: {
  imageLinks: string[];
  title?: string;
}) {
  const { width } = useWindowDimensions();
  const heroCardSize = Math.min(220, Math.round(width * 0.52));
  const snapInterval = heroCardSize + 14;
  const cards = buildHeroCards(imageLinks, title);

  return (
    <View style={[styles.heroSection, { minHeight: heroCardSize + 64 }]}>
      <View style={[styles.heroBackdrop, { height: heroCardSize + 92 }]}>
        <View style={styles.heroGlowTop} />
        <View style={styles.heroGlowBottom} />
      </View>
      <FlatList
        data={cards}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.heroCardsRow}
        renderItem={({ item }) => (
          <ImageBackground
            source={item.image}
            style={[styles.heroCard, { width: heroCardSize, height: heroCardSize }]}
            imageStyle={styles.heroCardImage}
          />
        )}
      />
    </View>
  );
}

function CategoryCard({
  category,
  isSelected,
  onPress,
}: {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        isSelected && styles.categoryPillSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.72}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <ThemedText
        style={[
          styles.categoryPillLabel,
          isSelected && styles.categoryPillLabelSelected,
        ]}
        numberOfLines={1}
      >
        {sanitizeCategoryTitle(category.displayName)}
      </ThemedText>
    </TouchableOpacity>
  );
}

function ProductSection({ 
  title, 
  products,
  onProductPress,
  onSeeAll,
}: { 
  title: string; 
  products: UIProduct[];
  onProductPress: (product: UIProduct) => void;
  onSeeAll: () => void;
 }) {
  // Show section even if empty (for debugging - helps see which categories are loaded)
  const hasProducts = products && products.length > 0;
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {sanitizeCategoryTitle(title)}
          </ThemedText>
        </View>
        {hasProducts && (
        <TouchableOpacity onPress={onSeeAll} accessibilityRole="button">
            <ThemedText style={styles.seeAllText}>See All</ThemedText>
          </TouchableOpacity>
        )}
      </View>
      {hasProducts ? (
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productList}
          renderItem={({ item }) => (
            <View style={styles.productCardWrapper}>
              <ProductCard product={item} onPress={onProductPress} />
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>
            No products in this category yet
          </ThemedText>
        </View>
      )}

    </View>
  );
}


export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useLocation();
  const { isLoggedIn, openLogin } = useAuthGuard();
  const { getCredentials } = useAuth0();
  const { addItem, updateQuantity, state } = useCart();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchTransition = useRef(new Animated.Value(0)).current;
  const BACK_BUTTON_SIZE = 54;
  const [categorySectionHeight, setCategorySectionHeight] = useState(0);
  const [isCategoryHidden, setIsCategoryHidden] = useState(false);
  const scrollOffsetRef = useRef(0);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UIProduct | null>(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [addButtonState, setAddButtonState] = useState<'idle' | 'added'>('idle');
  const addToCartScale = useRef(new Animated.Value(1)).current;
  const skeletonPulse = useRef(new Animated.Value(0.55)).current;
  const addButtonFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeModalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const deltaY = offsetY - scrollOffsetRef.current;
    if (Math.abs(deltaY) < 10) {
      scrollOffsetRef.current = offsetY;
      return;
    }
    if (deltaY > 0 && !isCategoryHidden) {
      setIsCategoryHidden(true);
    } else if (deltaY < 0 && isCategoryHidden) {
      setIsCategoryHidden(false);
    }
    scrollOffsetRef.current = offsetY;
  }, [isCategoryHidden]);

  useEffect(() => {
    Animated.timing(searchTransition, {
      toValue: isSearchFocused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [isSearchFocused, searchTransition]);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [skeletonPulse]);

  useFocusEffect(
    useCallback(() => {
      setSelectedCategoryId(null);
    }, [])
  );

  function openProductModal(product: UIProduct) {
    const cartItem = state.items.find((item) => item.id === product.id);
    if (addButtonFeedbackTimer.current) {
      clearTimeout(addButtonFeedbackTimer.current);
    }
    if (closeModalTimer.current) {
      clearTimeout(closeModalTimer.current);
    }
    setSelectedProduct(product);
    setSelectedQuantity(cartItem?.quantity || 1);
    setIsDescriptionOpen(false);
    setAddButtonState('idle');
    addToCartScale.setValue(1);
    setIsProductModalVisible(true);
  }

  function closeProductModal() {
    setIsProductModalVisible(false);
    setSelectedProduct(null);
    setIsDescriptionOpen(false);
  }

  function handleIncrement() {
    setSelectedQuantity((prev) => prev + 1);
  }

  function handleDecrement() {
    setSelectedQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  function handleAddToCart() {
    if (!selectedProduct) return;
    const desiredQuantity = Math.max(selectedQuantity, 1);
    const cartItem = state.items.find((item) => item.id === selectedProduct.id);
    const quantity = cartItem?.quantity || 0;
    const selectedProductPrice =
      typeof selectedProduct.price === 'number' && Number.isFinite(selectedProduct.price)
        ? selectedProduct.price
        : 0;

    if (quantity === 0) {
      addItem({
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProductPrice,
        image: selectedProduct.image || '',
      });
      if (desiredQuantity > 1) {
        updateQuantity(selectedProduct.id, desiredQuantity);
      }
      return;
    }

    updateQuantity(selectedProduct.id, desiredQuantity);
  }

  function handleAddToCartPress() {
    handleAddToCart();
    setAddButtonState('added');

    if (addButtonFeedbackTimer.current) {
      clearTimeout(addButtonFeedbackTimer.current);
    }
    addButtonFeedbackTimer.current = setTimeout(() => {
      setAddButtonState('idle');
    }, 1200);

    if (closeModalTimer.current) {
      clearTimeout(closeModalTimer.current);
    }
    closeModalTimer.current = setTimeout(() => {
      closeProductModal();
    }, 700);

    Animated.sequence([
      Animated.timing(addToCartScale, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(addToCartScale, {
        toValue: 1.05,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(addToCartScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }

  useEffect(() => {
    if (!selectedProduct) return;
    const cartItem = state.items.find((item) => item.id === selectedProduct.id);
    setSelectedQuantity(cartItem?.quantity || 1);
  }, [selectedProduct, state.items]);

  useEffect(() => {
    return () => {
      if (addButtonFeedbackTimer.current) {
        clearTimeout(addButtonFeedbackTimer.current);
      }
      if (closeModalTimer.current) {
        clearTimeout(closeModalTimer.current);
      }
    };
  }, []);
  
  // API state
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Record<number, UIProduct[]>>({});
  const [searchResults, setSearchResults] = useState<UIProduct[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  
  // Loading states
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
  const [isStoreContextLoading, setIsStoreContextLoading] = useState(false);
  const [storeContextError, setStoreContextError] = useState<string | null>(null);
  const [homeLayout, setHomeLayout] = useState<StoreHomeLayout | null>(null);
  const [homeLayoutError, setHomeLayoutError] = useState<string | null>(null);
  
  // Error states
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Debounce timers
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteAbortControllerRef = useRef<AbortController | null>(null);
  const selectedLocationStoreId = parseStoreId(selectedLocation.id);
  const resolvedStoreId = selectedLocationStoreId ?? activeStoreId;
  const canSearchByStore = resolvedStoreId !== null;
  const getAccessToken = useCallback(async () => {
    let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (accessToken) return accessToken;
    const credentials = await getCredentials();
    accessToken = credentials?.accessToken ?? null;
    if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    return accessToken;
  }, [getCredentials]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[home] inventory base URL:', getInventoryServiceBaseUrl());
    console.log('[home] store resolution:', {
      activeStoreId,
      resolvedStoreId,
      selectedLocationId: selectedLocation.id,
      isLoggedIn,
    });
  }, [activeStoreId, isLoggedIn, resolvedStoreId, selectedLocation.id]);

  useEffect(() => {
    if (!isLoggedIn) {
      setActiveStoreId(null);
      setStoreContextError(null);
      setIsStoreContextLoading(false);
      setHomeLayout(null);
      setHomeLayoutError(null);
      return;
    }

    let isActive = true;
    setIsStoreContextLoading(true);
    setStoreContextError(null);
    setActiveStoreId(null);

    async function loadActiveStore() {
      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          if (!isActive) return;
          setActiveStoreId(null);
          setStoreContextError('Log in to search by store inventory.');
          return;
        }

        const profile = await getUserByAuth0(accessToken);
        const rawUserId = (profile as { id?: number | string }).id;
        if (!rawUserId) {
          if (!isActive) return;
          setActiveStoreId(null);
          setStoreContextError('Unable to resolve your active store.');
          return;
        }

        const activeStore = await getActiveStore(rawUserId, accessToken);
        const resolvedStoreId = getActiveStoreId(activeStore);

        if (!isActive) return;

        setActiveStoreId(resolvedStoreId);
        if (resolvedStoreId === null) {
          setStoreContextError('Select a store to search inventory.');
        }
      } catch (error) {
        if (!isActive) return;
        setActiveStoreId(null);
        setStoreContextError(error instanceof Error ? error.message : 'Unable to load active store.');
      } finally {
        if (!isActive) return;
        setIsStoreContextLoading(false);
      }
    }

    void loadActiveStore();

    return () => {
      isActive = false;
    };
  }, [getAccessToken, isLoggedIn]);

  useEffect(() => {
    if (resolvedStoreId === null) {
      setHomeLayout(null);
      setHomeLayoutError(null);
      return;
    }

    let isActive = true;
    const abortController = new AbortController();

    async function loadHomeLayout() {
      try {
        setHomeLayoutError(null);
        if (__DEV__) {
          console.log('[home] requesting home-layout:', getApiUrl(`/api/stores/${resolvedStoreId}/home-layout`));
        }
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (!isActive) return;
          setHomeLayout(null);
          setHomeLayoutError('Log in to load home layout.');
          return;
        }
        const layout = await getStoreHomeLayout({
          storeId: resolvedStoreId,
          accessToken,
          signal: abortController.signal,
        });
        if (!isActive) return;
        setHomeLayout(layout);
      } catch (error) {
        if (!isActive) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setHomeLayout(null);
        setHomeLayoutError(error instanceof Error ? error.message : 'Failed to load home layout');
      }
    }

    void loadHomeLayout();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [getAccessToken, resolvedStoreId]);
  
  // Fetch store categories only (no master categories)
  useEffect(() => {
    if (resolvedStoreId === null) {
      setCategories([]);
      setCategoriesError('Select a store to load categories.');
      setCategoriesLoading(false);
      return;
    }

    let isActive = true;
    const abortController = new AbortController();

    async function loadStoreCategories() {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);
        if (__DEV__) {
          console.log('[home] requesting store categories:', getApiUrl(`/api/stores/${resolvedStoreId}/categories`));
        }
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (!isActive) return;
          setCategories([]);
          setCategoriesError('Log in to load store categories.');
          return;
        }
        const data = await getStoreCategories({
          storeId: resolvedStoreId,
          accessToken,
          signal: abortController.signal,
        });
        if (!isActive) return;
        setCategories(data || []);
      } catch (error) {
        if (!isActive) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setCategoriesError(error instanceof Error ? error.message : 'Failed to load store categories');
        console.error('Error fetching store categories:', error);
        setCategories([]);
      } finally {
        if (!isActive) return;
        setCategoriesLoading(false);
      }
    }

    void loadStoreCategories();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [getAccessToken, resolvedStoreId]);
  
  // Fetch products grouped by category
  useEffect(() => {
    async function loadCategoryProducts() {
      if (categoriesLoading) {
        setProductsLoading(true);
        return;
      }

      if (categories.length === 0) {
        setProductsLoading(false);
        setProducts([]);
        setCategoryProducts({});
        return;
      }

      if (resolvedStoreId === null) {
        setProductsLoading(false);
        setProducts([]);
        setCategoryProducts({});
        setProductsError('Select a store to browse store inventory.');
        return;
      }

      try {
        setProductsLoading(true);
        setProductsError(null);
        if (__DEV__) {
          console.log('[home] requesting store inventory:', getApiUrl(`/api/stores/${resolvedStoreId}/inventory`));
        }
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setProducts([]);
          setCategoryProducts({});
          setProductsError('Log in to load store inventory.');
          return;
        }
        const storeInventory = await getStoreInventory({
          storeId: resolvedStoreId,
          accessToken,
        });
        const mappedStoreProducts = dedupeProductsById((storeInventory || []).map(mapApiProductToProduct));
        const nextCategoryProducts = buildCategoryProductsMap(mappedStoreProducts, categories);
        setCategoryProducts(nextCategoryProducts);
        setProducts(mappedStoreProducts);
      } catch (error) {
        setProductsError(error instanceof Error ? error.message : 'Failed to load store inventory');
        console.error('Error fetching store inventory:', error);
        setProducts([]);
        setCategoryProducts({});
      } finally {
        setProductsLoading(false);
      }
    }

    loadCategoryProducts();
  }, [categories, categoriesLoading, getAccessToken, resolvedStoreId]);
  
  // Main search function - similar to Next.js performSearch
  const performSearch = useCallback(async (queryOverride?: string) => {
    if (resolvedStoreId === null) {
      setSearchResults([]);
      setAutocompleteSuggestions([]);
      setSearchError('Select a store to search products.');
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError(null);

      // Use provided query or fall back to current searchQuery state
      const queryToUse = queryOverride !== undefined ? queryOverride : searchQuery.trim();
      
      // Build category array from selected category
      const categoryArray: string[] = [];
      if (selectedCategoryId !== null) {
        const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);
        if (selectedCategory) {
          categoryArray.push(selectedCategory.displayName);
        }
      }

      const searchParams = {
        storeId: resolvedStoreId,
        query: queryToUse || "*",
        category: categoryArray.length > 0 ? categoryArray : undefined,
        page: 1,
        pageSize: 24,
      };

      const searchResponse = await searchProducts(searchParams);
      const mappedResults = (searchResponse.hits || []).map(mapSearchHitToProduct);
      setSearchResults(mappedResults);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Failed to search products');
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [resolvedStoreId, searchQuery, selectedCategoryId, categories]);

  // Perform search when category filter changes (automatic trigger)
  useEffect(() => {
    // Clear any pending search timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!canSearchByStore) {
      setSearchResults([]);
      if (searchQuery.trim().length > 0 || selectedCategoryId !== null) {
        setSearchError('Select a store to search products.');
      } else {
        setSearchError(null);
      }
      return;
    }
    
    // Only perform search if there's a query or a category is selected
    if (searchQuery.trim().length > 0 || selectedCategoryId !== null) {
      // Debounce search to avoid too many API calls
      searchTimerRef.current = setTimeout(() => {
        performSearch();
      }, 500); // 500ms debounce for search
    } else {
      // Clear search results when no query and no category
      setSearchResults([]);
    }
    
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSearchByStore, selectedCategoryId, selectedLocation]); // Only trigger on category/location change, not query change

  // Debounced autocomplete - triggers after 2+ characters (matching Next.js pattern)
  useEffect(() => {
    // Cancel any pending autocomplete request
    if (autocompleteAbortControllerRef.current) {
      autocompleteAbortControllerRef.current.abort();
    }
    
    if (autocompleteTimerRef.current) {
      clearTimeout(autocompleteTimerRef.current);
    }

    if (!canSearchByStore) {
      setAutocompleteSuggestions([]);
      setAutocompleteLoading(false);
      return;
    }
    
    if (searchQuery.trim().length >= 2) {
      autocompleteTimerRef.current = setTimeout(async () => {
        // Create new AbortController for this request
        const abortController = new AbortController();
        autocompleteAbortControllerRef.current = abortController;
        
        try {
          setAutocompleteLoading(true);
          const response = await getAutocompleteSuggestions({ 
            query: searchQuery, 
            limit: 5,
            signal: abortController.signal,
          });
          
          // Only update if request wasn't cancelled
          if (!abortController.signal.aborted) {
            setAutocompleteSuggestions(response.suggestions || []);
          }
        } catch (error) {
          // Ignore abort errors, only handle other errors
          if (error instanceof Error && error.name !== 'AbortError') {
            // Silently fail autocomplete - it's optional functionality
            if (!abortController.signal.aborted) {
              setAutocompleteSuggestions([]);
            }
          }
        } finally {
          if (!abortController.signal.aborted) {
            setAutocompleteLoading(false);
          }
        }
      }, 150); // Reduced to 150ms debounce for faster response
    } else {
      setAutocompleteSuggestions([]);
      setAutocompleteLoading(false);
    }
    
    return () => {
      if (autocompleteTimerRef.current) {
        clearTimeout(autocompleteTimerRef.current);
      }
      if (autocompleteAbortControllerRef.current) {
        autocompleteAbortControllerRef.current.abort();
      }
    };
  }, [canSearchByStore, searchQuery]);

  // Handle search submission (for manual search trigger - when user presses enter)
  const handleSearchSubmit = useCallback(() => {
    if (!canSearchByStore) return;
    setIsSearchFocused(false);
    // Clear any pending debounced search
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    // Trigger search immediately on submit
    performSearch();
  }, [canSearchByStore, performSearch]);
  
  // Handle autocomplete suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    if (!canSearchByStore) return;
    setSearchQuery(suggestion);
    setAutocompleteSuggestions([]);
    setIsSearchFocused(false);
    // Clear any pending debounced search
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    // Trigger search immediately with the selected suggestion
    performSearch(suggestion);
  }, [canSearchByStore, performSearch]);
  
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const hiddenCategoryIds = new Set(coerceNumberArray(homeLayout?.hiddenCategoryIds));

  const toggleCategoriesFromStore = [...categories].sort((a, b) => {
    const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });

  const enabledSections = (homeLayout?.sections || []).filter((section) => section.enabled !== false);
  const heroSections = enabledSections.filter((section) => section.type === 'hero');
  const heroEnabled = homeLayout
    ? heroSections.length > 0
    : true;
  const heroImageLinks = heroSections.flatMap((section) => sanitizeImageLinks(section.imageLinks));
  const heroSectionTitle = heroSections
    .map((section) => section.title?.trim())
    .find((title): title is string => Boolean(title));

  const configuredCategoryEntries: HomeCategoryEntry[] = enabledSections
    .filter((section) => section.type === 'category')
    .map((section) => {
      const sectionCategoryId = coerceNumber(section.categoryId);
      if (sectionCategoryId === null) return null;
      if (hiddenCategoryIds.has(sectionCategoryId)) return null;
      const category = categoryById.get(sectionCategoryId) ??
        buildSyntheticCategory(sectionCategoryId, section.title);
      return {
        category,
        sectionTitle: sanitizeCategoryTitle(section.title?.trim() || category.displayName),
      };
    })
    .filter((entry): entry is HomeCategoryEntry => entry !== null);

  const homeCategoryEntries = homeLayout ? configuredCategoryEntries : [];
  
  
  const openCategoryProducts = useCallback((category: Category) => {
    setSelectedCategoryId(category.id);
    setIsCategoriesExpanded(false);
    router.push({
      pathname: '/category-products',
      params: {
        displayName: category.displayName,
        code: category.code,
        storeId: resolvedStoreId?.toString(),
      },
    });
  }, [resolvedStoreId, router]);

  const handleCategoryPress = (categoryId: number) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    openCategoryProducts(category);
  };

  useEffect(() => {
    const handleAgentSelect = (payload: SelectCategoryPayload) => {
      const targetCategory = categories.find(
        (cat) => cat.displayName.toLowerCase() === payload.category.trim().toLowerCase() ||
                 cat.code.toLowerCase() === payload.category.trim().toLowerCase()
      );
      if (!targetCategory) return;
      openCategoryProducts(targetCategory);
    };

    const unsubscribe = agentBus.on<SelectCategoryPayload>(AGENT_EVENTS.SelectCategory, handleAgentSelect);
    return unsubscribe;
  }, [categories, openCategoryProducts]);

  const handleCategorySectionLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setCategorySectionHeight(height);
    }
  };

  const topOffset = categorySectionHeight > 0 ? categorySectionHeight : insets.top + 60;
  const contentTopInset = 8;
  const contentBottomInset = insets.bottom + 24;
  const formattedWeight = selectedProduct ? formatWeight(selectedProduct.weight, selectedProduct.weightUnit) : '';
  const weightCaloriesText =
    formattedWeight && selectedProduct?.calories
      ? `${formattedWeight} • ${selectedProduct.calories} cals`
      : formattedWeight
        ? formattedWeight
        : selectedProduct?.calories
          ? `${selectedProduct.calories} cals`
          : '';
  const normalizedName = selectedProduct?.name?.toLowerCase() ?? '';
  const quantityLabel = normalizedName.includes('avocado') ? 'avocado' : 'item';
  const selectedProductPrice =
    selectedProduct && typeof selectedProduct.price === 'number' && Number.isFinite(selectedProduct.price)
      ? selectedProduct.price
      : 0;

  return (
    <View style={styles.container}>
      {/* Fixed Category Container at Top */}
      <View
        style={[
          styles.categorySection,
          { paddingTop: insets.top + 2 },
        ]}
        onLayout={handleCategorySectionLayout}
      >
        <View style={styles.categoryContent}>
          {/* Search Pill with location + toggle */}
          <View style={[styles.searchPill, !isSearchFocused && styles.searchPillInactive]}>
            <View style={styles.searchPillRow}>
              <Animated.View
                style={[
                  styles.searchBackButtonWrapper,
                  {
                    width: searchTransition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, BACK_BUTTON_SIZE],
                    }),
                    opacity: searchTransition,
                    transform: [
                      {
                        translateX: searchTransition.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-BACK_BUTTON_SIZE / 2, 0],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents={isSearchFocused ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  onPress={() => {
                    setIsSearchFocused(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setAutocompleteSuggestions([]);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.searchBackButton}
                  disabled={!isSearchFocused}
                  activeOpacity={0.9}
                >
                  <Ionicons name="arrow-back" size={22} color="#666" />
                </TouchableOpacity>
              </Animated.View>
              <View style={styles.searchPillContainer}>
                <View style={styles.searchInputWrapper}>
                  {!isSearchFocused && searchQuery.trim().length === 0 && (
                    <Ionicons name="search-outline" size={20} color="#666" />
                  )}
                  <TextInput
                    style={styles.searchInput}
                    placeholder={canSearchByStore ? "Search products" : "Select store to search"}
                    placeholderTextColor="#0f172a"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => {
                      if (!canSearchByStore) return;
                      setIsSearchFocused(true);
                      setSearchResults([]);
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsSearchFocused(false), 200);
                    }}
                    onSubmitEditing={() => {
                      handleSearchSubmit();
                      setIsSearchFocused(false);
                    }}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={canSearchByStore}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setAutocompleteSuggestions([]);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.clearButton}
                    >
                      <Ionicons name="close-circle" size={22} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>

                {!isSearchFocused && (
                  <>
                    <TouchableOpacity
                      onPress={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                      style={styles.expandToggleButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={isCategoriesExpanded ? "grid-outline" : "apps-outline"}
                        size={18}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
            {/* Autocomplete Suggestions - Only show when search bar is focused */}
            {isSearchFocused && autocompleteSuggestions.length > 0 && (
              <View style={styles.autocompleteContainer}>
                {autocompleteSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`${suggestion}-${index}`}
                    style={styles.autocompleteItem}
                    onPress={() => {
                      handleSuggestionSelect(suggestion);
                      setIsSearchFocused(false);
                    }}
                  >
                    <Ionicons name="search-outline" size={16} color="#666" style={{ marginRight: 12 }} />
                    <ThemedText style={styles.autocompleteText}>
                      {suggestion}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {!canSearchByStore && (
              <View style={styles.storePromptContainer}>
                <ThemedText style={styles.storePromptText}>
                  {isStoreContextLoading
                    ? 'Loading your active store...'
                    : storeContextError || (isLoggedIn
                      ? 'Select a store to search products.'
                      : 'Log in to search store inventory.')}
                </ThemedText>
                {isStoreContextLoading ? (
                  <Animated.View style={[styles.inlineSkeletonPill, { opacity: skeletonPulse }]} />
                ) : (
                  <TouchableOpacity
                    style={styles.storePromptButton}
                    onPress={() => {
                      if (isLoggedIn) {
                        router.push('/find-store');
                        return;
                      }
                      openLogin({ pathname: '/' });
                    }}
                    accessibilityRole="button"
                    activeOpacity={0.85}
                  >
                    <ThemedText style={styles.storePromptButtonText}>
                      {isLoggedIn ? 'Select store' : 'Log in'}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View
            style={[
              styles.categoriesWrapper,
              (isCategoryHidden || isSearchFocused || searchQuery.trim().length > 0) && styles.categoriesWrapperHidden,
            ]}
          >
            {!isSearchFocused && searchQuery.trim().length === 0 && (
              <>
                {categoriesLoading ? (
                  <View style={styles.loadingContainer}>
                    <View style={styles.categoriesSkeletonRow}>
                      <Animated.View style={[styles.categorySkeleton, { opacity: skeletonPulse }]} />
                      <Animated.View style={[styles.categorySkeleton, { opacity: skeletonPulse }]} />
                      <Animated.View style={[styles.categorySkeleton, { opacity: skeletonPulse }]} />
                      <Animated.View style={[styles.categorySkeleton, { opacity: skeletonPulse }]} />
                    </View>
                  </View>
                ) : categoriesError ? (
                  <View style={styles.errorContainer}>
                    <ThemedText style={styles.errorText}>{categoriesError}</ThemedText>
                  </View>
                ) : isCategoriesExpanded ? (
                  <View style={styles.categoriesGridContainer}>
                    {toggleCategoriesFromStore.length > 0 && toggleCategoriesFromStore.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        isSelected={selectedCategoryId === category.id}
                        onPress={() => handleCategoryPress(category.id)}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      </View>

      {/* Use FlatList for search results to avoid nested VirtualizedList, ScrollView for other content */}
      {isSearchFocused || searchQuery.trim().length > 0 ? (
        <>
          {/* Search Results - Only show when not focused (after search is submitted) */}
          {!isSearchFocused && searchQuery.trim().length > 0 && searchResults.length > 0 ? (
          <FlatList
            style={[styles.scrollView, { marginTop: topOffset + contentTopInset }]}
            data={searchResults}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.searchResultsGrid, { paddingTop: 8 }]}
            columnWrapperStyle={styles.searchResultsRow}
            onScroll={handleContentScroll}
            scrollEventThrottle={16}
            ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle" style={[styles.sectionTitle, { color: '#000' }]}>
                    {`Search Results for "${searchQuery}"`}
                  </ThemedText>
                </View>
              }
              ListEmptyComponent={
                searchLoading ? (
                  <View style={styles.loadingContainer}>
                    <View style={styles.searchSkeletonGrid}>
                      <Animated.View style={[styles.searchSkeletonCard, { opacity: skeletonPulse }]} />
                      <Animated.View style={[styles.searchSkeletonCard, { opacity: skeletonPulse }]} />
                      <Animated.View style={[styles.searchSkeletonCard, { opacity: skeletonPulse }]} />
                      <Animated.View style={[styles.searchSkeletonCard, { opacity: skeletonPulse }]} />
                    </View>
                  </View>
                ) : searchError ? (
                  <View style={styles.errorContainer}>
                    <ThemedText style={styles.errorText}>{searchError}</ThemedText>
                  </View>
                ) : null
              }
              ListFooterComponent={<View style={{ height: contentBottomInset }} />}
              renderItem={({ item }) => (
                <View style={styles.searchResultCardWrapper}>
                  <ProductCard product={item} onPress={openProductModal} />
                </View>
              )}
            />
          ) : (
            <ScrollView 
              style={[styles.scrollView, { marginTop: topOffset }]} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: contentTopInset, paddingBottom: contentBottomInset },
              ]}
              onScroll={handleContentScroll}
              scrollEventThrottle={16}
            >
              {/* Show "no results" only when search was submitted (not focused) */}
              {!isSearchFocused && searchQuery.trim().length > 0 && searchResults.length === 0 && !searchLoading && canSearchByStore && (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    {`No products found for "${searchQuery}"`}
                  </ThemedText>
                </View>
              )}
              {!canSearchByStore && (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    {isLoggedIn ? 'Select a store to search products.' : 'Log in to search store inventory.'}
                  </ThemedText>
                </View>
              )}
              
              {/* Show placeholder when search is focused but no query yet */}
              {isSearchFocused && searchQuery.trim().length === 0 && canSearchByStore && (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    Start typing to search products...
                  </ThemedText>
                </View>
              )}
              
              {/* Show placeholder when search is focused with query but no results yet */}
              {isSearchFocused && searchQuery.trim().length > 0 && searchResults.length === 0 && !searchLoading && canSearchByStore && (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    {`Press Enter to search for "${searchQuery}"`}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          )}
        </>
      ) : (
        /* Product Sections - Only show when search is not focused and no query */
        <ScrollView 
          style={[styles.scrollView, { marginTop: topOffset }]} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: contentTopInset, paddingBottom: contentBottomInset },
          ]}
          onScroll={handleContentScroll}
          scrollEventThrottle={16}
        >
          {productsLoading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.homeSkeletonSection}>
                <Animated.View style={[styles.homeSkeletonTitle, { opacity: skeletonPulse }]} />
                <View style={styles.homeSkeletonRow}>
                  <Animated.View style={[styles.homeSkeletonCard, { opacity: skeletonPulse }]} />
                  <Animated.View style={[styles.homeSkeletonCard, { opacity: skeletonPulse }]} />
                  <Animated.View style={[styles.homeSkeletonCard, { opacity: skeletonPulse }]} />
                </View>
              </View>
              <View style={styles.homeSkeletonSection}>
                <Animated.View style={[styles.homeSkeletonTitleShort, { opacity: skeletonPulse }]} />
                <View style={styles.homeSkeletonRow}>
                  <Animated.View style={[styles.homeSkeletonCard, { opacity: skeletonPulse }]} />
                  <Animated.View style={[styles.homeSkeletonCard, { opacity: skeletonPulse }]} />
                  <Animated.View style={[styles.homeSkeletonCard, { opacity: skeletonPulse }]} />
                </View>
              </View>
            </View>
          ) : productsError ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{productsError}</ThemedText>
            </View>
          ) : (
            // Show all product sections when no category is selected
            <>
              {heroEnabled ? <HeroSection imageLinks={heroImageLinks} title={heroSectionTitle} /> : null}
              {homeLayoutError ? (
                <View style={styles.layoutNoticeContainer}>
                  <ThemedText style={styles.layoutNoticeText}>
                    {`Using default home layout (${homeLayoutError})`}
                  </ThemedText>
                </View>
              ) : null}
              {homeCategoryEntries.length > 0 ? (
                homeCategoryEntries.map(({ category, sectionTitle }, index) => {
                  const productsForCategory = categoryProducts[category.id] || [];
                  return (
                    <ProductSection
                      key={`${category.id}-${sectionTitle}-${index}`}
                      title={sectionTitle}
                      products={productsForCategory}
                      onProductPress={openProductModal}
                      onSeeAll={() => openCategoryProducts(category)}
                    />
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    {homeLayout
                      ? 'No category sections configured in home layout.'
                      : homeLayoutError
                        ? 'Failed to load home layout.'
                        : 'Loading home layout...'}
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      <Modal
        visible={isProductModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeProductModal}
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.modalCard, { paddingTop: 12 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeProductModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#111322" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeroCard}>
                <View style={styles.modalHeroImageWrapper}>
                  {selectedProduct?.image ? (
                    <Image
                      source={{ uri: selectedProduct.image }}
                      style={styles.modalHeroImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <Ionicons name="image-outline" size={72} color="#CED2DA" />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.modalMeta}>
                <ThemedText style={styles.modalTitle}>
                  {selectedProduct?.name || 'Product'}
                </ThemedText>
                <Text style={styles.modalSubtitle}>
                  {weightCaloriesText || `1 ${quantityLabel}`}
                </Text>

                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalSalePrice}>
                    ${selectedProductPrice.toFixed(2)}
                  </Text>
                  {selectedProduct ? (
                    <Text style={styles.modalOriginalPrice}>
                      ${(selectedProductPrice * 1.13).toFixed(2)}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.modalDetailBlock}>
                  <TouchableOpacity
                    style={styles.modalAccordionHeader}
                    onPress={() => setIsDescriptionOpen((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalAccordionTitle}>Product detail</Text>
                    <Ionicons
                      name={isDescriptionOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#111322"
                    />
                  </TouchableOpacity>
                  {isDescriptionOpen ? (
                    <Text style={styles.modalDescription}>
                      {selectedProduct?.description || 'No description available.'}
                    </Text>
                  ) : null}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={handleDecrement}
                  disabled={selectedQuantity <= 1}
                >
                  <Text style={[styles.stepperButtonText, selectedQuantity <= 1 && styles.disabledText]}>
                    -
                  </Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{selectedQuantity}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={handleIncrement}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Animated.View style={[styles.cartButtonWrapper, { transform: [{ scale: addToCartScale }] }]}>
                <TouchableOpacity
                  style={styles.cartButton}
                  onPress={handleAddToCartPress}
                  activeOpacity={0.9}
                >
                  <Text style={styles.cartButtonText}>
                    {addButtonState === 'added' ? 'Item added!' : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categorySection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f97316',
    zIndex: 1000,
    paddingHorizontal: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
  },
  categoryContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  topControlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  expandToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  categoriesWrapper: {
    overflow: 'hidden',
  },
  categoriesWrapperHidden: {
    maxHeight: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  categoriesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    // Content flows naturally with category section at top
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#6B6B6B',
  },
  modalCard: {
    height: '100%',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalHeroCard: {
    marginHorizontal: 24,
    marginTop: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  modalHeroImageWrapper: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalHeroImage: {
    width: '100%',
    height: '100%',
  },
  modalImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7FB',
  },
  modalMeta: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#667085',
    marginTop: 4,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 14,
  },
  modalSalePrice: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalOriginalPrice: {
    fontSize: 16,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  modalDetailBlock: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingTop: 14,
  },
  modalAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalAccordionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalDescription: {
    fontSize: 15,
    color: '#475467',
    lineHeight: 22,
    marginTop: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A',
  },
  disabledText: {
    color: '#CFD3DA',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginHorizontal: 12,
  },
  cartButton: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#0DB44D',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cartButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  cartButtonWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  heroSection: {
    position: 'relative',
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  heroBackdrop: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'transparent',
    borderRadius: 24,
  },
  heroGlowTop: {
    position: 'absolute',
    top: -20,
    right: -40,
    width: 180,
    height: 140,
    borderRadius: 90,
    backgroundColor: 'transparent',
    opacity: 0.45,
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 200,
    height: 160,
    borderRadius: 100,
    backgroundColor: 'transparent',
    opacity: 0.4,
  },
  heroCardsRow: {
    gap: 14,
    paddingTop: 10,
    paddingBottom: 0,
    paddingHorizontal: 16,
  },
  heroCard: {
    backgroundColor: 'transparent',
    borderRadius: 22,
    padding: 14,
    borderWidth: 0,
    shadowColor: '#9a3412',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  heroCardImage: {
    borderRadius: 22,
  },
  heroCardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  heroCardTitle: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  heroCardValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  heroCardDetail: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  sectionTitle: {
    paddingHorizontal: 8,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f4f4f5',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 6,
    marginVertical: 4,
  },
  categoryPillSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  categoryPillLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  categoryPillLabelSelected: {
    color: '#f8fafc',
  },
  searchPill: {
    marginBottom: 4,
    overflow: 'hidden',
    width: '100%',
  },
  searchPillInactive: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  searchPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  searchPillContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 54,
    paddingHorizontal: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchBackButtonWrapper: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBackButton: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 0,
    margin: 0,
    minHeight: 36,
  },
  categoryCardSelected: {
    transform: [{ translateY: -1 }],
  },
  categoryCardPressed: {
    opacity: 0.7,
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  layoutNoticeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  layoutNoticeText: {
    fontSize: 12,
    color: '#667085',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  seeAllText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '600',
  },
  productList: {
    paddingHorizontal: 8,
    gap: 12,
  },
  productCardWrapper: {
    width: PRODUCT_CARD_WIDTH,
  },
  searchResultsGrid: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  searchResultsRow: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  searchResultCardWrapper: {
    flex: 1,
    maxWidth: '48%',
  },
  autocompleteContainer: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
    overflow: 'hidden',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  autocompleteText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  storePromptContainer: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  storePromptText: {
    fontSize: 13,
    color: '#334155',
  },
  storePromptButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  storePromptButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  inlineSkeletonPill: {
    width: 120,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  categoriesSkeletonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  categorySkeleton: {
    width: CATEGORY_CARD_SIZE,
    height: CATEGORY_CARD_HEIGHT,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  searchSkeletonGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  searchSkeletonCard: {
    width: '48%',
    height: 190,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  homeSkeletonSection: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  homeSkeletonTitle: {
    width: 180,
    height: 18,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  homeSkeletonTitleShort: {
    width: 130,
    height: 18,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  homeSkeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  homeSkeletonCard: {
    width: PRODUCT_CARD_WIDTH,
    height: 190,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  errorContainer: {
    paddingVertical: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
});
