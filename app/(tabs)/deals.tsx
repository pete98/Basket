import { useLocation } from '@/contexts/location-context';
import { getStoreOrders } from '@/lib/api/orders';
import { getActiveStore, getUserByAuth0 } from '@/lib/api/users';
import { type StoreOrderSummary } from '@/lib/types/orders';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

function parseStoreId(locationId: string): number | null {
  if (!locationId.startsWith('store-')) return null;
  const rawId = locationId.replace('store-', '');
  const storeId = Number.parseInt(rawId, 10);
  if (Number.isNaN(storeId)) return null;
  return storeId;
}

function getActiveStoreId(activeStore: unknown): number | null {
  if (!activeStore || typeof activeStore !== 'object') return null;
  const store = activeStore as { storeId?: number; id?: number };
  if (typeof store.storeId === 'number') return store.storeId;
  if (typeof store.id === 'number') return store.id;
  return null;
}

function formatPickupWindow(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
    return `${start} - ${end}`;
  }

  const dateLabel = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const startTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${dateLabel} · ${startTime} - ${endTime}`;
}

function formatOrderStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase();
}

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn, openLogin } = useAuthGuard();
  const { selectedLocation } = useLocation();
  const { getCredentials } = useAuth0();
  const [orders, setOrders] = useState<StoreOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
  const storeId = activeStoreId ?? parseStoreId(selectedLocation.id);

  async function getAccessToken() {
    let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (accessToken) return accessToken;
    const credentials = await getCredentials();
    accessToken = credentials?.accessToken ?? null;
    if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    return accessToken;
  }

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
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setOrders([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }
    if (!storeId) {
      setOrders([]);
      setLoadError('Select a store to view deals.');
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setLoadError(null);

    getStoreOrders({ storeId })
      .then((data) => {
        if (!isActive) return;
        setOrders(data);
      })
      .catch((error) => {
        if (!isActive) return;
        setOrders([]);
        setLoadError(error instanceof Error ? error.message : 'Unable to load deals.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isLoggedIn, storeId]);

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
        <View style={styles.gateCard}>
          <Text style={styles.gateTitle}>Your deals live here</Text>
          <Text style={styles.gateSubtitle}>
            Log in to browse store-specific deals and active offers.
          </Text>
          <Pressable
            style={styles.gateButton}
            onPress={() => openLogin({ pathname: '/deals' })}
          >
            <Text style={styles.gateButtonText}>Log in</Text>
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
              {isLoading ? 'Loading deals...' : 'Store-specific offers'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.content}>
        {isLoading && <ActivityIndicator size="small" color="#111827" />}
        {!isLoading && loadError && <Text style={styles.helperText}>{loadError}</Text>}
        {!isLoading && !loadError && orders.length === 0 && (
          <Text style={styles.helperText}>No deals yet</Text>
        )}
        {!isLoading && orders.length > 0 && (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.orderId}
            contentContainerStyle={styles.orderList}
            renderItem={({ item }) => (
              <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order {item.orderId}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>{formatOrderStatus(item.status)}</Text>
                  </View>
                </View>
                <Text style={styles.orderWindow}>
                  {formatPickupWindow(item.pickupWindowStart, item.pickupWindowEnd)}
                </Text>
                <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  helperText: {
    fontSize: 14,
    color: '#667085',
    marginTop: 12,
  },
  orderList: {
    paddingBottom: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111322',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  orderWindow: {
    fontSize: 13,
    color: '#475467',
    marginBottom: 10,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111322',
  },
  gateCard: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  gateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  gateSubtitle: {
    fontSize: 14,
    color: '#667085',
    marginTop: 8,
    lineHeight: 20,
  },
  gateButton: {
    marginTop: 16,
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  gateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
