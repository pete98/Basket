import { ThemedText } from '@/components/themed-text';
import { AGENT_EVENTS, agentBus, SelectCategoryPayload } from '@/lib/agent-bus';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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
const BANNER_WIDTH = SCREEN_WIDTH - 32;
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

const categories = [
  { id: '1', name: 'Soda', icon: '🥤' },
  { id: '2', name: 'Snacks', icon: '🍎' },
  { id: '3', name: 'Candy', icon: '🍭' },
  { id: '4', name: 'Grocery', icon: '🛒' },
  { id: '5', name: 'Veggies', icon: '🥬' },
  { id: '6', name: 'Fruits', icon: '🍉' },
  { id: '7', name: 'Meat', icon: '🥩' },
  { id: '8', name: 'Bakery', icon: '🍞' },
  { id: '9', name: 'Drinks', icon: '🧃' },
  { id: '10', name: 'Frozen', icon: '🧊' },
];

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  inStock: boolean;
  discount?: number;
}

const productsData: Product[] = [
  // Sale Products
  { id: 's1', name: 'Premium Chips', price: 2.99, originalPrice: 4.99, image: 'https://images.unsplash.com/photo-1606312619070-d48b8457de8e?w=400', category: 'Sale', inStock: true, discount: 40 },
  { id: 's2', name: 'Organic Crackers', price: 3.49, originalPrice: 5.99, image: 'https://images.unsplash.com/photo-1490474418585-b3b36b4e6a21?w=400', category: 'Sale', inStock: true, discount: 42 },
  { id: 's3', name: 'Fresh Bread Loaf', price: 2.29, originalPrice: 3.99, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400', category: 'Sale', inStock: true, discount: 43 },
  { id: 's4', name: 'Granola Bars', price: 1.99, originalPrice: 3.49, image: 'https://images.unsplash.com/photo-1598638312666-80a3cf3ef5fb?w=400', category: 'Sale', inStock: true, discount: 43 },
  { id: 's5', name: 'Cookies Box', price: 3.99, originalPrice: 6.99, image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400', category: 'Sale', inStock: true, discount: 43 },
  { id: 's6', name: 'Milk Carton', price: 2.49, originalPrice: 3.99, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', category: 'Sale', inStock: true, discount: 38 },
  
  // Soda Products
  { id: 'd1', name: 'Cola Classic', price: 1.49, image: 'https://images.unsplash.com/photo-1590179570995-de9fe56c827a?w=400', category: 'Soda', inStock: true },
  { id: 'd2', name: 'Orange Fizz', price: 1.79, image: 'https://images.unsplash.com/photo-1510839410504-e7ab2073fa9e?w=400', category: 'Soda', inStock: true },
  { id: 'd3', name: 'Lemon Sparkle', price: 1.99, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', category: 'Soda', inStock: true },
  { id: 'd4', name: 'Root Beer', price: 1.69, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', category: 'Soda', inStock: true },
  { id: 'd5', name: 'Ginger Ale', price: 1.89, image: 'https://images.unsplash.com/photo-1604977049384-c04c67ad8e0f?w=400', category: 'Soda', inStock: true },
  { id: 'd6', name: 'Cherry Pop', price: 1.99, image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400', category: 'Soda', inStock: true },
  
  // Candy Products
  { id: 'c1', name: 'Chocolate Bar', price: 1.99, image: 'https://images.unsplash.com/photo-1606312619070-d48b8457de8e?w=400', category: 'Candy', inStock: true },
  { id: 'c2', name: 'Gummy Bears', price: 2.49, image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400', category: 'Candy', inStock: true },
  { id: 'c3', name: 'Lollipops Pack', price: 1.29, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', category: 'Candy', inStock: true },
  { id: 'c4', name: 'Jelly Beans', price: 2.99, image: 'https://images.unsplash.com/photo-1571056435391-43af3b23e14f?w=400', category: 'Candy', inStock: true },
  { id: 'c5', name: 'Sour Straws', price: 1.79, image: 'https://images.unsplash.com/photo-1575505586569-646b2ca89815?w=400', category: 'Candy', inStock: true },
  { id: 'c6', name: 'Marshmallow Bag', price: 1.89, image: 'https://images.unsplash.com/photo-1530533718754-001d83678c92?w=400', category: 'Candy', inStock: true },
  
  // Snack Products
  { id: 'n1', name: 'Potato Chips', price: 3.99, image: 'https://images.unsplash.com/photo-1606312619070-d48b8457de8e?w=400', category: 'Snack', inStock: true },
  { id: 'n2', name: 'Trail Mix', price: 4.99, image: 'https://images.unsplash.com/photo-1593031450687-bc5dd14e2e3a?w=400', category: 'Snack', inStock: true },
  { id: 'n3', name: 'Pretzels', price: 2.99, image: 'https://images.unsplash.com/photo-1608050998237-3d9a68cb5d36?w=400', category: 'Snack', inStock: true },
  { id: 'n4', name: 'Popcorn Bag', price: 1.49, image: 'https://images.unsplash.com/photo-1611022507339-b55c13137222?w=400', category: 'Snack', inStock: true },
  { id: 'n5', name: 'Nuts Mix', price: 5.99, image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400', category: 'Snack', inStock: true },
  { id: 'n6', name: 'Crackers Box', price: 2.79, image: 'https://images.unsplash.com/photo-1609215059459-14ea97ef7ca4?w=400', category: 'Snack', inStock: true },
  
  // Vegetable Products
  { id: 'v1', name: 'Organic Carrots', price: 2.99, image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400', category: 'Vegetables', inStock: true },
  { id: 'v2', name: 'Fresh Broccoli', price: 3.49, image: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=400', category: 'Vegetables', inStock: true },
  { id: 'v3', name: 'Bell Peppers', price: 4.99, image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400', category: 'Vegetables', inStock: true },
  { id: 'v4', name: 'Tomato Bunch', price: 2.79, image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400', category: 'Vegetables', inStock: true },
  { id: 'v5', name: 'Cucumber', price: 1.49, image: 'https://images.unsplash.com/photo-1604977049384-c04c67ad8e0f?w=400', category: 'Vegetables', inStock: true },
  { id: 'v6', name: 'Lettuce Head', price: 2.29, image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400', category: 'Vegetables', inStock: true },
];

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
  onPress 
}: { 
  category: typeof categories[0]; 
  isSelected: boolean; 
  onPress: () => void;
}) {
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
        <ThemedText style={styles.categoryIcon}>{category.icon}</ThemedText>
      </View>
      <ThemedText style={styles.categoryName} numberOfLines={2} pointerEvents="none">
        {category.name}
      </ThemedText>
    </TouchableOpacity>
  );
}

function ProductCard({ product }: { product: Product }) {
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
      <Image source={{ uri: product.image }} style={styles.productImage} />
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

function ProductSection({ title, products }: { title: string; products: Product[] }) {
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


export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categorySectionHeight, setCategorySectionHeight] = useState(0);
  
  // Map category names to product categories
  const getProductCategory = (categoryName: string): string | null => {
    const categoryMap: Record<string, string> = {
      'Soda': 'Soda',
      'Snacks': 'Snack',
      'Candy': 'Candy',
      'Veggies': 'Vegetables',
      'Drinks': 'Soda', // Map Drinks to Soda as well
    };
    return categoryMap[categoryName] || null;
  };
  
  // Filter products based on selected category
  const filteredProducts = selectedCategory 
    ? productsData.filter(p => {
        const productCategory = getProductCategory(selectedCategory);
        return productCategory && p.category === productCategory;
      })
    : [];
  
  const saleProducts = productsData.filter(p => p.category === 'Sale');
  const sodaProducts = productsData.filter(p => p.category === 'Soda');
  const candyProducts = productsData.filter(p => p.category === 'Candy');
  const snackProducts = productsData.filter(p => p.category === 'Snack');
  const vegetableProducts = productsData.filter(p => p.category === 'Vegetables');
  
  const handleCategoryPress = (categoryName: string) => {
    console.log('Category pressed:', categoryName);
    if (selectedCategory === categoryName) {
      // If same category is pressed, deselect it
      setSelectedCategory(null);
    } else {
      // Otherwise, select the new category
      setSelectedCategory(categoryName);
      // Collapse the category list after selection
      setIsCategoriesExpanded(false);
    }
  };

  useEffect(() => {
    const handleAgentSelect = (payload: SelectCategoryPayload) => {
      const targetName = categories.find(
        (cat) => cat.name.toLowerCase() === payload.category.trim().toLowerCase()
      )?.name;
      if (!targetName) return;

      setIsCategoriesExpanded(true);
      setSelectedCategory((prev) => (prev === targetName ? prev : targetName));
      // Collapse after a brief delay to allow user to see the selection
      setTimeout(() => {
        setIsCategoriesExpanded(false);
      }, 300);
    };

    const unsubscribe = agentBus.on<SelectCategoryPayload>(AGENT_EVENTS.SelectCategory, handleAgentSelect);
    return unsubscribe;
  }, []);

  const handleCategorySectionLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setCategorySectionHeight(height);
    }
  };

  const topOffset = categorySectionHeight > 0 ? categorySectionHeight : insets.top + 80;

  return (
    <View style={styles.container}>
      {/* Fixed Category Container at Top */}
      <View 
        style={[styles.categorySection, { paddingTop: insets.top + 8 }]}
        onLayout={handleCategorySectionLayout}
      >
        <View style={styles.categoryContainer}>
          {/* Search Pill */}
          <View style={styles.searchPill}>
            <View style={styles.searchPillContainer}>
              <Ionicons name="search-outline" size={16} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          
          {/* Expand/Collapse Button */}
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
          
          {/* Categories Scrollable List */}
          {isCategoriesExpanded ? (
            <View style={styles.categoriesGridContainer}>
              {categories.map((category) => (
                <CategoryCard 
                  key={category.id} 
                  category={category}
                  isSelected={selectedCategory === category.name}
                  onPress={() => handleCategoryPress(category.name)}
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
              {categories.map((category) => (
                <CategoryCard 
                  key={category.id} 
                  category={category}
                  isSelected={selectedCategory === category.name}
                  onPress={() => handleCategoryPress(category.name)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <ScrollView 
        style={[styles.scrollView, { marginTop: topOffset }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Product Sections */}
        {selectedCategory ? (
          // Show filtered products when category is selected
          filteredProducts.length > 0 ? (
            <ProductSection 
              title={`${selectedCategory} Products`} 
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
            <ProductSection title="Flash Sale 🔥" products={saleProducts} />
            <ProductSection title="Soda & Drinks 🥤" products={sodaProducts} />
            <ProductSection title="Candy & Sweets 🍭" products={candyProducts} />
            <ProductSection title="Snacks 🍪" products={snackProducts} />
            <ProductSection title="Fresh Vegetables 🥬" products={vegetableProducts} />
          </>
        )}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryContainer: {
    padding: 12,
    paddingBottom: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  expandToggleButton: {
    position: 'absolute',
    top: 17,
    right: 17,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
    paddingHorizontal: 16,
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
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
    paddingHorizontal: 16,
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
    marginRight: 0,
    justifyContent: 'center',
  },
  categoryIconContainer: {
    marginBottom: 2,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    minHeight: 14,
    lineHeight: 11,
    color: '#000',
  },
  searchPill: {
    marginBottom: 8,
    overflow: 'hidden',
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
  categoryCardSelected: {
    backgroundColor: '#e8f4f8',
    borderWidth: 2,
    borderColor: '#4a5568',
  },
  categoryCardPressed: {
    opacity: 0.7,
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seeAllText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '600',
  },
  productList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    width: 160,
    marginRight: 12,
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
});
