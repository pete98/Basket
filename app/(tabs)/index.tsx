import { ThemedText } from '@/components/themed-text';
import { getCategoryVisual } from '@/constants/category-visuals';
import { useCart } from '@/contexts/cart-context';
import { useLocation } from '@/contexts/location-context';
import { AGENT_EVENTS, agentBus, SelectCategoryPayload } from '@/lib/agent-bus';
import { fetchCategories } from '@/lib/api/categories';
import { fetchProducts } from '@/lib/api/products';
import { getAutocompleteSuggestions, searchProducts } from '@/lib/api/search';
import { Product as ApiProduct, Category } from '@/lib/types/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 16;
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
  'FROZEN_MEALS',
  'FRESH_PRODUCE',
];

const DEFAULT_CATEGORY_NAMES = [
  'Dairy & Eggs',
  'Dairy',
  'Snacks',
  'Beverages',
  'Frozen',
  'Frozen & Pantry Meals',
  'Fresh Produce',
  'Produce',
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
const banners = [
  { id: '1', image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800' },
  { id: '2', image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800' },
  { id: '3', image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800' },
  { id: '4', image: 'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=800' },
];

// Product interface for UI display (mapped from API response)
interface UIProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  inStock: boolean;
  discount?: number;
  weight?: number;
  weightUnit?: string;
  calories?: number;
  brand?: string;
  description?: string;
  stockQuantity?: number;
  popularityScore?: number;
}

// Helper function to format weight with unit
function formatWeight(weight?: number, weightUnit?: string): string {
  if (!weight) return '';
  
  const unit = weightUnit?.toUpperCase();
  if (unit === 'GRAM') {
    return `${weight}g`;
  } else if (unit === 'OZ') {
    return `${weight}oz`;
  } else if (weightUnit) {
    // Fallback for other units
    return `${weight} ${weightUnit.toLowerCase()}`;
  }
  return weight.toString();
}

// Helper function to map API product (InventoryResponseDTO) to UI product
function mapApiProductToProduct(apiProduct: ApiProduct): UIProduct {
  // Parse labels string (e.g., "organic,local") into array
  const labels = apiProduct.labels ? apiProduct.labels.split(',').map(l => l.trim()) : [];
  
  return {
    id: apiProduct.id.toString(),
    name: apiProduct.itemName,
    price: apiProduct.price,
    image: apiProduct.imageUrl,
    category: apiProduct.categories || apiProduct.subCategory || '',
    inStock: apiProduct.stockQuantity > 0,
    weight: apiProduct.weight,
    weightUnit: apiProduct.weightUnit,
    calories: apiProduct.calories,
    brand: apiProduct.brand,
    description: apiProduct.description,
    stockQuantity: apiProduct.stockQuantity,
    popularityScore: apiProduct.popularityScore,
  };
}

// Helper function to map search hit (InventorySearchHit) to UI product
function mapSearchHitToProduct(hit: ApiProduct & { score?: number }): UIProduct {
  // Search hits are full InventoryResponseDTO objects, so we can use the same mapping
  return mapApiProductToProduct(hit);
}

function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const startTimer = () => {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % banners.length;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }, 3000);
      timerRef.current = timer;
    };

    if (!isScrolling) {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isScrolling]);

  const onScrollBeginDrag = () => {
    setIsScrolling(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const onScrollEnd = () => {
    setIsScrolling(false);
  };

  const onMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / BANNER_WIDTH);
    setCurrentIndex(index);
  };

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEnd}
        renderItem={({ item }) => (
          <View style={styles.bannerContainer}>
            <Image source={{ uri: item.image }} style={styles.banner} />
          </View>
        )}
      />
      <View style={styles.dotsContainer}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>
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

