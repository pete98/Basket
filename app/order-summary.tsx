import { useCart } from '@/contexts/cart-context';
import { useLocation } from '@/contexts/location-context';
import { confirmPayment, createOrder } from '@/lib/api/orders';
import { createPaymentIntent } from '@/lib/api/payments';
import { isStripeConfigured, stripeConfig } from '@/lib/config/stripe';
import { getStoreById } from '@/lib/api/stores';
import { getActiveStore, getUserByAuth0 } from '@/lib/api/users';
import type { CreateOrderRequest, Order } from '@/lib/types/orders';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Store } from '@/lib/types/api';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type DetailVisual = {
  icon: IoniconName;
  color: string;
  background: string;
};

interface UserProfile {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

const DETAIL_VISUALS = {
  when: { icon: 'time-outline', color: '#D97706', background: '#FFF7ED' },
  items: { icon: 'receipt-outline', color: '#0EA5E9', background: '#ECF8FF' },
  pickupLocation: { icon: 'storefront-outline', color: '#047857', background: '#ECFDF5' },
  deliveryLocation: { icon: 'navigate-circle-outline', color: '#9333EA', background: '#F5F3FF' },
  recipient: { icon: 'person-circle-outline', color: '#1F2937', background: '#E5E7EB' },
  instruction: { icon: 'location-outline', color: '#1F2937', background: '#E5E7EB' },
} satisfies Record<
  'when' | 'items' | 'pickupLocation' | 'deliveryLocation' | 'recipient' | 'instruction',
  DetailVisual
>;

const ACCESS_TOKEN_KEY = 'auth0_access_token';

function parseStoreId(locationId: string): number | null {
  if (!locationId.startsWith('store-')) return null;
  const rawId = locationId.replace('store-', '');
  const storeId = Number.parseInt(rawId, 10);
  if (Number.isNaN(storeId)) return null;
  return storeId;
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

function formatStoreAddress(store: Store): string {
  const streetLine = store.street2 ? `${store.street}, ${store.street2}` : store.street;
  return `${streetLine}, ${store.city}, ${store.state} ${store.zip}`;
}

function getResolvedUserId(profile: UserProfile | null): number | null {
  if (!profile?.id) return null;
  const userId = Number(profile.id);
  if (Number.isNaN(userId)) return null;
  return userId;
}

function getActiveStoreId(activeStore: unknown): number | null {
  if (!activeStore || typeof activeStore !== 'object') return null;
  const store = activeStore as { storeId?: number; id?: number };
  if (typeof store.storeId === 'number') return store.storeId;
  if (typeof store.id === 'number') return store.id;
  return null;
}

function getRecipientName(profile: UserProfile | null, fallback: string): string {
  if (!profile) return fallback;
  const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  return fallback;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function buildStripeReturnUrl(urlScheme: string): string | null {
  if (!urlScheme) return null;
  return `${urlScheme}://stripe-redirect`;
}

function resolvePaymentIntentId(
  paymentIntentId: string | undefined,
  clientSecret: string
): string | null {
  if (paymentIntentId) return paymentIntentId;
  const secretPrefix = clientSecret.split('_secret_')[0];
  if (!secretPrefix) return null;
  return secretPrefix;
}

export default function OrderSummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state, clearCart } = useCart();
  const { selectedLocation } = useLocation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, total } = state;
  const { ensureAuthenticated } = useAuthGuard();
  const { getCredentials, user } = useAuth0();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);
  const [draftOrder, setDraftOrder] = useState<Order | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [storeProfile, setStoreProfile] = useState<Store | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
  const storeId = activeStoreId ?? parseStoreId(selectedLocation.id);
  const orderItemKey = items.map((item) => `${item.id}:${item.quantity}`).join('|');
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const stripeReturnUrl = buildStripeReturnUrl(stripeConfig.urlScheme);
  const isStripeReady = isStripeConfigured;

  useEffect(() => {
    if (items.length > 0 && !user) {
      ensureAuthenticated({ pathname: '/order-summary' });
    }
  }, [ensureAuthenticated, items.length, user]);

  // Get delivery details from params or use defaults
  const fulfillmentTypeParam = params.fulfillmentType as string;
  const fulfillmentType: 'delivery' | 'pickup' =
    fulfillmentTypeParam === 'delivery' ? 'delivery' : 'pickup';
  const isPickup = fulfillmentType === 'pickup';
  const pickupEta =
    (params.pickupEta as string) ??
    'Ready within about 10 minutes once the store confirms your order.';
  const pickupLocation = storeProfile ? formatStoreAddress(storeProfile) : 'Select a store';
  const pickupLocationName = storeProfile?.displayName ?? 'Store not selected';
  const selectedDate = params.date as string;
  const timeSlotStart = params.timeSlotStart as string;
  const timeSlotEnd = params.timeSlotEnd as string;
  const timeSlotTz = params.timeSlotTz as string;
  const pickupWindowStart = params.pickupWindowStart as string;
  const pickupWindowEnd = params.pickupWindowEnd as string;
  const deliveryFeeParam = params.deliveryFee as string;
  
  // Format delivery date
  function getDeliveryDate() {
    if (selectedDate === 'today') return 'Today';
    if (selectedDate?.startsWith('day-')) {
      const dayNum = Number.parseInt(selectedDate.split('-')[1], 10) || 1;
      const date = new Date();
      date.setDate(date.getDate() + dayNum);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const day = date.getDate();
      return `${dayName}, ${month} ${day}`;
    }
    return 'Tomorrow, November 9';
  }
  
  const deliveryDate = getDeliveryDate();
  const deliveryTime = timeSlotStart && timeSlotEnd && timeSlotTz 
    ? `${timeSlotStart} - ${timeSlotEnd} ${timeSlotTz}`
    : '4:00 - 5:00 AM CST';
  const fallbackPickupWindow =
    pickupWindowStart && pickupWindowEnd
      ? formatPickupWindow(pickupWindowStart, pickupWindowEnd)
      : pickupEta;
  const fulfillmentTiming = isPickup
    ? draftOrder
      ? formatPickupWindow(draftOrder.pickupWindowStart, draftOrder.pickupWindowEnd)
      : fallbackPickupWindow
    : `${deliveryDate}, ${deliveryTime}`;
  const deliveryAddress = params.deliveryAddress as string;
  const fallbackRecipientName = user?.name ?? user?.email ?? 'Guest';
  const recipientName = getRecipientName(userProfile, fallbackRecipientName);
  const recipientPhone = userProfile?.phone ?? user?.phoneNumber ?? 'Add phone number';
  const whenVisual = DETAIL_VISUALS.when;
  const itemsVisual = DETAIL_VISUALS.items;
  const locationVisual = isPickup ? DETAIL_VISUALS.pickupLocation : DETAIL_VISUALS.deliveryLocation;
  const recipientVisual = DETAIL_VISUALS.recipient;
  const instructionVisual = DETAIL_VISUALS.instruction;

  // Calculate totals
  const deliveryFee = isPickup
    ? 0
    : deliveryFeeParam
    ? parseFloat(deliveryFeeParam)
    : 6.95;
  const feeLabel = isPickup ? 'Pickup Fee' : 'Delivery Fee';
  const subtotal = draftOrder?.subtotal ?? total;
  const tax = draftOrder?.tax ?? 0;
  const estimatedTotal = draftOrder?.total ?? subtotal + deliveryFee + tax;
  const placeOrderDisabled =
    isPlacingOrder ||
    items.length === 0 ||
    !storeId ||
    !isPickup ||
    isPreviewLoading ||
    !isStripeReady;

  async function getAccessToken() {
    let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (accessToken) return accessToken;
    const credentials = await getCredentials();
    accessToken = credentials?.accessToken ?? null;
    if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    return accessToken;
  }

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setActiveStoreId(null);
      return;
    }

    let isActive = true;
    getAccessToken()
      .then(async (accessToken) => {
        if (!accessToken) return null;
        const profile = (await getUserByAuth0(accessToken)) as UserProfile;
        if (!profile?.id) return null;
        const activeStore = await getActiveStore(profile.id, accessToken);
        return { profile, activeStore };
      })
      .then((data) => {
        if (!isActive) return;
        if (!data) return;
        setUserProfile(data.profile);
        setActiveStoreId(getActiveStoreId(data.activeStore));
      })
      .catch(() => {
        if (!isActive) return;
        setUserProfile(null);
        setActiveStoreId(null);
      });

    return () => {
      isActive = false;
    };
  }, [user?.sub]);

  useEffect(() => {
    setDraftOrder(null);
    setPreviewError(null);
  }, [orderItemKey, storeId, pickupWindowStart, pickupWindowEnd]);

  useEffect(() => {
    if (!storeId) {
      setStoreProfile(null);
      return;
    }

    let isActive = true;
    getStoreById({ storeId })
      .then((store) => {
        if (!isActive) return;
        setStoreProfile(store);
      })
      .catch(() => {
        if (!isActive) return;
        setStoreProfile(null);
      });

    return () => {
      isActive = false;
    };
  }, [storeId]);

  useEffect(() => {
    if (!isPickup) return;
    if (!storeId) return;
    if (!orderItemKey) return;

    const userId = getResolvedUserId(userProfile);
    if (!userId) return;

    let isActive = true;
    setIsPreviewLoading(true);
    setPreviewError(null);

    const orderItems = items.map((item) => ({
      productId: Number.parseInt(item.id, 10),
      quantity: item.quantity,
    }));

    const hasInvalidItems = orderItems.some((item) => Number.isNaN(item.productId));
    if (hasInvalidItems) {
      setPreviewError('Missing product details for cart items.');
      setIsPreviewLoading(false);
      return () => {
        isActive = false;
      };
    }

    const payload: CreateOrderRequest = {
      userId,
      storeId,
      items: orderItems,
    };
    if (pickupWindowStart) payload.pickupWindowStart = pickupWindowStart;
    if (pickupWindowEnd) payload.pickupWindowEnd = pickupWindowEnd;
    if (params.notes) payload.notes = params.notes as string;

    createOrder({ payload })
      .then((order) => {
        if (!isActive) return;
        setDraftOrder(order);
      })
      .catch((error) => {
        if (!isActive) return;
        setPreviewError(error instanceof Error ? error.message : 'Unable to load order totals.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsPreviewLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isPickup, items, orderItemKey, params.notes, pickupWindowEnd, pickupWindowStart, storeId, userProfile]);

  const handlePlaceOrder = async () => {
    if (!ensureAuthenticated()) return;
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    setPlaceOrderError(null);

    try {
      if (!isPickup) {
        setPlaceOrderError('Pickup orders only. Switch to pickup to continue.');
        return;
      }

      if (!storeId) {
        setPlaceOrderError('Select a store to continue.');
        return;
      }

      if (items.length === 0) {
        setPlaceOrderError('Your cart is empty.');
        return;
      }

      if (!isStripeReady) {
        setPlaceOrderError('Payments are not configured yet.');
        return;
      }

      let accessToken = await getAccessToken();

      if (!accessToken) {
        setPlaceOrderError('Missing access token. Please log in again.');
        return;
      }

      let userId = getResolvedUserId(userProfile);
      if (!userId) {
        const userRecord = await getUserByAuth0(accessToken);
        const rawUserId = (userRecord as { id?: number | string }).id;
        userId = rawUserId ? Number(rawUserId) : Number.NaN;
      }
      if (!userId || Number.isNaN(userId)) {
        setPlaceOrderError('Unable to identify user profile.');
        return;
      }

      const orderItems = items.map((item) => ({
        productId: Number.parseInt(item.id, 10),
        quantity: item.quantity,
      }));

      if (orderItems.some((item) => Number.isNaN(item.productId))) {
        setPlaceOrderError('Missing product details for cart items.');
        return;
      }

      const payload: CreateOrderRequest = {
        userId,
        storeId,
        items: orderItems,
      };
      if (pickupWindowStart) payload.pickupWindowStart = pickupWindowStart;
      if (pickupWindowEnd) payload.pickupWindowEnd = pickupWindowEnd;
      if (params.notes) payload.notes = params.notes as string;

      const order = draftOrder ?? (await createOrder({ payload }));
      const paymentIntentData = await createPaymentIntent({
        payload: {
          orderId: order.orderId,
        },
      });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: storeProfile?.displayName ?? 'Basket',
        paymentIntentClientSecret: paymentIntentData.clientSecret,
        returnURL: stripeReturnUrl ?? undefined,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          email: userProfile?.email ?? user?.email ?? undefined,
          name: recipientName,
          phone: userProfile?.phone ?? user?.phoneNumber ?? undefined,
        },
      });

      if (initError) {
        setPlaceOrderError(initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        setPlaceOrderError(presentError.message);
        return;
      }

      const paymentIntentId = resolvePaymentIntentId(
        paymentIntentData.paymentIntentId,
        paymentIntentData.clientSecret
      );
      if (!paymentIntentId) {
        setPlaceOrderError('Missing payment intent details. Please try again.');
        return;
      }

      await confirmPayment({
        orderId: order.orderId,
        payload: {
          paymentIntentId,
          status: 'SUCCEEDED',
          paidAt: new Date().toISOString(),
        },
      });

      clearCart();
      router.replace('/orders');
    } catch (error) {
      setPlaceOrderError(error instanceof Error ? error.message : 'Unable to place order.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <View
        style={[
          styles.pageHeaderBackground,
          { paddingTop: insets.top + 8, marginTop: -insets.top },
        ]}
      >
        <View style={styles.pageHeaderContent}>
          <View style={styles.pageHeaderLeading}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.pageHeaderTitle}>Order Summary</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isPickup ? 'Pickup Details' : 'Delivery Details'}
          </Text>
          
          <View style={styles.detailRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: whenVisual.background },
              ]}
            >
              <Ionicons name={whenVisual.icon} size={18} color={whenVisual.color} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>When</Text>
              <Text style={styles.detailText}>{fulfillmentTiming}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: itemsVisual.background },
              ]}
            >
              <Ionicons name={itemsVisual.icon} size={18} color={itemsVisual.color} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Items</Text>
              <Text style={styles.detailText}>{itemCount} items</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: locationVisual.background },
              ]}
            >
              <Ionicons
                name={locationVisual.icon}
                size={18}
                color={locationVisual.color}
              />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{isPickup ? 'Pickup Location' : 'Delivery Address'}</Text>
              <Text style={styles.detailText}>
                {isPickup ? pickupLocationName ?? 'Select a store' : deliveryAddress}
              </Text>
              {isPickup && (
                <Text style={styles.detailSubtext}>{pickupLocation ?? 'Add a pickup store'}</Text>
              )}
            </View>
          </View>

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: recipientVisual.background },
              ]}
            >
              <Ionicons
                name={recipientVisual.icon}
                size={18}
                color={recipientVisual.color}
              />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Recipient</Text>
              <Text style={styles.detailText}>{recipientName}</Text>
              <Text style={styles.detailSubtext}>{recipientPhone}</Text>
            </View>
          </View>
        </View>

        {/* Fulfillment Instructions */}
        {!isPickup ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Instructions</Text>
            
          <View style={styles.instructionItem}>
            <View
              style={[
                styles.instructionIconWrapper,
                { backgroundColor: instructionVisual.background },
              ]}
            >
              <Ionicons
                name={instructionVisual.icon}
                size={18}
                color={instructionVisual.color}
              />
            </View>
            <Text style={styles.instructionText}>Meet me at my door</Text>
          </View>
            
            <TouchableOpacity style={styles.addNoteButton}>
              <Text style={styles.addNoteText}>Add a note for your driver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pickup Instructions</Text>
            <Text style={styles.instructionText}>
              Head to the pickup counter once you get the ready notification and have your confirmation and ID handy.
            </Text>
          </View>
        )}

        {/* Payment Summary Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          {isPreviewLoading && (
            <Text style={styles.summaryHelperText}>Calculating pickup totals...</Text>
          )}
          {!isPreviewLoading && previewError && (
            <Text style={styles.summaryHelperText}>{previewError}</Text>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{feeLabel}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(deliveryFee)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
          </View>
        </View>

        {/* Estimated Total */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimatedTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        {placeOrderError && <Text style={styles.placeOrderError}>{placeOrderError}</Text>}
        {!isStripeReady && (
          <Text style={styles.placeOrderError}>Payments are not configured yet.</Text>
        )}
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            placeOrderDisabled && styles.placeOrderButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          activeOpacity={0.85}
          disabled={placeOrderDisabled}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderButtonText}>
              {isPickup ? 'Place Pickup Order' : 'Place Delivery Order'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeaderBackground: {
    backgroundColor: '#f97316',
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
    marginBottom: 16,
    marginTop: 0,
  },
  pageHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  pageHeaderLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111322',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#667085',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 15,
    color: '#111322',
    fontWeight: '600',
  },
  detailSubtext: {
    fontSize: 14,
    color: '#667085',
    marginTop: 2,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 15,
    color: '#111322',
    marginLeft: 12,
    fontWeight: '500',
  },
  addNoteButton: {
    marginTop: 8,
  },
  addNoteText: {
    fontSize: 15,
    color: '#111322',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryHelperText: {
    fontSize: 13,
    color: '#667085',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#667085',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#111322',
    fontWeight: '600',
  },
  totalCard: {
    backgroundColor: '#111322',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
  },
  placeOrderError: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 10,
  },
  placeOrderButton: {
    backgroundColor: '#111322',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
