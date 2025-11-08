import { ThemedText } from '@/components/themed-text';
import { AGENT_EVENTS, agentBus, SelectCategoryPayload } from '@/lib/agent-bus';
import { fetchCategories } from '@/lib/api/categories';
import { fetchProducts } from '@/lib/api/products';
import { getAutocompleteSuggestions, searchProducts } from '@/lib/api/search';
import { Product as ApiProduct, Category } from '@/lib/types/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
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
const CATEGORY_CARD_SIZE = 64; // Square cards for compact design
const CATEGORY_CARD_HEIGHT = 64;

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

// Map category codes to emoji icons
const categoryIconMap: Record<string, string> = {
  'FRUIT': '🍎',
  'DAIRY': '🥛',
  'VEGETABLES': '🥬',
  'MEAT': '🥩',
  'BAKERY': '🍞',
  'SNACKS': '🍿',
  'BEVERAGES': '🥤',
  'FROZEN': '🧊',
  'CANDY': '🍭',
  'GROCERY': '🛒',
};

function CategoryCard({ 
  category, 
  isSelected, 
  onPress 
}: { 
  category: Category; 
  isSelected: boolean; 
  onPress: () => void;
}) {
  const icon = categoryIconMap[category.code] || '📦';
  
  return (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        isSelected && styles.categoryCardSelected
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.categoryIconContainer} pointerEvents="none">
        <ThemedText style={styles.categoryIcon}>{icon}</ThemedText>
      </View>
      <ThemedText style={styles.categoryName} numberOfLines={2} pointerEvents="none">
        {category.displayName}
      </ThemedText>
    </TouchableOpacity>
  );
}

function ProductCard({ product }: { product: UIProduct }) {
  const handleAddToCart = () => {
    console.log(`Adding ${product.name} to cart`);
  };

  return (
    <View style={styles.productCard}>
      {product.discount && (
        <View style={styles.discountBadge}>
          <ThemedText style={styles.discountText}>{product.discount}% OFF</ThemedText>
        </View>
      )}
      {product.image ? (
        <Image source={{ uri: product.image }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <Ionicons name="image-outline" size={32} color="#ccc" />
        </View>
      )}
      <ThemedText style={styles.productName} numberOfLines={2}>
        {product.name}
      </ThemedText>
      <View style={styles.productPriceContainer}>
        <ThemedText style={styles.productPrice}>${product.price.toFixed(2)}</ThemedText>
        {product.originalPrice && (
          <ThemedText style={styles.originalPrice}>${product.originalPrice.toFixed(2)}</ThemedText>
        )}
      </View>
      <Pressable
        style={styles.addToCartButton}
        onPress={handleAddToCart}
        android_ripple={{ color: '#4a5568' }}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <ThemedText style={styles.addToCartText}>Add</ThemedText>
      </Pressable>
    </View>
  );
}

function ProductSection({ title, products }: { title: string; products: UIProduct[] }) {
  if (!products || products.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        <TouchableOpacity onPress={() => console.log(`See all ${title}`)}>
          <ThemedText style={styles.seeAllText}>See All</ThemedText>
        </TouchableOpacity>
      </View>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.productList}
        renderItem={({ item }) => <ProductCard product={item} />}
      />
    </View>
  );
}

type SearchFieldVariant = 'hero' | 'header';

interface SearchFieldProps {
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: () => void;
  onClear: () => void;
  isFocused: boolean;
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  showSuggestions: boolean;
  suggestionsOpacity: Animated.Value;
  loadingSuggestions: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  variant: SearchFieldVariant;
  quickPicks?: string[];
  onQuickPickPress?: (query: string) => void;
  helperText?: string;
}

