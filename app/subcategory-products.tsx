import { ProductCard } from '@/components/product-card';
import { ProductDetailSheet } from '@/components/product-detail-sheet';
import { ThemedText } from '@/components/themed-text';
import { getStoreInventory } from '@/lib/api/stores';
import { Product as ApiProduct } from '@/lib/types/api';
import { UIProduct } from '@/lib/types/ui';
import { buildCategoryNameCandidates } from '@/lib/utils/category';
import { mapApiProductToProduct } from '@/lib/utils/products';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SubcategoryParams {
  displayName?: string;
  code?: string;
  storeId?: string;
  subcategoryTitle?: string;
  subcategoryCode?: string;
}

const ACCESS_TOKEN_KEY = 'auth0_access_token';

function parseStoreIdParam(storeId: string | undefined): number | null {
  if (!storeId) return null;
  const parsedStoreId = Number.parseInt(storeId, 10);
  if (Number.isNaN(parsedStoreId)) return null;
  return parsedStoreId;
}

function normalizeValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function tokenizeValue(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(/[,/|>]/)
    .map((token) => normalizeValue(token))
    .filter((token) => token.length > 0);
}

function buildSubcategoryCandidateSet(
  subcategoryTitle: string | undefined,
  subcategoryCode: string | undefined
): Set<string> {
  const candidates = new Set<string>();
  const values = [subcategoryTitle, subcategoryCode]
    .filter((value): value is string => Boolean(value && value.trim().length > 0));

  values.forEach((value) => {
    candidates.add(normalizeValue(value));
    tokenizeValue(value).forEach((token) => candidates.add(token));
  });

  return candidates;
}

function matchesCategory(product: ApiProduct, normalizedCategoryCandidates: string[]): boolean {
  const productCategoryTokens = tokenizeValue(
    product.categoryDisplayName ||
    product.categories ||
    product.subCategoryDisplayName ||
    product.subCategory ||
    ''
  );
  if (productCategoryTokens.length === 0) return false;
  return normalizedCategoryCandidates.some((candidate) => productCategoryTokens.includes(candidate));
}

function matchesSubcategory(product: ApiProduct, subcategoryCandidates: Set<string>): boolean {
  const productSubcategoryTokens = tokenizeValue(
    product.subCategoryDisplayName ||
    product.subCategory ||
    ''
  );
  if (productSubcategoryTokens.length === 0) return false;
  return productSubcategoryTokens.some((token) => subcategoryCandidates.has(token));
}

export default function SubcategoryProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as SubcategoryParams;
  const { getCredentials } = useAuth0();
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<UIProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subcategoryTitle =
    typeof params.subcategoryTitle === 'string' && params.subcategoryTitle.trim().length > 0
      ? params.subcategoryTitle.trim()
      : 'Subcategory';
  const routeStoreId = parseStoreIdParam(typeof params.storeId === 'string' ? params.storeId : undefined);
  const resolvedStoreId = routeStoreId;

  const categoryCandidates = useMemo(
    () =>
      buildCategoryNameCandidates({
        displayName: typeof params.displayName === 'string' ? params.displayName : undefined,
        code: typeof params.code === 'string' ? params.code : undefined,
      }),
    [params.code, params.displayName]
  );
  const normalizedCategoryCandidates = useMemo(
    () => categoryCandidates.map((candidate) => normalizeValue(candidate)),
    [categoryCandidates]
  );
  const subcategoryCandidates = useMemo(
    () =>
      buildSubcategoryCandidateSet(
        typeof params.subcategoryTitle === 'string' ? params.subcategoryTitle : undefined,
        typeof params.subcategoryCode === 'string' ? params.subcategoryCode : undefined
      ),
    [params.subcategoryCode, params.subcategoryTitle]
  );

  const getAccessToken = useCallback(async () => {
    let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (accessToken) return accessToken;
    const credentials = await getCredentials();
    accessToken = credentials?.accessToken ?? null;
    if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    return accessToken;
  }, [getCredentials]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadProducts() {
      if (resolvedStoreId === null) {
        if (!isMounted) return;
        setProducts([]);
        setIsLoading(false);
        setErrorMessage('Select a store to view products.');
        return;
      }

      if (subcategoryCandidates.size === 0) {
        if (!isMounted) return;
        setProducts([]);
        setIsLoading(false);
        setErrorMessage('Missing subcategory details.');
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (!isMounted) return;
          setProducts([]);
          setErrorMessage('Log in to load products.');
          return;
        }

        const inventory = await getStoreInventory({
          storeId: resolvedStoreId,
          accessToken,
          signal: abortController.signal,
        });

        const filtered = inventory
          .filter((product) => matchesCategory(product, normalizedCategoryCandidates))
          .filter((product) => matchesSubcategory(product, subcategoryCandidates))
          .map(mapApiProductToProduct);

        if (!isMounted) return;
        setProducts(filtered);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!isMounted) return;
        setProducts([]);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load products');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [getAccessToken, normalizedCategoryCandidates, resolvedStoreId, subcategoryCandidates]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          {subcategoryTitle}
        </ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a5568" />
          <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
        </View>
      ) : errorMessage ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard product={item} onPress={setSelectedProduct} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No products found in this subcategory.</ThemedText>
            </View>
          }
        />
      )}
      <ProductDetailSheet
        product={selectedProduct}
        storeId={resolvedStoreId}
        getAccessToken={getAccessToken}
        onDismiss={() => setSelectedProduct(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  cardWrapper: {
    width: '48.5%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
});
