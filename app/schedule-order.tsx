import { useCart } from '@/contexts/cart-context';
import { useCheckout } from '@/contexts/checkout-context';
import { useLocation } from '@/contexts/location-context';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { ApiClientError, type ApiError } from '@/lib/api/client';
import { createDeliveryQuote } from '@/lib/api/orders';
import { getActiveStore, getUserByAuth0, type UserProfileResponse } from '@/lib/api/users';
import type { DeliveryAddress, DeliveryContact } from '@/lib/types/orders';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

function parseStoreId(locationId: string): number | null {
  if (!locationId.startsWith('store-')) return null;
  const rawId = locationId.replace('store-', '');
  const parsed = Number.parseInt(rawId, 10);
  return Number.isNaN(parsed) ? null : parsed;
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

function normalizeToE164(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+') && /^\+[0-9]{8,15}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function formatDeliveryAddress(address: DeliveryAddress | null): string {
  if (!address) return 'Add a delivery address to continue.';
  const parts = [
    address.street1,
    address.street2,
    address.city,
    address.state,
    address.zip,
    address.country,
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim());
  return parts.join(', ');
}

function mapProfileAddress(profile: UserProfileResponse | null): DeliveryAddress | null {
  if (!profile?.streetAddress || !profile.city || !profile.state || !profile.postalCode) {
    return null;
  }

  return {
    street1: profile.streetAddress,
    city: profile.city,
    state: profile.state,
    zip: profile.postalCode,
    country: profile.country || 'US',
  };
}

function mapProfileContact(profile: UserProfileResponse | null, fallbackName: string): DeliveryContact | null {
  if (!profile?.phone) return null;
  const formattedPhone = normalizeToE164(profile.phone);
  if (!formattedPhone) return null;
  const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || fallbackName;
  return {
    name: fullName,
    phone: formattedPhone,
  };
}

interface MappedErrorAction {
  id: 'change_address' | 'switch_to_pickup' | 'retry';
  label: string;
}

interface MappedQuoteError {
  kind: 'inline' | 'retry';
  title: string;
  body: string;
  actions: MappedErrorAction[];
}

function getFieldErrorMessage(fieldErrors: ApiError['fieldErrors']): string | null {
  if (!fieldErrors) return null;
  if (Array.isArray(fieldErrors)) {
    const first = fieldErrors.find((fieldError) => typeof fieldError?.message === 'string');
    return first?.message ?? null;
  }
  const firstValue = Object.values(fieldErrors).find((value) => typeof value === 'string');
  return firstValue ?? null;
}

function getApiErrorResponse(error: unknown): ApiError | null {
  if (error instanceof ApiClientError) {
    if (error.response) return error.response;
    return {
      status: error.status,
      message: error.message,
      code: error.code,
    };
  }

  if (error && typeof error === 'object') {
    const raw = error as { status?: number; message?: string; fieldErrors?: ApiError['fieldErrors'] };
    if (typeof raw.message === 'string') {
      return {
        status: raw.status,
        message: raw.message,
        fieldErrors: raw.fieldErrors,
      };
    }
  }

  return null;
}

function mapDeliveryQuoteError(error: unknown): MappedQuoteError {
  const errorBody = getApiErrorResponse(error);
  const status = errorBody?.status;
  const normalizedMessage = (errorBody?.message || '').toLowerCase();
  const fieldErrorMessage = getFieldErrorMessage(errorBody?.fieldErrors);
  const isNetworkError = normalizedMessage.includes('network');

  if (status === 400 && normalizedMessage.includes('outside the delivery radius')) {
    return {
      kind: 'inline',
      title: 'Address not serviceable',
      body: 'This address is outside the store’s delivery area.',
      actions: [
        { id: 'change_address', label: 'Change address' },
        { id: 'switch_to_pickup', label: 'Switch to pickup' },
      ],
    };
  }

  if (status === 409) {
    return {
      kind: 'inline',
      title: 'Delivery unavailable',
      body: 'This store does not support delivery right now.',
      actions: [{ id: 'switch_to_pickup', label: 'Switch to pickup' }],
    };
  }

  if (status && status >= 400 && status < 500) {
    return {
      kind: 'inline',
      title: 'Please check your details',
      body: fieldErrorMessage || 'Request is invalid.',
      actions: [{ id: 'change_address', label: 'Change address' }],
    };
  }

  if (isNetworkError || (status && status >= 500) || !status) {
    return {
      kind: 'retry',
      title: 'Something went wrong',
      body: 'Please try again in a moment.',
      actions: [{ id: 'retry', label: 'Retry' }],
    };
  }

  return {
    kind: 'inline',
    title: 'Please check your details',
    body: 'Request is invalid.',
    actions: [{ id: 'change_address', label: 'Change address' }],
  };
}

export default function ScheduleOrderScreen() {
  const router = useRouter();
  const { state: cartState } = useCart();
  const { state: checkoutState, patchCheckout } = useCheckout();
  const { selectedLocation } = useLocation();
  const { isLoggedIn, ensureAuthenticated, openLogin } = useAuthGuard();
  const { user, getCredentials } = useAuth0();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>(
    checkoutState.fulfillmentType
  );
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<MappedQuoteError | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);

  const isDelivery = fulfillmentType === 'delivery';
  const pickupEtaMessage =
    checkoutState.pickupEtaMessage ||
    'Ready within about 15 minutes once the store confirms your order.';
  const pickupLocationLabel = selectedLocation.label || 'Selected store';
  const pickupLocationAddress = selectedLocation.address || 'Select a store first';
  const fallbackName = user?.name ?? user?.email ?? 'Guest';

  const storeId = activeStoreId ?? parseStoreId(selectedLocation.id);

  const deliveryAddress = useMemo(() => {
    if (checkoutState.deliveryAddress) return checkoutState.deliveryAddress;
    return mapProfileAddress(userProfile);
  }, [checkoutState.deliveryAddress, userProfile]);

  const deliveryContact = useMemo(() => {
    if (checkoutState.deliveryContact) return checkoutState.deliveryContact;
    return mapProfileContact(userProfile, fallbackName);
  }, [checkoutState.deliveryContact, userProfile, fallbackName]);

  const deliveryAddressText = formatDeliveryAddress(deliveryAddress);

  useEffect(() => {
    if (cartState.items.length > 0 && !isLoggedIn) {
      openLogin({ pathname: '/schedule-order' });
    }
  }, [cartState.items.length, isLoggedIn, openLogin]);

  useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [backdropOpacity]);

  useEffect(() => {
    let isActive = true;

    async function getAccessToken() {
      let token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token) return token;
      const credentials = await getCredentials();
      token = credentials?.accessToken ?? null;
      if (token) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
      return token;
    }

    async function loadProfile() {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const profile = await getUserByAuth0(token);
        const activeStore = profile.id ? await getActiveStore(profile.id, token) : null;

        if (!isActive) return;
        setUserProfile(profile);
        setActiveStoreId(getActiveStoreId(activeStore));

        if (!checkoutState.deliveryAddress) {
          const profileAddress = mapProfileAddress(profile);
          if (profileAddress) patchCheckout({ deliveryAddress: profileAddress });
        }

        if (!checkoutState.deliveryContact) {
          const profileContact = mapProfileContact(profile, fallbackName);
          if (profileContact) patchCheckout({ deliveryContact: profileContact });
        }
      } catch {
        if (!isActive) return;
        setUserProfile(null);
      }
    }

    if (isLoggedIn) {
      void loadProfile();
    }

    return () => {
      isActive = false;
    };
  }, [checkoutState.deliveryAddress, checkoutState.deliveryContact, fallbackName, getCredentials, isLoggedIn, patchCheckout]);

  function handleClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      router.back();
    });
  }

  async function handleContinue() {
    const target = { pathname: '/order-summary' as const };
    if (!ensureAuthenticated(target)) return;

    setQuoteError(null);

    if (!isDelivery) {
      patchCheckout({
        fulfillmentType: 'pickup',
        pickupEtaMessage,
        deliveryQuote: null,
      });
      router.replace({
        pathname: '/order-summary',
        params: {
          fulfillmentType: 'pickup',
        },
      });
      return;
    }

    if (!storeId) {
      setQuoteError({
        kind: 'inline',
        title: 'Please check your details',
        body: 'Select a store before requesting delivery.',
        actions: [{ id: 'switch_to_pickup', label: 'Switch to pickup' }],
      });
      return;
    }

    if (!deliveryAddress) {
      setQuoteError({
        kind: 'inline',
        title: 'Please check your details',
        body: 'Add a delivery address to continue.',
        actions: [{ id: 'change_address', label: 'Change address' }],
      });
      return;
    }

    if (!deliveryContact?.name || !deliveryContact.phone) {
      setQuoteError({
        kind: 'inline',
        title: 'Please check your details',
        body: 'Add recipient name and phone number to continue.',
        actions: [{ id: 'change_address', label: 'Change address' }],
      });
      return;
    }

    const normalizedPhone = normalizeToE164(deliveryContact.phone);
    if (!normalizedPhone) {
      setQuoteError({
        kind: 'inline',
        title: 'Please check your details',
        body: 'Recipient phone must be a valid mobile number.',
        actions: [{ id: 'change_address', label: 'Change address' }],
      });
      return;
    }

    setIsQuoting(true);
    try {
      const quote = await createDeliveryQuote({
        payload: {
          storeId,
          deliveryAddress,
        },
      });

      patchCheckout({
        fulfillmentType: 'delivery',
        deliveryAddress,
        deliveryContact: {
          name: deliveryContact.name,
          phone: normalizedPhone,
        },
        deliveryQuote: quote,
      });
      router.replace({
        pathname: '/order-summary',
        params: {
          fulfillmentType: 'delivery',
          deliveryFee: String(quote.estimatedFee),
        },
      });
    } catch (error) {
      setQuoteError(mapDeliveryQuoteError(error));
    } finally {
      setIsQuoting(false);
    }
  }

  function handleErrorAction(actionId: MappedErrorAction['id']) {
    if (actionId === 'change_address') {
      router.push('/delivery-address');
      return;
    }
    if (actionId === 'switch_to_pickup') {
      setFulfillmentType('pickup');
      setQuoteError(null);
      return;
    }
    if (actionId === 'retry') {
      void handleContinue();
    }
  }

  const continueDisabled = isQuoting;

  return (
    <View style={styles.modalRoot}>
      <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
      <View style={styles.modalOverlay}>
        <Pressable style={styles.dismissZone} onPress={handleClose} />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.headerKicker}>Step 1 of 2</Text>
              <Text style={styles.headerTitle}>Choose fulfillment</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#111322" />
            </TouchableOpacity>
          </View>

          <View style={styles.fulfillmentToggle}>
            <TouchableOpacity
              style={[styles.fulfillmentOption, isDelivery && styles.fulfillmentOptionActive]}
              onPress={() => {
                setFulfillmentType('delivery');
                setQuoteError(null);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="car-outline" size={20} color={isDelivery ? '#111322' : '#5D6B82'} />
              <Text style={[styles.fulfillmentOptionTitle, isDelivery && styles.fulfillmentOptionTitleActive]}>
                Delivery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fulfillmentOption, !isDelivery && styles.fulfillmentOptionActive]}
              onPress={() => {
                setFulfillmentType('pickup');
                setQuoteError(null);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="bag-outline" size={20} color={!isDelivery ? '#111322' : '#5D6B82'} />
              <Text
                style={[
                  styles.fulfillmentOptionTitle,
                  !isDelivery && styles.fulfillmentOptionTitleActive,
                ]}
              >
                Pickup
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sheetBody}>
            {isDelivery ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.pickupScroll}
                contentContainerStyle={styles.pickupContent}
              >
                <View style={styles.addressSection}>
                  <Text style={styles.addressLabel}>Deliver to</Text>
                  <View style={styles.addressRow}>
                    <Text style={styles.addressText}>{deliveryAddressText}</Text>
                    <TouchableOpacity onPress={() => router.push('/delivery-address')}>
                      <Text style={styles.changeLink}>Change</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {deliveryContact ? (
                  <View style={styles.pickupInfoCard}>
                    <Ionicons name="person-outline" size={18} color="#5D6B82" />
                    <Text style={styles.pickupInfoText}>
                      Delivering to {deliveryContact.name} ({deliveryContact.phone}).
                    </Text>
                  </View>
                ) : null}

                <View style={styles.pickupInfoCard}>
                  <Ionicons name="information-circle-outline" size={18} color="#5D6B82" />
                  <Text style={styles.pickupInfoText}>
                    {checkoutState.deliveryQuote
                      ? `Estimated fee ${checkoutState.deliveryQuote.currency} ${checkoutState.deliveryQuote.estimatedFee.toFixed(2)} · ETA ${checkoutState.deliveryQuote.eta}`
                      : 'We will estimate delivery fee and ETA when you continue.'}
                  </Text>
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.pickupScroll}
                contentContainerStyle={styles.pickupContent}
              >
                <View style={styles.addressSection}>
                  <Text style={styles.addressLabel}>Pickup from</Text>
                  <Text style={styles.addressText}>{pickupLocationLabel}</Text>
                  <Text style={styles.pickupAddress}>{pickupLocationAddress}</Text>
                </View>

                <View style={styles.pickupEtaCard}>
                  <Ionicons name="time-outline" size={20} color="#111322" />
                  <View style={styles.pickupEtaCopy}>
                    <Text style={styles.pickupEtaTitle}>Ready shortly</Text>
                    <Text style={styles.pickupEtaText}>{pickupEtaMessage}</Text>
                  </View>
                </View>

                <View style={styles.pickupInfoCard}>
                  <Ionicons name="notifications-outline" size={18} color="#5D6B82" />
                  <Text style={styles.pickupInfoText}>
                    We will notify you when the store confirms your order. Bring your ID and confirmation email.
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.footer}>
              {quoteError?.kind === 'retry' ? (
                <View style={styles.retryBanner}>
                  <View style={styles.retryBannerTextWrap}>
                    <Text style={styles.retryBannerTitle}>{quoteError.title}</Text>
                    <Text style={styles.retryBannerBody}>{quoteError.body}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => handleErrorAction('retry')}
                    disabled={isQuoting}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {quoteError?.kind === 'inline' ? (
                <View style={styles.inlineErrorCard}>
                  <Text style={styles.inlineErrorTitle}>{quoteError.title}</Text>
                  <Text style={styles.inlineErrorBody}>{quoteError.body}</Text>
                  <View style={styles.inlineErrorActions}>
                    {quoteError.actions.map((action) => (
                      <TouchableOpacity
                        key={action.id}
                        style={styles.inlineErrorActionButton}
                        onPress={() => handleErrorAction(action.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.inlineErrorActionText}>{action.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.continueButton, continueDisabled && styles.continueButtonDisabled]}
                onPress={handleContinue}
                disabled={continueDisabled}
                activeOpacity={0.85}
              >
                {isQuoting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.continueButtonText}>
                    {isDelivery ? 'Get Delivery Quote' : 'Review Order'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.85}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  dismissZone: {
    flex: 1,
    width: '100%',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '95%',
    minHeight: '80%',
    width: '100%',
    alignSelf: 'center',
    flexShrink: 0,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7EC',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  fulfillmentToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fulfillmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#fff',
    gap: 12,
  },
  fulfillmentOptionActive: {
    borderColor: '#111322',
    backgroundColor: '#F2F2F2',
  },
  fulfillmentOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111322',
  },
  fulfillmentOptionTitleActive: {
    color: '#111322',
  },
  headerKicker: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#98A2B3',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111322',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    flex: 1,
  },
  pickupScroll: {
    flex: 1,
  },
  pickupContent: {
    paddingBottom: 24,
    gap: 16,
  },
  addressSection: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    color: '#111322',
    fontWeight: '600',
    lineHeight: 22,
  },
  pickupAddress: {
    fontSize: 14,
    color: '#475467',
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111322',
  },
  pickupEtaCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickupEtaCopy: {
    flex: 1,
  },
  pickupEtaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111322',
    marginBottom: 3,
  },
  pickupEtaText: {
    fontSize: 14,
    color: '#667085',
    lineHeight: 20,
  },
  pickupInfoCard: {
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pickupInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#667085',
    lineHeight: 19,
    fontWeight: '500',
  },
  footer: {
    paddingBottom: 12,
    paddingTop: 6,
  },
  retryBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  retryBannerTextWrap: {
    flex: 1,
  },
  retryBannerTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  retryBannerBody: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  retryButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111322',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineErrorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginBottom: 10,
  },
  inlineErrorTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  inlineErrorBody: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  inlineErrorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  inlineErrorActionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineErrorActionText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: '#111322',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAECF0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#111322',
    fontSize: 15,
    fontWeight: '600',
  },
});