function SearchField({
  value,
  placeholder,
  onChangeText,
  onFocus,
  onBlur,
  onSubmit,
  onClear,
  isFocused,
  suggestions,
  onSelectSuggestion,
  showSuggestions,
  suggestionsOpacity,
  loadingSuggestions,
  showBackButton,
  onBack,
  variant,
  quickPicks,
  onQuickPickPress,
  helperText,
}: SearchFieldProps) {
  return (
    <View
      style={[
        styles.searchFieldWrapper,
        variant === 'hero' ? styles.searchFieldWrapperHero : styles.searchFieldWrapperHeader,
      ]}
    >
      <View style={styles.searchPillContainer}>
        {showBackButton && (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
            style={styles.backButtonInSearch}
          >
            <Ionicons name="arrow-back" size={20} color="#666" />
          </TouchableOpacity>
        )}
        <Ionicons name="search-outline" size={16} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={() => {
            onSubmit();
          }}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {helperText && (
        <View style={styles.searchHelperRow}>
          <Ionicons name="star-outline" size={14} color="#6b7280" style={styles.searchHelperIcon} />
          <ThemedText style={styles.searchHelperText}>{helperText}</ThemedText>
        </View>
      )}

      {quickPicks && quickPicks.length > 0 && (
        <View style={styles.quickPickRow}>
          {quickPicks.map((label) => (
            <TouchableOpacity
              key={label}
              style={styles.quickPickPill}
              activeOpacity={0.8}
              onPress={() => onQuickPickPress?.(label)}
            >
              <Ionicons name="flash-outline" size={14} color="#4b5563" style={styles.quickPickIcon} />
              <ThemedText style={styles.quickPickText}>{label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <Animated.View
          style={[
            styles.autocompleteContainer,
            {
              opacity: suggestionsOpacity,
              transform: [
                {
                  translateY: suggestionsOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.autocompleteHeader}>
            <ThemedText style={styles.autocompleteHeaderText}>Suggestions</ThemedText>
          </View>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={`${suggestion}-${index}`}
              style={[
                styles.autocompleteItem,
                index === suggestions.length - 1 && styles.autocompleteItemLast,
              ]}
              onPress={() => onSelectSuggestion(suggestion)}
              activeOpacity={0.7}
            >
              <View style={styles.autocompleteIconContainer}>
                <Ionicons name="search-outline" size={18} color="#4a5568" />
              </View>
              <ThemedText style={styles.autocompleteText} numberOfLines={1}>
                {suggestion}
              </ThemedText>
              <Ionicons name="arrow-forward-outline" size={16} color="#999" />
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {isFocused && loadingSuggestions && (
        <View style={styles.autocompleteLoadingContainer}>
          <ActivityIndicator size="small" color="#4a5568" />
          <ThemedText style={styles.autocompleteLoadingText}>Finding suggestions...</ThemedText>
        </View>
      )}
    </View>
  );
}


export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [categorySectionHeight, setCategorySectionHeight] = useState(0);
  
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
  
  // Animation values
  const autocompleteOpacity = useRef(new Animated.Value(0)).current;
  const searchModeOpacity = useRef(new Animated.Value(0)).current;
  
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
  }, [selectedCategoryId, categories]);
  
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
  }, [searchQuery, selectedCategoryId, categories, products]);

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
  }, [selectedCategoryId]); // Only trigger on category change, not query change

  // Debounced autocomplete - triggers after 2+ characters (matching Next.js pattern)
  useEffect(() => {
    if (autocompleteTimerRef.current) {
      clearTimeout(autocompleteTimerRef.current);
    }
    
    if (searchQuery.trim().length >= 2) {
      autocompleteTimerRef.current = setTimeout(async () => {
        try {
          setAutocompleteLoading(true);
          const response = await getAutocompleteSuggestions({ query: searchQuery, limit: 5 });
          setAutocompleteSuggestions(response.suggestions || []);
        } catch (error) {
          // Silently fail autocomplete - it's optional functionality
          setAutocompleteSuggestions([]);
        } finally {
          setAutocompleteLoading(false);
        }
      }, 300); // 300ms debounce
    } else {
      setAutocompleteSuggestions([]);
    }
    
    return () => {
      if (autocompleteTimerRef.current) {
        clearTimeout(autocompleteTimerRef.current);
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

  const handleQuickPickPress = useCallback((label: string) => {
    handleSuggestionSelect(label);
  }, [handleSuggestionSelect]);

  // Handle back button - exit search mode and return to home
  const handleBackFromSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setAutocompleteSuggestions([]);
    setIsSearchFocused(false);
    setSelectedCategoryId(null);
    // Clear any pending search timers
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
  }, []);

  // Check if we're in search mode
  const isInSearchMode = isSearchFocused || searchQuery.trim().length > 0;

  // Animate autocomplete visibility
  useEffect(() => {
    Animated.timing(autocompleteOpacity, {
      toValue: isSearchFocused && autocompleteSuggestions.length > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isSearchFocused, autocompleteSuggestions.length, autocompleteOpacity]);

  // Animate search mode transition
  useEffect(() => {
    Animated.timing(searchModeOpacity, {
      toValue: isInSearchMode ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isInSearchMode, searchModeOpacity]);
  
  // Filter products based on selected category
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const filteredProducts = selectedCategory 
    ? products.filter(p => 
        p.category === selectedCategory.displayName || 
        p.category === selectedCategory.code
      )
    : [];
  
  // Group products by category for display sections
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, UIProduct[]>);

  const quickFilterSuggestions = useMemo(() => {
    if (categories.length > 0) {
      return categories
        .slice(0, 6)
        .map((category) => category.displayName || category.code)
        .filter((label): label is string => Boolean(label));
    }
    return ['Fresh produce', 'Breakfast essentials', 'Organic snacks', 'Dairy picks', 'Beverages'];
  }, [categories]);

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

  // Calculate top offset based on mode
  const topOffset = isInSearchMode 
    ? insets.top + 70 // Search mode header height
    : (categorySectionHeight > 0 ? categorySectionHeight : insets.top + 80);

  return (
    <View style={styles.container}>
      {/* Fixed Category Container at Top - Hide when in search mode */}
      {!isInSearchMode && (
        <View 
          style={[styles.categorySection, { paddingTop: insets.top + 8 }]}
          onLayout={handleCategorySectionLayout}
        >
          <View style={styles.categoryContainer}>
            <SearchField
              value={searchQuery}
              placeholder={
                searchQuery.length > 0
                  ? "Continue searching..."
                  : "Search for products, brands, or categories"
              }
              onChangeText={setSearchQuery}
              onFocus={() => {
                setIsSearchFocused(true);
                setSearchResults([]);
              }}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              onSubmit={() => {
                handleSearchSubmit();
                setIsSearchFocused(false);
              }}
              onClear={() => {
                setSearchQuery('');
                setSearchResults([]);
                setAutocompleteSuggestions([]);
                setIsSearchFocused(false);
              }}
              isFocused={isSearchFocused}
              suggestions={autocompleteSuggestions}
              onSelectSuggestion={(suggestion) => {
                handleSuggestionSelect(suggestion);
                setIsSearchFocused(false);
              }}
              showSuggestions={isSearchFocused && autocompleteSuggestions.length > 0}
              suggestionsOpacity={autocompleteOpacity}
              loadingSuggestions={autocompleteLoading && searchQuery.trim().length >= 2}
              variant="hero"
              quickPicks={!isSearchFocused ? quickFilterSuggestions : undefined}
              onQuickPickPress={handleQuickPickPress}
              helperText={
                !isSearchFocused && searchQuery.trim().length === 0
                  ? 'Jump back in with these quick picks'
                  : undefined
              }
            />

            <View style={styles.categoryActionsRow}>
              <ThemedText style={styles.categoryActionsLabel}>
                {isCategoriesExpanded ? 'All categories' : 'Browse by category'}
              </ThemedText>
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
            </View>
            
            {/* Categories Scrollable List */}
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
                {categories.length > 0 && categories.map((category) => (
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
                {categories.length > 0 && categories.map((category) => (
                  <CategoryCard 
                    key={category.id} 
                    category={category}
                    isSelected={selectedCategoryId === category.id}
                    onPress={() => handleCategoryPress(category.id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* Search Mode Header - Show when in search mode */}
      {isInSearchMode && (
        <Animated.View
          style={[
            styles.searchModeHeader,
            { paddingTop: insets.top + 8 },
            {
              opacity: searchModeOpacity,
              transform: [
                {
                  translateY: searchModeOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.searchModeHeaderContent}>
            <SearchField
              value={searchQuery}
              placeholder={
                searchQuery.length > 0
                  ? "Continue searching..."
                  : "Search for products, brands, or categories"
              }
              onChangeText={setSearchQuery}
              onFocus={() => {
                setIsSearchFocused(true);
                setSearchResults([]);
              }}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              onSubmit={() => {
                handleSearchSubmit();
                setIsSearchFocused(false);
              }}
              onClear={() => {
                setSearchQuery('');
                setSearchResults([]);
                setAutocompleteSuggestions([]);
              }}
              isFocused={isSearchFocused}
              suggestions={autocompleteSuggestions}
              onSelectSuggestion={(suggestion) => {
                handleSuggestionSelect(suggestion);
                setIsSearchFocused(false);
              }}
              showSuggestions={isSearchFocused && autocompleteSuggestions.length > 0}
              suggestionsOpacity={autocompleteOpacity}
              loadingSuggestions={autocompleteLoading && searchQuery.trim().length >= 2}
              showBackButton
              onBack={handleBackFromSearch}
              variant="header"
              quickPicks={
                searchQuery.trim().length === 0 ? quickFilterSuggestions.slice(0, 3) : undefined
              }
              onQuickPickPress={handleQuickPickPress}
              helperText={
                searchQuery.trim().length === 0
                  ? 'Need ideas? Try one of the suggested searches below'
                  : undefined
              }
            />
          </View>
        </Animated.View>
      )}

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
              ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                  </ThemedText>
                </View>
              }
              ListEmptyComponent={
                searchLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4a5568" />
                    <ThemedText style={styles.loadingText}>
                      Searching for products...
                    </ThemedText>
                  </View>
                ) : searchError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" style={{ marginBottom: 12 }} />
                    <ThemedText style={styles.errorText}>{searchError}</ThemedText>
                    <ThemedText style={styles.errorSubtext}>
                      Please try again or check your connection
                    </ThemedText>
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
            >
              {/* Show "no results" only when search was submitted (not focused) */}
              {!isSearchFocused && searchQuery.trim().length > 0 && searchResults.length === 0 && !searchLoading && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={64} color="#d1d5db" style={{ marginBottom: 16 }} />
                  <ThemedText style={styles.emptyStateTitle}>
                    No results found
                  </ThemedText>
                  <ThemedText style={styles.emptyStateText}>
                    We couldn't find any products matching "{searchQuery}"
                  </ThemedText>
                  <ThemedText style={styles.emptyStateSubtext}>
                    Try different keywords or browse categories
                  </ThemedText>
                </View>
              )}
              
              {/* Show placeholder when search is focused but no query yet */}
              {isSearchFocused && searchQuery.trim().length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={64} color="#d1d5db" style={{ marginBottom: 16 }} />
                  <ThemedText style={styles.emptyStateTitle}>
                    Start searching
                  </ThemedText>
                  <ThemedText style={styles.emptyStateText}>
                    Type to find products, brands, or categories
                  </ThemedText>
                </View>
              )}
              
              {/* Show placeholder when search is focused with query but no results yet */}
              {isSearchFocused && searchQuery.trim().length > 0 && searchResults.length === 0 && !searchLoading && (
                <View style={styles.emptyState}>
                  <Ionicons name="arrow-down-outline" size={48} color="#9ca3af" style={{ marginBottom: 16 }} />
                  <ThemedText style={styles.emptyStateText}>
                    Press Enter or tap search to find "{searchQuery}"
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
              {Object.entries(productsByCategory).map(([categoryCode, categoryProducts]) => {
                const category = categories.find(c => c.code === categoryCode);
                const icon = category ? categoryIconMap[category.code] || '📦' : '📦';
                if (!category || categoryProducts.length === 0) return null;
                return (
                  <ProductSection
                    key={categoryCode}
                    title={`${category.displayName} ${icon}`}
                    products={categoryProducts}
                  />
                );
              })}
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
    backgroundColor: '#fff',
    zIndex: 1000,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  searchModeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchModeHeaderContent: {
    paddingVertical: 8,
  },
  backButtonInSearch: {
    marginRight: 4,
  },
  categoryContainer: {
    padding: 12,
    paddingBottom: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  categoryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  categoryActionsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  expandToggleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesWrapper: {
    overflow: 'hidden',
  },
  categoriesWrapperCollapsed: {
    maxHeight: 85,
  },
  categoriesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginLeft: 5,
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
    paddingRight: 4,
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 6,
    width: CATEGORY_CARD_SIZE,
    height: CATEGORY_CARD_HEIGHT,
    marginRight: 5,
    justifyContent: 'center',
  },
  categoryIconContainer: {
    marginBottom: 2,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    minHeight: 14,
    lineHeight: 14,
    color: '#000',
  },
  searchFieldWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  searchFieldWrapperHero: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchFieldWrapperHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
  },
  searchPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
    padding: 0,
    margin: 0,
  },
  searchHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  searchHelperIcon: {
    marginRight: 6,
  },
  searchHelperText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  quickPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  quickPickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    marginRight: 8,
    marginBottom: 8,
  },
  quickPickIcon: {
    marginRight: 4,
  },
  quickPickText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  categoryCardSelected: {
    backgroundColor: '#e0e0e0',
  },
  categoryCardPressed: {
    opacity: 0.7,
  },
  emptyState: {
    paddingVertical: 80,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
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
  seeAllText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '600',
  },
  productList: {
    paddingHorizontal: 8,
    gap: 12,
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
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    minHeight: 36,
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a5568',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: '#999',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4a5568',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  autocompleteContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 250,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  autocompleteHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  autocompleteHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  autocompleteItemLast: {
    borderBottomWidth: 0,
  },
  autocompleteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autocompleteText: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  autocompleteLoadingContainer: {
    marginTop: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  autocompleteLoadingText: {
    fontSize: 14,
    color: '#6b7280',
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
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
