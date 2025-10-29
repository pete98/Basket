import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;

// Mock Data
const banners = [
  { id: '1', image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800' },
  { id: '2', image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800' },
  { id: '3', image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800' },
  { id: '4', image: 'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=800' },
];

const categories = [
  { id: '1', name: 'Vegetables', icon: '🥬' },
  { id: '2', name: 'Fruits', icon: '🍎' },
  { id: '3', name: 'Dairy', icon: '🥛' },
  { id: '4', name: 'Snacks', icon: '🍪' },
  { id: '5', name: 'Candy', icon: '🍭' },
  { id: '6', name: 'Soda', icon: '🥤' },
  { id: '7', name: 'Meat', icon: '🥩' },
  { id: '8', name: 'Bakery', icon: '🍞' },
  { id: '9', name: 'Beverages', icon: '🧃' },
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

function CategoryCard({ category }: { category: typeof categories[0] }) {
  return (
    <Pressable
      style={styles.categoryCard}
      onPress={() => console.log(`Category pressed: ${category.name}`)}
      android_ripple={{ color: '#f0f0f0' }}
    >
      <View style={styles.categoryIconContainer}>
        <ThemedText style={styles.categoryIcon}>{category.icon}</ThemedText>
      </View>
      <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
    </Pressable>
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
  const insets = useSafeAreaInsets();
  const [flagType, setFlagType] = useState<'india' | 'usa'>('usa');
  const [glassContainerHeight, setGlassContainerHeight] = useState(0);
  
  const saleProducts = productsData.filter(p => p.category === 'Sale');
  const sodaProducts = productsData.filter(p => p.category === 'Soda');
  const candyProducts = productsData.filter(p => p.category === 'Candy');
  const snackProducts = productsData.filter(p => p.category === 'Snack');
  const vegetableProducts = productsData.filter(p => p.category === 'Vegetables');

  const toggleFlag = () => {
    setFlagType(prev => prev === 'usa' ? 'india' : 'usa');
  };

  const handleGlassContainerLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    // Store the height of the glass container
    setGlassContainerHeight(height);
  };

  // Calculate scroll padding using the measured glass container height.
  // Safe-area padding comes from the system on iOS, and we add it manually on Android.
  const estimatedContainerHeight = glassContainerHeight > 0 ? glassContainerHeight : 140;
  const headerSpacing = 20;
  const contentGap = 16;
  const headerTopOffset = insets.top + headerSpacing;
  const baseContentOffset = headerSpacing + estimatedContainerHeight + contentGap;
  const totalTopOffset = baseContentOffset + (Platform.OS === 'ios' ? 0 : insets.top);

  return (
    <View style={styles.container}>
      {/* Fixed Glass Container with Categories and Icon Buttons */}
      <View 
        style={[styles.fixedGlassContainer, { top: headerTopOffset }]}
      >
        <View onLayout={handleGlassContainerLayout}>
          <GlassView style={styles.glassContainer}>
          {/* Header Row: Categories Title and Icon Buttons */}
          <View style={styles.glassHeader}>
            <ThemedText type="subtitle" style={styles.categoriesTitle}>
              Categories
            </ThemedText>
            <View style={styles.iconButtonsRow}>
              <GlassView style={styles.glassButton}>
                <Pressable
                  onPress={() => console.log('Cart pressed')}
                  style={styles.iconPressable}
                >
                  <Ionicons name="cart-outline" size={22} color="#000" />
                </Pressable>
              </GlassView>
              <GlassView style={styles.glassButton}>
                <Pressable
                  onPress={() => console.log('Notifications pressed')}
                  style={styles.iconPressable}
                >
                  <Ionicons name="notifications-outline" size={22} color="#000" />
                </Pressable>
              </GlassView>
              <GlassView style={styles.glassButton}>
                <Pressable
                  onPress={toggleFlag}
                  style={styles.iconPressable}
                >
                  <ThemedText style={styles.flagIcon}>
                    {flagType === 'usa' ? '🇺🇸' : '🇮🇳'}
                  </ThemedText>
                </Pressable>
              </GlassView>
            </View>
          </View>
          {/* Categories Scrollable List */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </ScrollView>
          </GlassView>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: totalTopOffset }
        ]}
      >
        {/* Banner Carousel */}
        <View style={styles.bannerSection}>
          <BannerCarousel />
        </View>

        {/* Product Sections */}
        <ProductSection title="Flash Sale 🔥" products={saleProducts} />
        <ProductSection title="Soda & Drinks 🥤" products={sodaProducts} />
        <ProductSection title="Candy & Sweets 🍭" products={candyProducts} />
        <ProductSection title="Snacks 🍪" products={snackProducts} />
        <ProductSection title="Fresh Vegetables 🥬" products={vegetableProducts} />
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedGlassContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  glassContainer: {
    padding: 16,
    borderRadius: 20,
  },
  glassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagIcon: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    // paddingTop is set dynamically based on glass container height
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
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIconContainer: {
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
