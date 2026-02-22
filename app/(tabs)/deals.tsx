import { useLocation } from '@/contexts/location-context';
import { ProductCard } from '@/components/product-card';
import { ThemedText } from '@/components/themed-text';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { getDealsSections } from '@/lib/api/promotions';
import type { UIProduct } from '@/lib/types/ui';
import { getActiveStore, getUserByAuth0 } from '@/lib/api/users';
import type {
  DealSection,
  DealSectionProductSnapshot,
  DealsSectionsResponse,
} from '@/lib/types/promotions';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCESS_TOKEN_KEY = 'auth0_access_token';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 32 - 20) / 2.9;

function parseStoreId(locationId: string): number | null {
  if (!locationId.startsWith('store-')) return null;
  const rawId = locationId.replace('store-', '');
  const parsedStoreId = Number.parseInt(rawId, 10);
  if (Number.isNaN(parsedStoreId)) return null;
  return parsedStoreId;
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

function toUIProduct(product: DealSectionProductSnapshot, section: DealSection): UIProduct {
  const promoPrice =
    typeof product.promoPrice === 'number' && Number.isFinite(product.promoPrice)
      ? product.promoPrice
      : typeof product.originalPrice === 'number' && Number.isFinite(product.originalPrice)
        ? product.originalPrice
        : 0;
  return {
    id: String(product.productId),
    name: product.name,
    price: promoPrice,
    originalPrice:
      typeof product.originalPrice === 'number' && Number.isFinite(product.originalPrice)
        ? product.originalPrice
        : undefined,
    image: product.imageUrl || '',
    category: product.category || section.title,
    inStock: true,
    brand: product.brand || undefined,
  };
}

function DealSectionCard({ section }: { section: DealSection }) {
  const products = section.products.map((product) => ({
    snapshot: product,
    uiProduct: toUIProduct(product, section),
  }));

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {section.title}
          </ThemedText>
          {!!section.badgeText && <Text style={styles.sectionBadge}>{section.badgeText}</Text>}
        </View>
      </View>
      {!!section.subtitle && <Text style={styles.sectionDescription}>{section.subtitle}</Text>}

      {products.length === 0 ? (
        <Text style={styles.emptyProductsText}>No product snapshots returned.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productList}
        >
          {products.map((item, index) => (
            <View
              key={`${section.promotionId}-${item.snapshot.productId}-${index}`}
              style={styles.productCardWrapper}
            >
              <ProductCard product={item.uiProduct} showPrice={false} showBorder={false} />
              <View style={styles.dealPriceRow}>
                <Text style={styles.dealPromoPrice}>${item.uiProduct.price.toFixed(2)}</Text>
                {typeof item.snapshot.originalPrice === 'number' && (
                  <Text style={styles.dealOriginalPrice}>${item.snapshot.originalPrice.toFixed(2)}</Text>
                )}
              </View>
              {!!item.snapshot.discountLabel && (
                <Text style={styles.dealDiscountLabel}>{item.snapshot.discountLabel}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn, openLogin } = useAuthGuard();
  const { selectedLocation } = useLocation();
  const { getCredentials } = useAuth0();

  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
  const [dealsLayout, setDealsLayout] = useState<DealsSectionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const resolvedStoreId = useMemo(
    () => activeStoreId ?? parseStoreId(selectedLocation.id),
    [activeStoreId, selectedLocation.id]
  );

  const orderedSections = useMemo(() => {
    if (!dealsLayout) return [];
    return dealsLayout.sections;
  }, [dealsLayout]);

  const getAccessToken = useCallback(async () => {
    let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (accessToken) return accessToken;
    const credentials = await getCredentials();
    accessToken = credentials?.accessToken ?? null;
    if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    return accessToken;
  }, [getCredentials]);

  useEffect(() => {
    if (!isLoggedIn) {
      setActiveStoreId(null);
      return;
    }

    let isActive = true;

    getAccessToken()
      .then(async (accessToken) => {
        if (!accessToken) return null;
        const profile = await getUserByAuth0(accessToken);
        const rawUserId = (profile as { id?: number | string }).id;
        if (!rawUserId) return null;
        const activeStore = await getActiveStore(rawUserId, accessToken);
        return getActiveStoreId(activeStore);
      })
      .then((storeIdValue) => {
        if (!isActive) return;
        setActiveStoreId(storeIdValue);
      })
      .catch(() => {
        if (!isActive) return;
        setActiveStoreId(null);
      });

    return () => {
      isActive = false;
    };
  }, [getAccessToken, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setDealsLayout(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    if (!resolvedStoreId) {
      setDealsLayout(null);
      setIsLoading(false);
      setLoadError('Select a store to load deals.');
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setIsLoading(true);
    setLoadError(null);

    getAccessToken()
      .then(async (accessToken) => {
        if (!accessToken) {
          if (!isActive) return null;
          setDealsLayout(null);
          setLoadError('Log in to load deals.');
          return null;
        }
        const response = await getDealsSections({
          storeId: resolvedStoreId,
          accessToken,
          signal: controller.signal,
        });
        if (!isActive) return null;
        setDealsLayout(response);
        return response;
      })
      .catch((error) => {
        if (!isActive) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setDealsLayout(null);
        setLoadError(error instanceof Error ? error.message : 'Unable to load deals.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [getAccessToken, isLoggedIn, resolvedStoreId]);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={[styles.pageHeaderBackground, { paddingTop: insets.top + 8 }]}> 
          <View style={styles.pageHeaderContent}>
            <View>
              <Text style={styles.pageHeaderTitle}>Deals</Text>
              <Text style={styles.pageHeaderSubtitle}>Log in to view offers</Text>
            </View>
          </View>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Your deals live here</Text>
          <Text style={styles.infoSubtitle}>Log in to browse store-specific deals and active offers.</Text>
          <Pressable style={styles.primaryButton} onPress={() => openLogin({ pathname: '/deals' })}>
            <Text style={styles.primaryButtonText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeaderBackground, { paddingTop: insets.top + 8 }]}> 
        <View style={styles.pageHeaderContent}>
          <View>
            <Text style={styles.pageHeaderTitle}>Deals</Text>
            <Text style={styles.pageHeaderSubtitle}>
              {isLoading ? 'Loading deals...' : 'Store promotions'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {isLoading && (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color="#111827" />
          </View>
        )}

        {!isLoading && loadError && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Unable to load config</Text>
            <Text style={styles.infoSubtitle}>{loadError}</Text>
          </View>
        )}

        {!isLoading && !loadError && dealsLayout && orderedSections.length === 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>No deals right now</Text>
            <Text style={styles.infoSubtitle}>
              We could not find any active deals for this store yet. Please check back soon.
            </Text>
          </View>
        )}

        {!isLoading && !loadError && dealsLayout && orderedSections.length > 0 && (
          <FlatList
            data={orderedSections}
            keyExtractor={(item, index) => `${item.promotionId}-${index}`}
            contentContainerStyle={styles.sectionsList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <DealSectionCard section={item} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pageHeaderBackground: {
    backgroundColor: '#f97316',
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
  },
  pageHeaderContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pageHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  pageHeaderSubtitle: {
    fontSize: 14,
    color: '#ffe8d2',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 0,
    paddingTop: 24,
  },
  centerState: {
    marginTop: 24,
    alignItems: 'center',
  },
  sectionsList: {
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 24,
  },
  infoCard: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#667085',
    marginTop: 8,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    paddingHorizontal: 0,
    marginBottom: 0,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionDescription: {
    paddingHorizontal: 0,
    fontSize: 13,
    color: '#475467',
    marginBottom: 10,
  },
  sectionBadge: {
    backgroundColor: '#ecfdf3',
    color: '#027a48',
    borderWidth: 1,
    borderColor: '#abefc6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '700',
  },
  emptyProductsText: {
    paddingHorizontal: 0,
    fontSize: 13,
    color: '#667085',
  },
  productList: {
    paddingHorizontal: 0,
    paddingBottom: 2,
    gap: 6,
  },
  productCardWrapper: {
    width: PRODUCT_CARD_WIDTH,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 10,
    padding: 6,
    backgroundColor: '#fff',
  },
  dealPriceRow: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  dealPromoPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111322',
  },
  dealOriginalPrice: {
    fontSize: 11,
    color: '#98A2B3',
    textDecorationLine: 'line-through',
  },
  dealDiscountLabel: {
    marginTop: 2,
    paddingHorizontal: 2,
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
});
