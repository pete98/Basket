import { useAuthGuard } from '@/hooks/use-auth-guard';
import { getUserOrders } from '@/lib/api/orders';
import { ORDER_EVENTS, orderBus } from '@/lib/order-bus';
import { getUserByAuth0 } from '@/lib/api/users';
import { type StoreOrderSummary, ORDER_STATUSES } from '@/lib/types/orders';
import { useRouter } from 'expo-router';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCESS_TOKEN_KEY = 'auth0_access_token';
const ORDERS_POLLING_INTERVAL_MS = 30_000;

function formatOrderStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase();
}

const FINISHED_ORDER_STATUSES = new Set([
  ORDER_STATUSES.pickedUp,
  'DELIVERED',
]);

function isFinishedOrder(status: string, deliveryStatus?: string | null): boolean {
  const normalizedStatus = status.toUpperCase().trim().replace(/[^A-Z]/g, '_');
  const normalizedDeliveryStatus = (deliveryStatus ?? '').toUpperCase().trim().replace(/[^A-Z]/g, '_');
  return FINISHED_ORDER_STATUSES.has(normalizedStatus) || FINISHED_ORDER_STATUSES.has(normalizedDeliveryStatus);
}

function formatPickupDate(start: string): string {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.valueOf())) return start;

  return startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function mergeOrderStatuses(
  currentOrders: StoreOrderSummary[],
  incomingOrders: StoreOrderSummary[]
): StoreOrderSummary[] {
  if (currentOrders.length === 0) return incomingOrders;

  const incomingById = new Map(incomingOrders.map((order) => [order.orderId, order]));
  const seenIds = new Set<string>();

  const updatedCurrent = currentOrders.map((order) => {
    const incoming = incomingById.get(order.orderId);
    if (!incoming) return order;
    seenIds.add(order.orderId);

    const hasStatusChanged =
      order.status !== incoming.status ||
      order.deliveryStatus !== incoming.deliveryStatus ||
      order.pendingSubstitutionCount !== incoming.pendingSubstitutionCount ||
      order.deliveryTrackingUrl !== incoming.deliveryTrackingUrl;

    if (!hasStatusChanged) return order;

    return {
      ...order,
      status: incoming.status,
      deliveryStatus: incoming.deliveryStatus,
      pendingSubstitutionCount: incoming.pendingSubstitutionCount,
      deliveryTrackingUrl: incoming.deliveryTrackingUrl,
    };
  });

  const newOrders = incomingOrders.filter((order) => !seenIds.has(order.orderId));
  if (newOrders.length === 0) return updatedCurrent;
  return [...newOrders, ...updatedCurrent];
}