function ProductCard({ product }: { product: UIProduct }) {
  const router = useRouter();
  const { addItem, updateQuantity, removeItem, state } = useCart();
  
  // Find if this product is in cart and get its quantity
  const cartItem = state.items.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;
  
  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || '',
    });
  };

  const handleIncrement = () => {
    if (quantity === 0) {
      handleAddToCart();
    } else {
      updateQuantity(product.id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
    } else if (quantity === 1) {
      removeItem(product.id);
    }
  };

  const handleProductPress = () => {
    router.push({
      pathname: '/product-detail',
      params: {
        id: product.id,
        name: product.name,
        price: product.price.toString(),
        image: product.image || '',
        brand: product.brand || '',
        description: product.description || '',
        weight: product.weight?.toString() || '',
        weightUnit: product.weightUnit || '',
        calories: product.calories?.toString() || '',
        stockQuantity: product.stockQuantity?.toString() || '100',
        popularityScore: product.popularityScore?.toString() || '999',
        category: product.category || '',
      },
    });
  };

  const formattedWeight = formatWeight(product.weight, product.weightUnit);
  const weightCaloriesText = 
    formattedWeight && product.calories 
      ? `${formattedWeight} • ${product.calories} cals`
      : formattedWeight 
        ? formattedWeight
        : product.calories 
          ? `${product.calories} cals`
          : '';

  return (
    <View style={styles.productCard}>
      {/* Quantity Counter or Add to Cart Icon - Top Right */}
      {quantity > 0 ? (
        <View style={styles.quantityCounter}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={handleDecrement}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <View style={styles.quantityButtonInner}>
              <Ionicons name="remove" size={16} color="#007AFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.quantityNumberContainer}>
            <Text style={styles.quantityText}>{quantity}</Text>
          </View>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={handleIncrement}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <View style={styles.quantityButtonInner}>
              <Ionicons name="add" size={16} color="#007AFF" />
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addToCartIcon}
          onPress={handleAddToCart}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#000" />
        </TouchableOpacity>
      )}

      {/* Tappable Product Content */}
      <TouchableOpacity
        onPress={handleProductPress}
        activeOpacity={0.7}
        style={styles.productContent}
      >
        {/* Product Image */}
        {product.image ? (
          <Image 
            source={{ uri: product.image }} 
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
          </View>
        )}

        {/* Product Name */}
        <ThemedText style={styles.productName} numberOfLines={2}>
          {product.name}
        </ThemedText>

        {/* Weight and Calories */}
        {weightCaloriesText ? (
          <ThemedText style={styles.productWeightCalories}>
            {weightCaloriesText}
          </ThemedText>
        ) : null}

        {/* Price */}
        <ThemedText style={styles.productPrice}>${product.price.toFixed(2)}</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

function ProductSection({ 
  title, 
  products,
  iconUri,
}: { 
  title: string; 
  products: UIProduct[];
  iconUri?: string;
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
          <TouchableOpacity onPress={() => console.log(`See all ${title}`)}>
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
              <ProductCard product={item} />
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchTransition = useRef(new Animated.Value(0)).current;
  const BACK_BUTTON_SIZE = 54;
  const [categorySectionHeight, setCategorySectionHeight] = useState(0);
  const [isCategoryHidden, setIsCategoryHidden] = useState(false);
  const scrollOffsetRef = useRef(0);

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
  
  // API state
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<UIProduct[]>([]);
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
        console.log('Loaded categories:', data);
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
  
  // Fetch products based on selected category
  useEffect(() => {
    async function loadProducts() {
      try {
        setProductsLoading(true);
        setProductsError(null);
        // Find the category from the selected category ID
        const selectedCategory = categories.find(c => c.id === selectedCategoryId);
        // Use displayName to match with product categories field
        const categoryName = selectedCategory?.displayName;
        console.log('Loading products for ZIP', selectedLocation.zip);
        const data = await fetchProducts(categoryName ? { categoryId: categoryName } : undefined);
        const mappedProducts = (data || []).map(mapApiProductToProduct);
        setProducts(mappedProducts);
      } catch (error) {
        setProductsError(error instanceof Error ? error.message : 'Failed to load products');
        console.error('Error fetching products:', error);
        setProducts([]); // Set empty array on error
      } finally {
        setProductsLoading(false);
      }
    }
    loadProducts();
  }, [selectedCategoryId, categories, selectedLocation]);
  
  // Main search function - similar to Next.js performSearch
  const performSearch = useCallback(async (queryOverride?: string) => {
    try {
      setSearchLoading(true);
      setSearchError(null);
      console.log('Performing search for ZIP', selectedLocation.zip);

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
      // If search endpoint doesn't exist (404), fall back to client-side filtering
      if (error instanceof Error && error.message.includes('404')) {
        console.log('Search endpoint not available, using client-side filtering');
        // Filter products client-side as fallback
        let filtered = products;
        
        // Apply category filter
        if (selectedCategoryId !== null) {
          const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);
          if (selectedCategory) {
            filtered = filtered.filter(p => 
              p.category === selectedCategory.displayName || 
              p.category === selectedCategory.code
            );
          }
        }
        
        // Apply search query filter
        const queryToUse = queryOverride !== undefined ? queryOverride : searchQuery.trim();
        if (queryToUse) {
          filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(queryToUse.toLowerCase()) ||
            p.category.toLowerCase().includes(queryToUse.toLowerCase())
          );
        }
        
        setSearchResults(filtered);
        setSearchError(null);
      } else {
        setSearchError(error instanceof Error ? error.message : 'Failed to search products');
        console.error('Error searching products:', error);
        setSearchResults([]);
      }
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, selectedCategoryId, categories, products, selectedLocation]);

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
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedCategoryVisual = selectedCategory ? getCategoryVisual(selectedCategory) : null;
  const filteredProducts = selectedCategory 
    ? products.filter(p => 
        p.category === selectedCategory.displayName || 
        p.category === selectedCategory.code
      )
    : [];
  
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
  
  // Group products by category for display sections
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, UIProduct[]>);
  
  // Sort categories by displayOrder from API, or fallback to predefined order
  // Check if any categories have displayOrder (API-driven) vs using hardcoded list
  const hasDisplayOrderFromApi = categories.some(c => c.displayOrder !== undefined);
  console.log('Categories loaded:', categories.length, 'Has displayOrder:', hasDisplayOrderFromApi);
  
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
          // DAIRY_EGGS=0, SNACKS_CHIPS=1, BEV_SODA=2, FROZEN_MEALS=3, FRESH_PRODUCE=4
          if (nameIndex < 2) return 0; // Dairy
          if (nameIndex === 2) return 1; // Snacks
          if (nameIndex === 3) return 2; // Beverages
          if (nameIndex >= 4 && nameIndex <= 5) return 3; // Frozen
          if (nameIndex >= 6) return 4; // Produce
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
    // Try to find products for this category by matching category code or displayName
    const categoryProducts = Object.entries(productsByCategory)
      .filter(([categoryKey]) => {
        // Match by category code, displayName, or any variation
        return category.code === categoryKey || 
               category.displayName === categoryKey ||
               category.code.toLowerCase() === categoryKey.toLowerCase() ||
               category.displayName.toLowerCase() === categoryKey.toLowerCase();
      })
      .flatMap(([, products]) => products);
    
    return {
      category,
      categoryCode: category.code,
      categoryProducts,
    };
  });
  
  console.log('Categories to show:', categoriesToShow.length, categoriesToShow.map(c => c.displayName));
  console.log('Sorted category entries:', sortedCategoryEntries.length);
  
  const handleCategoryPress = (categoryId: number) => {
    console.log('Category pressed:', categoryId);
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
    } else {
      setSelectedCategoryId(categoryId);
      setIsCategoriesExpanded(false);
    }
  };

  useEffect(() => {
    const handleAgentSelect = (payload: SelectCategoryPayload) => {
      const targetCategory = categories.find(
        (cat) => cat.displayName.toLowerCase() === payload.category.trim().toLowerCase() ||
                 cat.code.toLowerCase() === payload.category.trim().toLowerCase()
      );
      if (!targetCategory) return;

      setIsCategoriesExpanded(true);
      setSelectedCategoryId((prev) => (prev === targetCategory.id ? prev : targetCategory.id));
      setTimeout(() => {
        setIsCategoriesExpanded(false);
      }, 300);
    };

    const unsubscribe = agentBus.on<SelectCategoryPayload>(AGENT_EVENTS.SelectCategory, handleAgentSelect);
    return unsubscribe;
  }, [categories]);

  const handleCategorySectionLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setCategorySectionHeight(height);
    }
  };

  const topOffset = categorySectionHeight > 0 ? categorySectionHeight : insets.top + 60;

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
                    keyboardAppearance="dark"
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
                      style={styles.locationButtonRight}
                      onPress={() => router.push('/modal')}
                    >
                    <Ionicons name="location-outline" size={16} color="#000" />
                      <ThemedText style={styles.locationZip} numberOfLines={1}>
                        {selectedLocation.zip || 'ZIP'}
                      </ThemedText>
                    <Ionicons name="chevron-down" size={14} color="#000" style={styles.locationArrow} />
                    </TouchableOpacity>

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
                <TouchableOpacity
                  style={styles.onboardingButton}
                  activeOpacity={0.85}
                  onPress={() => router.push('/onboarding')}
                >
                  <View style={styles.onboardingBadge}>
                    <Ionicons name="sparkles-outline" size={14} color="#f97316" />
                    <ThemedText style={styles.onboardingBadgeText}>New</ThemedText>
                  </View>
                  <ThemedText style={styles.onboardingButtonText} numberOfLines={1}>
                    Finish your profile for smarter picks
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={18} color="#0f172a" />
                </TouchableOpacity>
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
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                    scrollEnabled={true}
                    nestedScrollEnabled={true}
                  >
                    {sortedCategories.length > 0 && sortedCategories.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        isSelected={selectedCategoryId === category.id}
                        onPress={() => handleCategoryPress(category.id)}
                      />
                    ))}
                  </ScrollView>
                )}
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
                  <ProductCard product={item} />
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
          ) : selectedCategoryId ? (
            // Show filtered products when category is selected
            filteredProducts.length > 0 ? (
              <ProductSection 
                title={`${selectedCategory?.displayName || 'Category'} Products`} 
                products={filteredProducts}
                iconUri={selectedCategoryVisual?.iconUri}
              />
            ) : (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>
                  No products found in this category
                </ThemedText>
              </View>
            )
          ) : (
            // Show all product sections when no category is selected
            <>
              {/* Banner Carousel */}
              <View style={styles.bannerSection}>
                <BannerCarousel />
              </View>
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
  locationButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  locationZip: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  locationArrow: {
    marginLeft: 2,
  },
  categoriesWrapper: {
    overflow: 'hidden',
  },
  categoriesWrapperHidden: {
    maxHeight: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  categoriesWrapperCollapsed: {
    maxHeight: 85,
  },
  categoriesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 0,
  },
  onboardingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 4,
  },
  onboardingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fffbeb',
    marginRight: 8,
    gap: 4,
  },
  onboardingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f97316',
    textTransform: 'uppercase',
  },
  onboardingButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 6,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    // Content flows naturally with category section at top
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
  bannerSection: {
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
  },
  banner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  activeDot: {
    backgroundColor: '#4a5568',
    width: 24,
  },
  sectionTitle: {
    paddingHorizontal: 8,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    gap: 12,
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
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    width: '100%',
    position: 'relative',
    flex: 1,
  },
  productContent: {
    flex: 1,
  },
  addToCartIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  quantityCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    paddingHorizontal: 2,
    paddingVertical: 2,
    zIndex: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    minHeight: 32,
  },
  quantityButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  quantityButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityNumberContainer: {
    minWidth: 28,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    minHeight: 15,
    color: '#000',
  },
  productWeightCalories: {
    fontSize: 13,
    color: '#666'
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a5568',
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
