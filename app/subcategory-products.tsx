import { ProductCard } from '@/components/product-card';
import { ProductDetailSheet } from '@/components/product-detail-sheet';
import { ThemedText } from '@/components/themed-text';
import { getStoreInventory } from '@/lib/api/stores';
import { Product as ApiProduct } from '@/lib/types/api';
import { UIProduct } from '@/lib/types/ui';
import { buildCategoryNameCandidates } from '@/lib/utils/category';
import { formatWeight, mapApiProductToProduct } from '@/lib/utils/products';
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

function buildProductSizeLabel(product: UIProduct): string | null {
  const sizeLabel = formatWeight(product.weight, product.weightUnit).trim();
  if (sizeLabel) return sizeLabel;
  return null;
}

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
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

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

  const brandOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.brand?.trim())
            .filter((brand): brand is string => Boolean(brand))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [products]
  );
  const sizeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map(buildProductSizeLabel)
            .filter((sizeLabel): sizeLabel is string => Boolean(sizeLabel))
        )
      ),
    [products]
  );
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        if (selectedBrand && product.brand?.trim() !== selectedBrand) return false;

        const sizeLabel = buildProductSizeLabel(product);
        if (selectedSize && sizeLabel !== selectedSize) return false;

        return true;
      }),
    [products, selectedBrand, selectedSize]
  );
  const activeFilterCount = Number(Boolean(selectedBrand)) + Number(Boolean(selectedSize));

  function toggleBrandFilter(brand: string) {
    setSelectedBrand((currentBrand) => (currentBrand === brand ? null : brand));
  }

  function toggleSizeFilter(size: string) {
    setSelectedSize((currentSize) => (currentSize === size ? null : size));
  }

  function clearFilters() {
    setSelectedBrand(null);
    setSelectedSize(null);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={1}>
          {subcategoryTitle}
        </ThemedText>
        <TouchableOpacity
          onPress={() => setIsFilterPanelVisible((currentValue) => !currentValue)}
          style={styles.filterButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Toggle size and brand filters"
        >
          <Ionicons name="options-outline" size={20} color="#111827" />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {isFilterPanelVisible ? (
        <View style={styles.filterPanel}>
          <View style={styles.filterPanelHeader}>
            <ThemedText style={styles.filterPanelTitle}>Filter by size and brand</ThemedText>
            {activeFilterCount > 0 ? (
              <TouchableOpacity
                onPress={clearFilters}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
              >
                <ThemedText style={styles.clearButtonText}>Clear</ThemedText>
              </TouchableOpacity>
            ) : null}
          </View>

          {brandOptions.length > 0 ? (
            <View style={styles.filterGroup}>
              <ThemedText style={styles.filterGroupLabel}>Brand</ThemedText>
              <View style={styles.filterChipRow}>
                {brandOptions.map((brand) => {
                  const isSelected = selectedBrand === brand;

                  return (
                    <TouchableOpacity
                      key={brand}
                      onPress={() => toggleBrandFilter(brand)}
                      style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by brand ${brand}`}
                    >
                      <ThemedText
                        style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}
                      >
                        {brand}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {sizeOptions.length > 0 ? (
            <View style={styles.filterGroup}>
              <ThemedText style={styles.filterGroupLabel}>Size</ThemedText>
              <View style={styles.filterChipRow}>
                {sizeOptions.map((sizeLabel) => {
                  const isSelected = selectedSize === sizeLabel;

                  return (
                    <TouchableOpacity
                      key={sizeLabel}
                      onPress={() => toggleSizeFilter(sizeLabel)}
                      style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by size ${sizeLabel}`}
                    >
                      <ThemedText
                        style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}
                      >
                        {sizeLabel}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

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
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard product={item} onPress={setSelectedProduct} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                {activeFilterCount > 0
                  ? 'No products match the selected filters.'
                  : 'No products found in this subcategory.'}
              </ThemedText>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  filterPanel: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterPanelTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  filterGroup: {
    gap: 8,
  },
  filterGroupLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipSelected: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  filterChipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
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