export default function OrderHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoggedIn, openLogin } = useAuthGuard();
  const isFocused = useIsFocused();
  const { getCredentials } = useAuth0();
  const [orders, setOrders] = useState<StoreOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);
  const [resolvedAccessToken, setResolvedAccessToken] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

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
      setResolvedUserId(null);
      setResolvedAccessToken(null);
      return;
    }

    let isActive = true;
    getAccessToken()
      .then(async (accessToken) => {
        if (!accessToken) return null;
        const profile = await getUserByAuth0(accessToken);
        const rawUserId = (profile as { id?: number | string }).id;
        if (!rawUserId) return null;
        const userId = Number(rawUserId);
        if (Number.isNaN(userId)) return null;
        return { userId, accessToken };
      })
      .then((resolvedIdentity) => {
        if (!isActive) return;
        setResolvedUserId(resolvedIdentity?.userId ?? null);
        setResolvedAccessToken(resolvedIdentity?.accessToken ?? null);
      })
      .catch(() => {
        if (!isActive) return;
        setResolvedUserId(null);
        setResolvedAccessToken(null);
      });

    return () => {
      isActive = false;
    };
  }, [getAccessToken, isLoggedIn]);

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;
    if (isFetchingRef.current) return;

    if (!isLoggedIn || !resolvedUserId || !resolvedAccessToken) {
      setOrders([]);
      setLoadError(null);
      setIsLoading(false);
      hasLoadedOnceRef.current = false;
      return;
    }

    isFetchingRef.current = true;
    if (!isSilent && !hasLoadedOnceRef.current) setIsLoading(true);
    if (!isSilent) setLoadError(null);

    try {
      const data = await getUserOrders({ userId: resolvedUserId, accessToken: resolvedAccessToken });
      setOrders((currentOrders) => (isSilent ? mergeOrderStatuses(currentOrders, data) : data));
      setLoadError(null);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      if (!isSilent) {
        setOrders([]);
        setLoadError(error instanceof Error ? error.message : 'Unable to load order history.');
      }
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) setIsLoading(false);
    }
  }, [isLoggedIn, resolvedAccessToken, resolvedUserId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useFocusEffect(
    useCallback(() => {
      void loadOrders({ silent: true });
    }, [loadOrders])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (!isFocused) return;
      void loadOrders({ silent: true });
    });

    return () => {
      subscription.remove();
    };
  }, [isFocused, loadOrders]);

  useEffect(() => {
    const unsubscribe = orderBus.on(ORDER_EVENTS.OrderPlaced, () => {
      void loadOrders({ silent: true });
    });

    return () => {
      unsubscribe();
    };
  }, [loadOrders]);

  useEffect(() => {
    if (!isFocused) return;
    if (!isLoggedIn || !resolvedUserId || !resolvedAccessToken) return;

    const pollingId = setInterval(() => {
      void loadOrders({ silent: true });
    }, ORDERS_POLLING_INTERVAL_MS);

    return () => {
      clearInterval(pollingId);
    };
  }, [isFocused, isLoggedIn, loadOrders, resolvedAccessToken, resolvedUserId]);

  async function handleTrackDelivery(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setLoadError('Unable to open tracking link right now.');
    }
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={[styles.pageHeaderBackground, { paddingTop: insets.top + 8 }]}>
          <View style={styles.pageHeaderContent}>
            <View>
              <Text style={styles.pageHeaderTitle}>Order History</Text>
              <Text style={styles.pageHeaderSubtitle}>Log in to view past orders</Text>
            </View>
          </View>
        </View>
        <View style={styles.gateCard}>
          <Text style={styles.gateTitle}>Your orders live here</Text>
          <Text style={styles.gateSubtitle}>Log in to track past orders and reorder quickly.</Text>
          <Pressable
            style={styles.gateButton}
            onPress={() => openLogin({ pathname: '/order-history' })}
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
            <Text style={styles.pageHeaderTitle}>Order History</Text>
            <Text style={styles.pageHeaderSubtitle}>
              {isLoading ? 'Loading orders...' : 'Track your past orders'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.content}>
        {isLoading && <ActivityIndicator size="small" color="#111827" />}
        {!isLoading && loadError && <Text style={styles.helperText}>{loadError}</Text>}
        {!isLoading && !loadError && orders.length === 0 && (
          <Text style={styles.helperText}>No orders yet</Text>
        )}
        {!isLoading && orders.length > 0 && (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.orderId}
            contentContainerStyle={styles.orderList}
            renderItem={({ item }) => {
              const isFinished = isFinishedOrder(item.status, item.deliveryStatus);
              const hasTrackingUrl =
                typeof item.deliveryTrackingUrl === 'string' &&
                item.deliveryTrackingUrl.trim().length > 0;

              return (
                <Pressable
                  style={[styles.orderCard, isFinished && styles.orderCardCompact]}
                  onPress={() => router.push({ pathname: '/order-detail', params: { orderId: item.orderId } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Open details for order ${item.orderId}`}
                >
                  <View style={[styles.orderHeader, isFinished && styles.orderHeaderCompact]}>
                    <Text style={styles.orderId}>Order {item.orderId}</Text>
                    {!isFinished ? (
                      <View style={styles.statusPill}>
                        <Text style={styles.statusText}>{formatOrderStatus(item.status)}</Text>
                      </View>
                    ) : null}
                  </View>
                  {isFinished ? (
                    <View style={styles.finishedHeaderRow}>
                      <Text style={[styles.orderWindow, styles.orderWindowCompact]}>
                        {formatPickupDate(item.pickupWindowStart)}
                      </Text>
                      <Pressable
                        style={styles.reorderButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          router.push('/');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Reorder order ${item.orderId}`}
                      >
                        <Text style={styles.reorderButtonText}>Reorder</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={styles.orderWindow}>{formatPickupDate(item.pickupWindowStart)}</Text>
                  )}
                  {hasTrackingUrl ? (
                    <Pressable
                      style={styles.trackButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        void handleTrackDelivery(item.deliveryTrackingUrl!.trim());
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Track delivery for order ${item.orderId}`}
                    >
                      <Text style={styles.trackButtonText}>Track delivery</Text>
                    </Pressable>
                  ) : null}
                  {(item.pendingSubstitutionCount ?? 0) > 0 && (
                    <Text
                      style={[
                        styles.pendingSubstitutions,
                        isFinished && styles.pendingSubstitutionsCompact,
                      ]}
                    >
                      Waiting on your substitution decision ({item.pendingSubstitutionCount})
                    </Text>
                  )}
                  <Text style={[styles.orderTotal, isFinished && styles.orderTotalCompact]}>
                    ${item.total.toFixed(2)}
                  </Text>
                </Pressable>
              );
            }}
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
  orderCardCompact: {
    padding: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  orderHeaderCompact: {
    marginBottom: 3,
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
  finishedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  reorderButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignSelf: 'flex-end',
  },
  reorderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  orderWindow: {
    fontSize: 13,
    color: '#475467',
    marginBottom: 4,
  },
  orderWindowCompact: {
    marginBottom: 3,
  },
  pendingSubstitutions: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 6,
    marginBottom: 8,
  },
  trackButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  pendingSubstitutionsCompact: {
    marginTop: 4,
    marginBottom: 6,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111322',
    marginTop: 3,
  },
  orderTotalCompact: {
    marginTop: 2,
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
