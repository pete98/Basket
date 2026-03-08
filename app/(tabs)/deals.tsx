import { ProductCard } from '@/components/product-card';
import { ProductDetailSheet } from '@/components/product-detail-sheet';
import { ThemedText } from '@/components/themed-text';
import { useLocation } from '@/contexts/location-context';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { getDealsSections } from '@/lib/api/promotions';
import { getActiveStore, getUserByAuth0 } from '@/lib/api/users';
import type {
  DealSection,
  DealSectionProductSnapshot,
  DealsSectionsResponse,
} from '@/lib/types/promotions';
import type { UIProduct } from '@/lib/types/ui';
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
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 32 - 24) / 2.25;

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
    promoTag: product.discountLabel || undefined,
    image: product.imageUrl || '',
    category: product.category || section.title,
    inStock: true,
    brand: product.brand || undefined,
  };
}

function DealSectionCard({
  section,
  onProductPress,
}: {
  section: DealSection;
  onProductPress: (product: UIProduct) => void;
}) {
  const products = section.products.map((product) => ({
    snapshot: product,
    uiProduct: toUIProduct(product, section),
  }));

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleBlock}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <View style={styles.sectionTitleUnderline} />
          </View>
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
              <ProductCard product={item.uiProduct} onPress={onProductPress} />
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
  const [selectedProduct, setSelectedProduct] = useState<UIProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const resolvedStoreId = useMemo(
    () => parseStoreId(selectedLocation.id) ?? activeStoreId,
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

  const loadDeals = useCallback(
    async ({ signal, isRefresh = false }: { signal: AbortSignal; isRefresh?: boolean }) => {
      if (!isLoggedIn) {
        setDealsLayout(null);
        setLoadError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!resolvedStoreId) {
        setDealsLayout(null);
        setLoadError('Select a store to load deals.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setDealsLayout(null);
          setLoadError('Log in to load deals.');
          return;
        }

        const response = await getDealsSections({
          storeId: resolvedStoreId,
          accessToken,
          signal,
        });
        setDealsLayout(response);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setDealsLayout(null);
        setLoadError(error instanceof Error ? error.message : 'Unable to load deals.');
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
          return;
        }
        setIsLoading(false);
      }
    },
    [getAccessToken, isLoggedIn, resolvedStoreId]
  );

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
    const controller = new AbortController();
    void loadDeals({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [loadDeals]);

  const handleRefresh = useCallback(() => {
    const controller = new AbortController();
    void loadDeals({ signal: controller.signal, isRefresh: true });
  }, [loadDeals]);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={[styles.pageHeaderBackground, { paddingTop: insets.top + 8 }]}> 
          <View style={styles.pageHeaderContent}>
            <View>
              <Text style={styles.pageHeaderTitle}>Deals</Text>
            </View>
          </View>
        </View>
        <View style={[styles.infoCard, styles.contentTopSpacing]}>
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
            </View>
          </View>
        </View>

      <View style={styles.content}>
        {isLoading && (
          <View style={[styles.centerState, styles.contentTopSpacing]}>
            <ActivityIndicator size="small" color="#111827" />
          </View>
        )}

        {!isLoading && loadError && (
          <View style={[styles.infoCard, styles.contentTopSpacing]}>
            <Text style={styles.infoTitle}>Unable to load config</Text>
            <Text style={styles.infoSubtitle}>{loadError}</Text>
            <Pressable style={styles.secondaryButton} onPress={handleRefresh}>
              <Text style={styles.secondaryButtonText}>Refresh deals</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !loadError && dealsLayout && orderedSections.length === 0 && (
          <View style={[styles.infoCard, styles.contentTopSpacing]}>
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
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            renderItem={({ item }) => <DealSectionCard section={item} onProductPress={setSelectedProduct} />}
          />
        )}
      </View>
      <ProductDetailSheet
        product={selectedProduct}
        storeId={resolvedStoreId}
        getAccessToken={getAccessToken}
        onDismiss={() => setSelectedProduct(null)}
      />
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
    minHeight: 56,
    justifyContent: 'center',
  },
  pageHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 0,
    paddingTop: 0,
  },
  centerState: {
    marginTop: 0,
    alignItems: 'center',
  },
  sectionsList: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 24,
    marginTop: 12,
  },
  contentTopSpacing: {
    marginTop: 12,
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
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryButtonText: {
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
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  sectionTitleBlock: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    paddingHorizontal: 0,
    marginBottom: 0,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionTitleUnderline: {
    width: '68%',
    minWidth: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#f97316',
  },
  sectionDescription: {
    paddingHorizontal: 0,
    fontSize: 13,
    color: '#475467',
    marginBottom: 10,
  },
  emptyProductsText: {
    paddingHorizontal: 0,
    fontSize: 13,
    color: '#667085',
  },
  productList: {
    paddingHorizontal: 0,
    paddingBottom: 2,
    gap: 12,
  },
  productCardWrapper: {
    width: PRODUCT_CARD_WIDTH,
  },
});
