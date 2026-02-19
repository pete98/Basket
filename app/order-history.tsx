import { useAuthGuard } from '@/hooks/use-auth-guard';
import { getUserOrders } from '@/lib/api/orders';
import { getUserByAuth0 } from '@/lib/api/users';
import { type PaymentCollectionStatus, type StoreOrderSummary, type StoreReviewStatus } from '@/lib/types/orders';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

function formatPickupWindow(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()))
    return `${start} - ${end}`;

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

function formatStoreReviewStatus(status?: StoreReviewStatus): string {
  if (!status) return 'unknown';
  return status.replace(/_/g, ' ').toLowerCase();
}

function formatPaymentCollectionStatus(status?: PaymentCollectionStatus): string {
  if (!status) return 'unknown';
  return status.replace(/_/g, ' ').toLowerCase();
}

function canTrackDelivery(order: StoreOrderSummary): boolean {
  return (
    order.fulfillmentType === 'DELIVERY' &&
    typeof order.deliveryTrackingUrl === 'string' &&
    order.deliveryTrackingUrl.trim().length > 0
  );
}

export default function OrderHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn, openLogin } = useAuthGuard();
  const { getCredentials } = useAuth0();
  const [orders, setOrders] = useState<StoreOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);
  const [resolvedAccessToken, setResolvedAccessToken] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isLoggedIn) {
      setOrders([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }
    if (!resolvedUserId || !resolvedAccessToken) {
      setOrders([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setLoadError(null);

    getUserOrders({ userId: resolvedUserId, accessToken: resolvedAccessToken })
      .then((data) => {
        if (!isActive) return;
        setOrders(data);
      })
      .catch((error) => {
        if (!isActive) return;
        setOrders([]);
        setLoadError(error instanceof Error ? error.message : 'Unable to load order history.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isLoggedIn, resolvedAccessToken, resolvedUserId]);

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
              {isLoading ? 'Loading orders...' : 'Track your store approval and payment capture'}
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
                <Text style={styles.orderMeta}>
                  Store review: {formatStoreReviewStatus(item.storeReviewStatus)}
                </Text>
                <Text style={styles.orderMeta}>
                  Payment: {formatPaymentCollectionStatus(item.paymentCollectionStatus)}
                </Text>
                {(item.pendingSubstitutionCount ?? 0) > 0 && (
                  <Text style={styles.pendingSubstitutions}>
                    Waiting on your substitution decision ({item.pendingSubstitutionCount})
                  </Text>
                )}
                {canTrackDelivery(item) ? (
                  <Pressable
                    style={styles.trackButton}
                    onPress={() => handleTrackDelivery(item.deliveryTrackingUrl!.trim())}
                  >
                    <Text style={styles.trackButtonText}>Track Delivery</Text>
                  </Pressable>
                ) : null}
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
    marginBottom: 8,
  },
  orderMeta: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  pendingSubstitutions: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 6,
    marginBottom: 8,
  },
  trackButton: {
    marginTop: 6,
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
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111322',
    marginTop: 6,
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
