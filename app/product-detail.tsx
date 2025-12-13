import { ThemedText } from '@/components/themed-text';
import { useCart } from '@/contexts/cart-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

const isNonEmptyString = (value?: string | null): value is string => !!value && value.trim().length > 0;

type InfoTab = 'details' | 'ingredients';

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addItem, updateQuantity, state } = useCart();
  const insets = useSafeAreaInsets();

  const [infoTab, setInfoTab] = useState<InfoTab>('details');
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Parse product data from params
  const product = {
    id: params.id as string,
    name: params.name as string,
    price: parseFloat(params.price as string) || 0,
    image: params.image as string,
    brand: params.brand as string,
    description: params.description as string,
    weight: params.weight ? parseFloat(params.weight as string) : undefined,
    weightUnit: params.weightUnit as string,
    calories: params.calories ? parseFloat(params.calories as string) : undefined,
    stockQuantity: params.stockQuantity ? parseInt(params.stockQuantity as string) : 100,
    popularityScore: params.popularityScore ? parseFloat(params.popularityScore as string) : 999,
    category: params.category as string,
  };

  const originalPrice = product.price * 1.13;
  const saleEndDays = 1;
  const purchaseCount = Math.floor(product.popularityScore || 999);

  const cartItem = state.items.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const [selectedQuantity, setSelectedQuantity] = useState(() => cartItem?.quantity || 1);
  const [addButtonState, setAddButtonState] = useState<'idle' | 'added'>('idle');
  const addToCartScale = useRef(new Animated.Value(1));
  const addButtonFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelectedQuantity(cartItem?.quantity || 1);
  }, [cartItem?.quantity]);

  const handleAddToCart = () => {
    const desiredQuantity = Math.max(selectedQuantity, 1);

    if (quantity === 0) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || '',
      });

      if (desiredQuantity > 1) {
        updateQuantity(product.id, desiredQuantity);
      }
      return;
    }

    updateQuantity(product.id, desiredQuantity);
  };

  const handleIncrement = () => {
    setSelectedQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    setSelectedQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  const handleAddToCartPress = () => {
    handleAddToCart();
    setAddButtonState('added');

    if (addButtonFeedbackTimer.current) {
      clearTimeout(addButtonFeedbackTimer.current);
    }
    addButtonFeedbackTimer.current = setTimeout(() => {
      setAddButtonState('idle');
    }, 1500);
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = setTimeout(() => {
      router.back();
    }, 900);

    Animated.sequence([
      Animated.timing(addToCartScale.current, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(addToCartScale.current, {
        toValue: 1.05,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(addToCartScale.current, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    return () => {
      if (addButtonFeedbackTimer.current) {
        clearTimeout(addButtonFeedbackTimer.current);
      }
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const formattedWeight = formatWeight(product.weight, product.weightUnit);
  const weightCaloriesText = 
    formattedWeight && product.calories 
      ? `${formattedWeight} • ${product.calories} cals`
      : formattedWeight 
        ? formattedWeight
        : product.calories 
          ? `${product.calories} cals`
          : '';

  const stockStatus = product.stockQuantity > 50 ? 'Many in stock' : product.stockQuantity > 0 ? 'Low stock' : 'Out of stock';
  const purchaseText = purchaseCount >= 999 ? '999+ bought yesterday' : `${purchaseCount}+ bought yesterday`;

  const normalizedName = product.name?.toLowerCase() ?? '';
  const quantityLabel = normalizedName.includes('avocado') ? 'avocado' : 'item';

  const infoTabs: Array<{ label: string; value: InfoTab }> = [
    { label: 'Details', value: 'details' },
    { label: 'Ingredients', value: 'ingredients' },
  ];

  const infoContent = infoTab === 'details'
    ? [
        weightCaloriesText,
        product.description,
        product.brand ? `Brand: ${product.brand}` : undefined,
      ].filter(isNonEmptyString)
    : [
        product.description
          ? `This ${product.name || 'item'} is made with simple, quality ingredients.`
          : undefined,
        'Ingredients list coming soon.',
      ].filter(isNonEmptyString);

  return (
      <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={[styles.pageHeaderBackground, { paddingTop: insets.top + 8 }]}>
        <View style={styles.pageHeaderContent}>
          <View style={styles.pageHeaderLeading}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color="#111322" />
            </TouchableOpacity>
            <View style={styles.pageHeaderTitleBlock}>
              <Text style={styles.pageHeaderTitle}>{product.name || 'Product'}</Text>
              <Text style={styles.pageHeaderSubtitle}>Fresh from the market</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setIsBookmarked(prev => !prev)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons 
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
                size={22} 
                color="#111322" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => console.log('Share product', product.name)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="share-outline" size={22} color="#111322" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroCard}>
          <View style={styles.heroImageWrapper}>
            {product.image ? (
              <Image source={{ uri: product.image }} style={styles.heroImage} resizeMode="contain" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={72} color="#CED2DA" />
              </View>
            )}
          </View>
          <View style={styles.heroTags}>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{purchaseText}</Text>
            </View>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{stockStatus}</Text>
            </View>
          </View>
        </View>

        {/* Product Meta */}
        <View style={styles.productMeta}>
          <ThemedText style={styles.productTitle}>{product.name || 'Fresh Produce'}</ThemedText>
          <Text style={styles.productSubtitle}>1 {quantityLabel}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.salePrice}>${product.price.toFixed(2)}</Text>
            <Text style={styles.originalPrice}>${originalPrice.toFixed(2)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={18} color="#6C768A" />
            <Text style={styles.infoRowText}>Free returns within 30 days</Text>
          </View>

          <View style={styles.rollbackRow}>
            <Text style={styles.rollbackText}>Rollback</Text>
            <Text style={styles.saleEndText}>Sale ends in {saleEndDays} day{saleEndDays !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Product Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Product information</ThemedText>
          </View>
          <View style={styles.tabRow}>
            {infoTabs.map(tab => {
              const selected = tab.value === infoTab;
              return (
                <TouchableOpacity
                  key={tab.value}
                  style={[styles.infoTab, selected && styles.infoTabSelected]}
                  onPress={() => setInfoTab(tab.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.infoTabText, selected && styles.infoTabTextSelected]}>
                    {tab.label}
                  </Text>
                  <Ionicons 
                    name={selected ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={selected ? '#0B1221' : '#6C768A'} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.infoContent}>
            {infoContent.length > 0 ? (
              infoContent.map((line, index) => (
                <Text key={`${infoTab}-${index}`} style={styles.infoContentText}>
                  {line}
                </Text>
              ))
            ) : (
              <Text style={styles.infoContentText}>No additional information available.</Text>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Floating Add to Cart */}
      <View style={styles.footer}>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={handleDecrement}
            disabled={selectedQuantity <= 1}
          >
            <Text style={[styles.stepperButtonText, selectedQuantity <= 1 && styles.disabledText]}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{selectedQuantity}</Text>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={handleIncrement}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Animated.View style={[styles.cartButtonWrapper, { transform: [{ scale: addToCartScale.current }] }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pageHeaderBackground: {
    backgroundColor: '#f97316',
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
  },
  pageHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pageHeaderLeading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageHeaderTitleBlock: {
    marginLeft: 8,
  },
  pageHeaderTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  pageHeaderSubtitle: {
    color: '#ffe8d2',
    fontSize: 13,
    marginTop: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  heroImageWrapper: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7FB',
  },
  heroTags: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  tagPill: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#F6F7FB',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E5D78',
  },
  productMeta: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  productTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  productSubtitle: {
    fontSize: 15,
    color: '#667085',
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  salePrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F0B100',
  },
  originalPrice: {
    fontSize: 18,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  infoRowText: {
    fontSize: 15,
    color: '#6C768A',
  },
  rollbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  rollbackText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00A651',
  },
  saleEndText: {
    fontSize: 14,
    color: '#6C768A',
  },
  sectionCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ECEFF4',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  infoTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F6F7FB',
  },
  infoTabSelected: {
    backgroundColor: '#E8EEF9',
  },
  infoTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C768A',
  },
  infoTabTextSelected: {
    color: '#0B1221',
  },
  infoContent: {
    marginTop: 16,
  },
  infoContentText: {
    fontSize: 14,
    color: '#4E5D78',
    lineHeight: 20,
    marginBottom: 6,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
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
});
