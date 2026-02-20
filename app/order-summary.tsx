import { useCart } from '@/contexts/cart-context';
import { useCheckout } from '@/contexts/checkout-context';
import { useLocation } from '@/contexts/location-context';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { createDeliveryQuote, createOrder } from '@/lib/api/orders';
import { createPaymentIntent } from '@/lib/api/payments';
import { getStoreById } from '@/lib/api/stores';
import { getActiveStore, getUserByAuth0, type UserProfileResponse } from '@/lib/api/users';
import { isStripeConfigured, stripeConfig } from '@/lib/config/stripe';
import type { CreateOrderRequest, DeliveryAddress, DeliveryContact, Order } from '@/lib/types/orders';
import type { Store } from '@/lib/types/api';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type DetailVisual = {
  icon: IoniconName;
  color: string;
  background: string;
};

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

interface PickupWindowRange {
  start: string;
  end: string;
}

function parseStoreId(locationId: string): number | null {
  if (!locationId.startsWith('store-')) return null;
  const rawId = locationId.replace('store-', '');
  const storeId = Number.parseInt(rawId, 10);
  if (Number.isNaN(storeId)) return null;
  return storeId;
}

function getActiveStoreId(activeStore: unknown): number | null {
  if (!activeStore || typeof activeStore !== 'object') return null;
  const store = activeStore as { storeId?: number | string; id?: number | string };
  if (typeof store.storeId === 'number') return store.storeId;
  if (typeof store.storeId === 'string') {
    const parsed = Number.parseInt(store.storeId, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (typeof store.id === 'number') return store.id;
  if (typeof store.id === 'string') {
    const parsed = Number.parseInt(store.id, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function getResolvedUserId(profile: UserProfileResponse | null): number | null {
  if (!profile?.id) return null;
  const userId = Number(profile.id);
  if (Number.isNaN(userId)) return null;
  return userId;
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

function formatAddress(address: DeliveryAddress | null): string {
  if (!address) return 'Add a delivery address in the previous step.';
  const segments = [
    address.street1,
    address.street2,
    address.city,
    address.state,
    address.zip,
    address.country,
  ].filter((part) => Boolean(part && part.trim()));
  return segments.join(', ');
}

function getRecipientName(profile: UserProfileResponse | null, fallback: string): string {
  if (!profile) return fallback;
  const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  return fallback;
}

function normalizeToE164(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+') && /^\+[0-9]{8,15}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0.00';
  return `$${value.toFixed(2)}`;
}

function toMoney(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return Number(parsed.toFixed(2));
  }
  return 0;
}

function buildStripeReturnUrl(urlScheme: string): string | null {
  if (!urlScheme) return null;
  return `${urlScheme}://stripe-redirect`;
}

function buildResolvedPickupWindow(
  pickupWindowStart?: string,
  pickupWindowEnd?: string
): PickupWindowRange {
  if (pickupWindowStart && pickupWindowEnd) {
    return { start: pickupWindowStart, end: pickupWindowEnd };
  }

  const now = new Date();
  const fallbackStart = new Date(now.getTime() + 5 * 60 * 1000);
  const fallbackEnd = new Date(fallbackStart.getTime() + 15 * 60 * 1000);

  return {
    start: pickupWindowStart || fallbackStart.toISOString(),
    end: pickupWindowEnd || fallbackEnd.toISOString(),
  };
}

function isQuoteExpiringSoon(expiresAt: string | undefined, thresholdSeconds = 60): boolean {
  if (!expiresAt) return true;
  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) return true;
  return parsed - Date.now() <= thresholdSeconds * 1000;
}

function buildOrderPayload(params: {
  userId: number;
  storeId: number;
  items: { productId: number; quantity: number }[];
  pickupWindow: PickupWindowRange;
  isPickup: boolean;
  notes?: string;
  deliveryAddress: DeliveryAddress | null;
  deliveryContact: DeliveryContact | null;
  quote: { quoteId: string; estimatedFee: number; expiresAt: string } | null;
}): CreateOrderRequest {
  const {
    userId,
    storeId,
    items,
    pickupWindow,
    isPickup,
    notes,
    deliveryAddress,
    deliveryContact,
    quote,
  } = params;

  if (isPickup) {
    return {
      userId,
      storeId,
      items,
      fulfillmentType: 'PICKUP',
      pickupWindowStart: pickupWindow.start,
      pickupWindowEnd: pickupWindow.end,
      ...(notes ? { notes } : {}),
    };
  }

  if (!deliveryAddress) throw new Error('Delivery address is required.');
  if (!deliveryContact?.name || !deliveryContact.phone) {
    throw new Error('Delivery contact is required.');
  }
  if (!quote?.quoteId) throw new Error('Delivery quote is missing. Please go back and retry.');
  if (typeof quote.estimatedFee !== 'number') {
    throw new Error('Delivery quote fee is missing. Please go back and retry.');
  }

  const phone = normalizeToE164(deliveryContact.phone);
  if (!phone) throw new Error('Delivery contact phone is invalid.');

  return {
    userId,
    storeId,
    items,
    fulfillmentType: 'DELIVERY',
    deliveryAddress,
    deliveryContact: {
      name: deliveryContact.name,
      phone,
    },
    deliveryQuoteId: quote.quoteId,
    deliveryQuoteFee: quote.estimatedFee,
    deliveryQuoteExpiresAt: quote.expiresAt,
    pickupWindowStart: pickupWindow.start,
    pickupWindowEnd: pickupWindow.end,
    ...(notes ? { notes } : {}),
  };
}

export default function OrderSummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state: cartState, clearCart } = useCart();
  const { selectedLocation } = useLocation();
  const { state: checkoutState, patchCheckout, resetCheckout } = useCheckout();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { ensureAuthenticated } = useAuthGuard();
  const { getCredentials, user } = useAuth0();

  const { items, total } = cartState;
  const fallbackRecipientName = user?.name ?? user?.email ?? 'Guest';
  const userSub = user?.sub;

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isRequoting, setIsRequoting] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);
  const [draftOrder, setDraftOrder] = useState<Order | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [storeProfile, setStoreProfile] = useState<Store | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);

  const storeId = activeStoreId ?? parseStoreId(selectedLocation.id);
  const orderItemKey = items.map((item) => `${item.id}:${item.quantity}`).join('|');
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const stripeReturnUrl = buildStripeReturnUrl(stripeConfig.urlScheme);
  const isStripeReady = isStripeConfigured;
  const fallbackFulfillmentType =
    typeof params.fulfillmentType === 'string' && params.fulfillmentType.toLowerCase() === 'delivery'
      ? 'delivery'
      : 'pickup';
  const effectiveFulfillmentType =
    checkoutState.fulfillmentType === 'delivery' ? 'delivery' : fallbackFulfillmentType;
  const isPickup = effectiveFulfillmentType !== 'delivery';
  const deliveryAddress = checkoutState.deliveryAddress;
  const deliveryContact = checkoutState.deliveryContact;
  const quote = checkoutState.deliveryQuote;
  const fallbackDeliveryFee =
    typeof params.deliveryFee === 'string' ? Number.parseFloat(params.deliveryFee) : Number.NaN;

  const pickupWindow = useMemo(
    () => buildResolvedPickupWindow(checkoutState.pickupWindowStart, checkoutState.pickupWindowEnd),
    [checkoutState.pickupWindowEnd, checkoutState.pickupWindowStart]
  );

  const fulfillmentTiming = isPickup
    ? draftOrder
      ? formatPickupWindow(draftOrder.pickupWindowStart, draftOrder.pickupWindowEnd)
      : checkoutState.pickupEtaMessage || 'Ready shortly after store confirms your order.'
    : quote?.eta || 'Delivery ETA will appear after quote confirmation.';

  const recipientName = isPickup
    ? getRecipientName(userProfile, fallbackRecipientName)
    : deliveryContact?.name || getRecipientName(userProfile, fallbackRecipientName);
  const recipientPhone = isPickup
    ? userProfile?.phone ?? user?.phoneNumber ?? 'Add phone number'
    : deliveryContact?.phone || userProfile?.phone || user?.phoneNumber || 'Add phone number';

  const whenVisual = DETAIL_VISUALS.when;
  const itemsVisual = DETAIL_VISUALS.items;
  const locationVisual = isPickup ? DETAIL_VISUALS.pickupLocation : DETAIL_VISUALS.deliveryLocation;
  const recipientVisual = DETAIL_VISUALS.recipient;
  const instructionVisual = DETAIL_VISUALS.instruction;

  const displayOrder = draftOrder;
  const subtotal = displayOrder ? toMoney(displayOrder.subtotal) : toMoney(total);
  const tax = displayOrder ? toMoney(displayOrder.tax) : toMoney(total * 0.07);
  const explicitDeliveryFee = isPickup
    ? 0
    : toMoney(
        displayOrder?.deliveryFeeFinal ??
          displayOrder?.deliveryFeeQuoted ??
          quote?.estimatedFee ??
          (Number.isNaN(fallbackDeliveryFee) ? 0 : fallbackDeliveryFee)
      );
  const impliedDeliveryFee =
    !isPickup && displayOrder
      ? Math.max(0, toMoney(toMoney(displayOrder.total) - subtotal - tax))
      : 0;
  const deliveryFee = isPickup ? 0 : toMoney(Math.max(explicitDeliveryFee, impliedDeliveryFee));
  const serviceCharge = displayOrder
    ? Math.max(0, toMoney(toMoney(displayOrder.total) - subtotal - tax - deliveryFee))
    : toMoney(subtotal * 0.07 + 0.3);
  const estimatedTotal = displayOrder
    ? toMoney(displayOrder.total)
    : toMoney(subtotal + tax + deliveryFee + serviceCharge);

  const isDeliveryReady = Boolean(deliveryAddress && deliveryContact && quote);
  const placeOrderDisabled =
    isPlacingOrder ||
    isPreviewLoading ||
    isRequoting ||
    items.length === 0 ||
    !storeId ||
    !isStripeReady ||
    (!isPickup && !isDeliveryReady);

  const getAccessToken = useCallback(async () => {
    let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (accessToken) return accessToken;
    const credentials = await getCredentials();
    accessToken = credentials?.accessToken ?? null;
    if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    return accessToken;
  }, [getCredentials]);

  useEffect(() => {
    if (items.length > 0 && !user) {
      ensureAuthenticated({ pathname: '/order-summary' });
    }
  }, [ensureAuthenticated, items.length, user]);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const profile = await getUserByAuth0(token);
        const activeStore = profile.id ? await getActiveStore(profile.id, token) : null;

        if (!isActive) return;
        setUserProfile(profile);
        setActiveStoreId(getActiveStoreId(activeStore));
      } catch {
        if (!isActive) return;
        setUserProfile(null);
        setActiveStoreId(null);
      }
    }

    if (userSub) {
      void loadProfile();
    }

    return () => {
      isActive = false;
    };
  }, [getAccessToken, userSub]);

  useEffect(() => {
    if (!storeId) {
      setStoreProfile(null);
      return;
    }

    let isActive = true;
    getAccessToken()
      .then(async (accessToken) => {
        if (!accessToken) return null;
        const store = await getStoreById({ storeId, accessToken });
        return store;
      })
      .then((store) => {
        if (!isActive) return;
        setStoreProfile(store ?? null);
      })
      .catch(() => {
        if (!isActive) return;
        setStoreProfile(null);
      });

    return () => {
      isActive = false;
    };
  }, [getAccessToken, storeId]);

  useEffect(() => {
    setDraftOrder(null);
    setPreviewError(null);
  }, [
    checkoutState.fulfillmentType,
    checkoutState.deliveryAddress,
    checkoutState.deliveryContact,
    checkoutState.deliveryQuote,
    checkoutState.notes,
    checkoutState.pickupWindowEnd,
    checkoutState.pickupWindowStart,
    orderItemKey,
    storeId,
    userProfile?.id,
  ]);

  useEffect(() => {
    if (!storeId) return;
    if (!orderItemKey) return;

    const userId = getResolvedUserId(userProfile);
    if (!userId) return;

    const orderItems = items.map((item) => ({
      productId: Number.parseInt(item.id, 10),
      quantity: item.quantity,
    }));

    if (orderItems.some((item) => Number.isNaN(item.productId))) {
      setPreviewError('Missing product details for cart items.');
      return;
    }

    let payload: CreateOrderRequest;
    try {
      payload = buildOrderPayload({
        userId,
        storeId,
        items: orderItems,
        pickupWindow,
        isPickup,
        notes: checkoutState.notes,
        deliveryAddress,
        deliveryContact,
        quote,
      });
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Unable to build order payload.');
      return;
    }

    let isActive = true;
    setIsPreviewLoading(true);
    setPreviewError(null);

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
  }, [
    checkoutState.notes,
    deliveryAddress,
    deliveryContact,
    isPickup,
    items,
    orderItemKey,
    pickupWindow,
    quote,
    storeId,
    userProfile,
  ]);

  async function handlePlaceOrder() {
    if (!ensureAuthenticated()) return;
    if (isPlacingOrder || isRequoting) return;

    setPlaceOrderError(null);
    setIsPlacingOrder(true);

    try {
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

      const accessToken = await getAccessToken();
      if (!accessToken) {
        setPlaceOrderError('Missing access token. Please log in again.');
        return;
      }

      let userId = getResolvedUserId(userProfile);
      if (!userId) {
        const userRecord = await getUserByAuth0(accessToken);
        userId = getResolvedUserId(userRecord);
      }
      if (!userId) {
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

      let quoteToUse = quote;
      let quoteRefreshed = false;

      if (!isPickup) {
        if (!deliveryAddress) {
          setPlaceOrderError('Delivery address is required.');
          return;
        }
        if (!quoteToUse || isQuoteExpiringSoon(quoteToUse.expiresAt, 60)) {
          setIsRequoting(true);
          const refreshedQuote = await createDeliveryQuote({
            payload: {
              storeId,
              deliveryAddress,
            },
          });
          quoteToUse = refreshedQuote;
          quoteRefreshed = true;
          patchCheckout({ deliveryQuote: refreshedQuote });
          setIsRequoting(false);
        }
      }

      let payload: CreateOrderRequest;
      try {
        payload = buildOrderPayload({
          userId,
          storeId,
          items: orderItems,
          pickupWindow,
          isPickup,
          notes: checkoutState.notes,
          deliveryAddress,
          deliveryContact,
          quote: quoteToUse,
        });
      } catch (payloadError) {
        setPlaceOrderError(
          payloadError instanceof Error ? payloadError.message : 'Unable to build order payload.'
        );
        return;
      }

      const order = !quoteRefreshed && draftOrder ? draftOrder : await createOrder({ payload });
      const paymentIntentData = await createPaymentIntent({
        payload: {
          orderId: order.orderId,
        },
        accessToken,
        storeId,
      });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: storeProfile?.displayName ?? 'Basket',
        paymentIntentClientSecret: paymentIntentData.clientSecret,
        returnURL: stripeReturnUrl ?? undefined,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          email: userProfile?.email ?? user?.email ?? undefined,
          name: recipientName,
          phone: recipientPhone,
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

      clearCart();
      resetCheckout();
      router.replace('/order-history');
    } catch (error) {
      setPlaceOrderError(error instanceof Error ? error.message : 'Unable to place order.');
    } finally {
      setIsRequoting(false);
      setIsPlacingOrder(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
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
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isPickup ? 'Pickup Details' : 'Delivery Details'}</Text>

          <View style={styles.detailRow}>
            <View style={[styles.iconContainer, { backgroundColor: whenVisual.background }]}>
              <Ionicons name={whenVisual.icon} size={18} color={whenVisual.color} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>When</Text>
              <Text style={styles.detailText}>{fulfillmentTiming}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.iconContainer, { backgroundColor: itemsVisual.background }]}>
              <Ionicons name={itemsVisual.icon} size={18} color={itemsVisual.color} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Items</Text>
              <Text style={styles.detailText}>{itemCount} items</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.iconContainer, { backgroundColor: locationVisual.background }]}>
              <Ionicons name={locationVisual.icon} size={18} color={locationVisual.color} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{isPickup ? 'Pickup Location' : 'Delivery Address'}</Text>
              <Text style={styles.detailText}>
                {isPickup ? storeProfile?.displayName ?? 'Store not selected' : formatAddress(deliveryAddress)}
              </Text>
              {isPickup ? (
                <Text style={styles.detailSubtext}>
                  {storeProfile ? formatStoreAddress(storeProfile) : 'Add a pickup store'}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <View style={[styles.iconContainer, { backgroundColor: recipientVisual.background }]}>
              <Ionicons name={recipientVisual.icon} size={18} color={recipientVisual.color} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Recipient</Text>
              <Text style={styles.detailText}>{recipientName}</Text>
              <Text style={styles.detailSubtext}>{recipientPhone}</Text>
            </View>
          </View>
        </View>

        {!isPickup ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Instructions</Text>
            <View style={styles.instructionItem}>
              <View
                style={[styles.instructionIconWrapper, { backgroundColor: instructionVisual.background }]}
              >
                <Ionicons name={instructionVisual.icon} size={18} color={instructionVisual.color} />
              </View>
              <Text style={styles.instructionText}>
                {checkoutState.notes || 'Meet me at my door'}
              </Text>
            </View>
            {quote ? (
              <Text style={styles.quoteHint}>
                Quote {quote.quoteId} expires at {new Date(quote.expiresAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pickup Instructions</Text>
            <Text style={styles.instructionText}>
              Head to the pickup counter once you get the ready notification and have your confirmation and ID handy.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          {(isPreviewLoading || isRequoting) && (
            <Text style={styles.summaryHelperText}>
              {isRequoting ? 'Refreshing delivery quote...' : 'Calculating order totals...'}
            </Text>
          )}
          {!isPreviewLoading && previewError && <Text style={styles.summaryHelperText}>{previewError}</Text>}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>

          {!isPickup ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>{formatCurrency(deliveryFee)}</Text>
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Charge</Text>
            <Text style={styles.summaryValue}>{formatCurrency(serviceCharge)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimatedTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {placeOrderError ? <Text style={styles.placeOrderError}>{placeOrderError}</Text> : null}
        {!isStripeReady ? (
          <Text style={styles.placeOrderError}>Payments are not configured yet.</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.placeOrderButton, placeOrderDisabled && styles.placeOrderButtonDisabled]}
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
    flex: 1,
  },
  quoteHint: {
    fontSize: 13,
    color: '#667085',
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
