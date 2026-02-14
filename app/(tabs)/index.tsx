import { ProductCard } from '@/components/product-card';
import { ThemedText } from '@/components/themed-text';
import { getCategoryVisual } from '@/constants/category-visuals';
import { useLocation } from '@/contexts/location-context';
import { useCart } from '@/contexts/cart-context';
import { AGENT_EVENTS, agentBus, SelectCategoryPayload } from '@/lib/agent-bus';
import { fetchCategories } from '@/lib/api/categories';
import { ApiClientError } from '@/lib/api/client';
import { fetchProductsByCategoryName, fetchProductsBySubcategoryName } from '@/lib/api/products';
import { getAutocompleteSuggestions, searchProducts } from '@/lib/api/search';
import { Category } from '@/lib/types/api';
import { UIProduct } from '@/lib/types/ui';
import { buildCategoryNameCandidates } from '@/lib/utils/category';
import { formatWeight, mapApiProductToProduct, mapSearchHitToProduct } from '@/lib/utils/products';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

function dedupeProductsById(items: UIProduct[]): UIProduct[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

async function fetchProductsForCategory(category: Category): Promise<UIProduct[]> {
  const candidates = buildCategoryNameCandidates(category);
  let lastError: Error | null = null;

  for (const name of candidates) {
    try {
      const categoryProducts = await fetchProductsByCategoryName(name);
      if (categoryProducts.length > 0) {
        return categoryProducts.map(mapApiProductToProduct);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Failed to fetch category products');
    }

    try {
      const subcategoryProducts = await fetchProductsBySubcategoryName(name);
      if (subcategoryProducts.length > 0) {
        return subcategoryProducts.map(mapApiProductToProduct);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Failed to fetch subcategory products');
    }
  }

  if (lastError) throw lastError;
  return [];
}

function HeroSection() {
  const { width } = useWindowDimensions();
  const heroCardSize = Math.min(220, Math.round(width * 0.52));
  const snapInterval = heroCardSize + 14;

  return (
    <View style={[styles.heroSection, { minHeight: heroCardSize + 64 }]}>
      <View style={[styles.heroBackdrop, { height: heroCardSize + 92 }]}>
        <View style={styles.heroGlowTop} />
        <View style={styles.heroGlowBottom} />
      </View>
      <FlatList
        data={heroCards}
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
          >
            <View style={styles.heroCardOverlay}>
              <Text style={styles.heroCardTitle}>{item.title}</Text>
              <Text style={styles.heroCardValue}>{item.value}</Text>
              <Text style={styles.heroCardDetail}>{item.detail}</Text>
            </View>
          </ImageBackground>
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
        {category.displayName}
      </ThemedText>
    </TouchableOpacity>
  );
}

function ProductSection({ 
  title, 
  products,
  iconUri,
  onProductPress,
}: { 
  title: string; 
  products: UIProduct[];
  iconUri?: string;
  onProductPress: (product: UIProduct) => void;
 }) {
  // Show section even if empty (for debugging - helps see which categories are loaded)
  const hasProducts = products && products.length > 0;
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          {iconUri && (
            <Image
              source={{ uri: iconUri }}
              style={styles.sectionTitleIcon}
              resizeMode="contain"
            />
          )}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {title}
          </ThemedText>
        </View>
        {hasProducts && (
        <TouchableOpacity onPress={() => undefined}>
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
  
  // Error states
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Debounce timers
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteAbortControllerRef = useRef<AbortController | null>(null);
  
  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);
        const data = await fetchCategories();
        setCategories(data || []);
      } catch (error) {
        setCategoriesError(error instanceof Error ? error.message : 'Failed to load categories');
        console.error('Error fetching categories:', error);
        setCategories([]); // Set empty array on error
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []);
  
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

      try {
        setProductsLoading(true);
        setProductsError(null);

        const results = await Promise.allSettled(
          categories.map(async (category) => ({
            categoryId: category.id,
            products: await fetchProductsForCategory(category),
          }))
        );

        const nextCategoryProducts: Record<number, UIProduct[]> = {};
        const combinedProducts: UIProduct[] = [];
        let hasError = false;

        results.forEach((result, index) => {
          const categoryId = categories[index]?.id;
          if (result.status === 'fulfilled') {
            nextCategoryProducts[result.value.categoryId] = result.value.products;
            combinedProducts.push(...result.value.products);
            return;
          }
          if (categoryId !== undefined) {
            nextCategoryProducts[categoryId] = [];
          }
          console.error('Error fetching products for category:', result.reason);
          hasError = true;
        });

        setCategoryProducts(nextCategoryProducts);
        setProducts(dedupeProductsById(combinedProducts));
        if (hasError) {
          setProductsError('Some categories failed to load');
        }
      } catch (error) {
        setProductsError(error instanceof Error ? error.message : 'Failed to load products');
        console.error('Error fetching products:', error);
        setProducts([]);
        setCategoryProducts({});
      } finally {
        setProductsLoading(false);
      }
    }

    loadCategoryProducts();
  }, [categories, categoriesLoading, selectedLocation]);
  
  // Main search function - similar to Next.js performSearch
  const performSearch = useCallback(async (queryOverride?: string) => {
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
          categoryArray.push(selectedCategory.code);
        }
      }

      const searchParams = {
        query: queryToUse || "*",
        category: categoryArray.length > 0 ? categoryArray : undefined,
        page: 1,
        pageSize: 24,
      };

      const searchResponse = await searchProducts(searchParams);
      const mappedResults = (searchResponse.hits || []).map(mapSearchHitToProduct);
      setSearchResults(mappedResults);
    } catch (error) {
      if (isApiClientError(error) && (error.status === 404 || error.status === 403)) {
        applyClientSideSearch(queryOverride);
      } else if (error instanceof Error && error.message.includes('404')) {
        applyClientSideSearch(queryOverride);
      } else {
        setSearchError(error instanceof Error ? error.message : 'Failed to search products');
        console.error('Error searching products:', error);
        setSearchResults([]);
      }
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, selectedCategoryId, categories, products, selectedLocation]);

  function applyClientSideSearch(queryOverride?: string) {
    let filtered = products;

    if (selectedCategoryId !== null) {
      const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);
      if (selectedCategory) {
        filtered = filtered.filter(p => 
          p.category === selectedCategory.displayName || 
          p.category === selectedCategory.code
        );
      }
    }

    const queryToUse = queryOverride !== undefined ? queryOverride : searchQuery.trim();
    if (queryToUse) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(queryToUse.toLowerCase()) ||
        p.category.toLowerCase().includes(queryToUse.toLowerCase())
      );
    }

    setSearchResults(filtered);
    setSearchError(null);
  }

  // Perform search when category filter changes (automatic trigger)
  useEffect(() => {
    // Clear any pending search timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
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
  }, [selectedCategoryId, selectedLocation]); // Only trigger on category/location change, not query change

  // Debounced autocomplete - triggers after 2+ characters (matching Next.js pattern)
  useEffect(() => {
    // Cancel any pending autocomplete request
    if (autocompleteAbortControllerRef.current) {
      autocompleteAbortControllerRef.current.abort();
    }
    
    if (autocompleteTimerRef.current) {
      clearTimeout(autocompleteTimerRef.current);
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
  }, [searchQuery]);

  // Handle search submission (for manual search trigger - when user presses enter)
  const handleSearchSubmit = useCallback(() => {
    setIsSearchFocused(false);
    // Clear any pending debounced search
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    // Trigger search immediately on submit
    performSearch();
  }, [performSearch]);
  
  // Handle autocomplete suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    setAutocompleteSuggestions([]);
    setIsSearchFocused(false);
    // Clear any pending debounced search
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    // Trigger search immediately with the selected suggestion
    performSearch(suggestion);
  }, [performSearch]);
  
  // Filter products based on selected category
  
  // Sort categories for the selector (horizontal scroll and grid)
  // Use displayOrder from API if available, otherwise maintain original order
  const sortedCategories = [...categories].sort((a, b) => {
    const orderA = a.displayOrder;
    const orderB = b.displayOrder;
    
    // If both have displayOrder, sort by it
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    
    // If only one has displayOrder, prioritize it
    if (orderA !== undefined) return -1;
    if (orderB !== undefined) return 1;
    
    // Otherwise maintain original order
    return 0;
  });
  
  // Sort categories by displayOrder from API, or fallback to predefined order
  // Check if any categories have displayOrder (API-driven) vs using hardcoded list
  const hasDisplayOrderFromApi = categories.some(c => c.displayOrder !== undefined);
  
  // Filter and sort categories to show (based on API displayOrder or default list)
  const categoriesToShow = categories
    .filter((category) => {
      // If API provides displayOrder, show all categories with displayOrder
      // Otherwise, fallback to hardcoded default list
      if (hasDisplayOrderFromApi) {
        return category.displayOrder !== undefined;
      }
      
      // Fallback: Match by category code or displayName
      const codeMatch = DEFAULT_CATEGORY_CODES.some(
        code => category.code.toUpperCase() === code.toUpperCase()
      );
      const nameMatch = DEFAULT_CATEGORY_NAMES.some(
        name => category.displayName.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(category.displayName.toLowerCase())
      );
      return codeMatch || nameMatch;
    })
    .sort((a, b) => {
      // Prefer displayOrder from API if available
      const orderA = a.displayOrder;
      const orderB = b.displayOrder;
      
      if (orderA !== undefined && orderB !== undefined) {
        return orderA - orderB;
      }
      
      // If only one has displayOrder, prioritize it
      if (orderA !== undefined) return -1;
      if (orderB !== undefined) return 1;
      
      // Fallback to hardcoded order - check both code and displayName
      const getCategoryIndex = (category: Category): number => {
        // First try to match by code
        const codeIndex = DEFAULT_CATEGORY_CODES.findIndex(
          code => category.code.toUpperCase() === code.toUpperCase()
        );
        if (codeIndex !== -1) return codeIndex;
        
        // Then try to match by displayName
        const nameIndex = DEFAULT_CATEGORY_NAMES.findIndex(
          name => category.displayName.toLowerCase().includes(name.toLowerCase()) ||
                  name.toLowerCase().includes(category.displayName.toLowerCase())
        );
        if (nameIndex !== -1) {
          // Map name index to code index (they should align)
          // DAIRY_EGGS=0, SNACKS_CHIPS=1, BEV_SODA=2
          if (nameIndex < 2) return 0; // Dairy
          if (nameIndex === 2) return 1; // Snacks
          if (nameIndex === 3) return 2; // Beverages
        }
        return -1;
      };
      
      const indexA = getCategoryIndex(a);
      const indexB = getCategoryIndex(b);
      
      // If not found in order, put at end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  
  // Map categories to their products (categories without products will have empty arrays)
  const sortedCategoryEntries = categoriesToShow.map((category) => {
    return {
      category,
      categoryCode: category.code,
      categoryProducts: categoryProducts[category.id] || [],
    };
  });
  
  
  const openCategoryProducts = useCallback((category: Category) => {
    setSelectedCategoryId(category.id);
    setIsCategoriesExpanded(false);
    router.push({
      pathname: '/category-products',
      params: {
        displayName: category.displayName,
        code: category.code,
      },
    });
  }, [router]);

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
                    placeholder="Search products"
                    placeholderTextColor="#0f172a"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => {
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
                    <ActivityIndicator size="small" color="#4a5568" />
                  </View>
                ) : categoriesError ? (
                  <View style={styles.errorContainer}>
                    <ThemedText style={styles.errorText}>{categoriesError}</ThemedText>
                  </View>
                ) : isCategoriesExpanded ? (
                  <View style={styles.categoriesGridContainer}>
                    {sortedCategories.length > 0 && sortedCategories.map((category) => (
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
            style={[styles.scrollView, { marginTop: topOffset }]}
            data={searchResults}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.searchResultsGrid, { paddingTop: 16 }]}
            columnWrapperStyle={styles.searchResultsRow}
            onScroll={handleContentScroll}
            scrollEventThrottle={16}
            ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle" style={[styles.sectionTitle, { color: '#000' }]}>
                    Search Results for "{searchQuery}"
                  </ThemedText>
                </View>
              }
              ListEmptyComponent={
                searchLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4a5568" />
                  </View>
                ) : searchError ? (
                  <View style={styles.errorContainer}>
                    <ThemedText style={styles.errorText}>{searchError}</ThemedText>
                  </View>
                ) : null
              }
              ListFooterComponent={<View style={{ height: insets.bottom + 20 }} />}
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
              contentContainerStyle={styles.scrollContent}
              onScroll={handleContentScroll}
              scrollEventThrottle={16}
            >
              {/* Show "no results" only when search was submitted (not focused) */}
              {!isSearchFocused && searchQuery.trim().length > 0 && searchResults.length === 0 && !searchLoading && (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    No products found for "{searchQuery}"
                  </ThemedText>
                </View>
              )}
              
              {/* Show placeholder when search is focused but no query yet */}
              {isSearchFocused && searchQuery.trim().length === 0 && (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    Start typing to search products...
                  </ThemedText>
                </View>
              )}
              
              {/* Show placeholder when search is focused with query but no results yet */}
              {isSearchFocused && searchQuery.trim().length > 0 && searchResults.length === 0 && !searchLoading && (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    Press Enter to search for "{searchQuery}"
                  </ThemedText>
                </View>
              )}
              <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>
          )}
        </>
      ) : (
        /* Product Sections - Only show when search is not focused and no query */
        <ScrollView 
          style={[styles.scrollView, { marginTop: topOffset }]} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleContentScroll}
          scrollEventThrottle={16}
        >
          {productsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4a5568" />
              <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
            </View>
          ) : productsError ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{productsError}</ThemedText>
            </View>
          ) : (
            // Show all product sections when no category is selected
            <>
              <HeroSection />
              {sortedCategoryEntries.length > 0 ? (
                sortedCategoryEntries.map(({ category, categoryCode, categoryProducts }) => {
                  if (!category) return null;
                  // Show category section even if empty (for debugging - can filter later)
                  const visual = getCategoryVisual(category);
                  return (
                    <ProductSection
                      key={categoryCode}
                      title={category.displayName}
                      products={categoryProducts}
                      iconUri={visual.iconUri}
                      onProductPress={openProductModal}
                    />
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>
                    No categories found. Please check your API connection.
                  </ThemedText>
                </View>
              )}
            </>
          )}
          <View style={{ height: insets.bottom + 20 }} />
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
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
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
    paddingTop: 16,
    paddingBottom: 4,
    paddingHorizontal: 4,
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
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
