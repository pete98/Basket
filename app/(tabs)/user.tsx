import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Href, useRouter } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { isAuth0Configured } from '@/lib/config/auth0';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useLocation } from '@/contexts/location-context';
import { getStoreById } from '@/lib/api/stores';
import { getActiveStore, getUserByAuth0 } from '@/lib/api/users';
import * as SecureStore from 'expo-secure-store';
import { CustomerSheet, CustomerSheetError } from '@stripe/stripe-react-native';
import { createStripeCustomerSession, createStripeSetupIntent } from '@/lib/api/payments';
import { ApiClientError } from '@/lib/api/client';
import { stripeConfig } from '@/lib/config/stripe';

interface ProfileAction {
  title: string;
  description: string;
  icon: string;
  tint: string;
  route?: Href;
}

const accountActions: ProfileAction[] = [
  {
    title: 'Payment Methods',
    description: 'Visa •••• 3941',
    icon: 'card-outline',
    tint: '#EDF6FF',
  },
  {
    title: 'Order History',
    description: 'Track or reorder past items',
    icon: 'time-outline',
    tint: '#E9F2FF',
    route: '/order-history',
  },
  {
    title: 'Address',
    description: 'Manage your delivery address',
    icon: 'location-outline',
    tint: '#FFF6ED',
    route: '/delivery-address',
  },
];

const supportOptions: ProfileAction[] = [
  {
    title: 'Help Center',
    description: 'FAQs and live chat',
    icon: 'chatbubbles-outline',
    tint: '#E8FBF1',
    route: '/help',
  },
];

export default function UserProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clearSession, user, isLoading, getCredentials } = useAuth0();
  const { isLoggedIn, ensureAuthenticated, openLogin } = useAuthGuard();
  const { selectedLocation } = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isManagingPaymentMethods, setIsManagingPaymentMethods] = useState(false);
  const [paymentMethodDescription, setPaymentMethodDescription] = useState('Manage saved cards');
  const [savedStoreTitle, setSavedStoreTitle] = useState('No store selected');
  const [savedStoreSubtitle, setSavedStoreSubtitle] = useState(
    'Select a store to enable store-specific inventory and search.'
  );
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const configReady = isAuth0Configured;
  const isCustomerSheetConfigured = Boolean(
    stripeConfig.publishableKey &&
      stripeConfig.customerSessionUrl &&
      stripeConfig.customerSetupIntentUrl
  );
  const ACCESS_TOKEN_KEY = 'auth0_access_token';

  function buildStripeReturnUrl(): string | undefined {
    if (!stripeConfig.urlScheme) return undefined;
    return `${stripeConfig.urlScheme}://stripe-redirect`;
  }

  function isMissingCustomerSessionRoute(error: unknown): boolean {
    if (!(error instanceof ApiClientError)) return false;
    const normalized = error.message.toLowerCase();
    return (
      error.status === 404 ||
      normalized.includes('no static resource stripe/customers/customer-session') ||
      normalized.includes('customer-session') ||
      normalized.includes('not found')
    );
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

  function getSavedStoreErrorMessage(error: unknown): string {
    if (!(error instanceof ApiClientError)) {
      return 'Unable to load active store right now. Please try again.';
    }

    if (error.status === 401) {
      return 'Your session expired. Please log in again.';
    }

    if (error.status === 404) {
      return 'No store selected yet. Choose a store to personalize Home and Search.';
    }

    return 'Unable to load active store right now. Please try again.';
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setSavedStoreTitle('No store selected');
      setSavedStoreSubtitle('Select a store to enable store-specific inventory and search.');
      setIsStoreLoading(false);
      return;
    }

    let isActive = true;
    setIsStoreLoading(true);

    async function loadSavedStore() {
      try {
        let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (!accessToken) {
          const credentials = await getCredentials();
          accessToken = credentials?.accessToken ?? null;
          if (accessToken) {
            await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
          }
        }

        if (!accessToken) {
          if (!isActive) return;
          setSavedStoreTitle('No store selected');
          setSavedStoreSubtitle('Log in again to load your active store.');
          return;
        }

        const profile = await getUserByAuth0(accessToken);
        const userId = (profile as { id?: number | string }).id;
        if (!userId) {
          if (!isActive) return;
          setSavedStoreTitle('No store selected');
          setSavedStoreSubtitle('Unable to resolve your user profile.');
          return;
        }

        const activeStore = await getActiveStore(userId, accessToken);
        const activeStoreId = getActiveStoreId(activeStore);
        if (!activeStoreId) {
          if (!isActive) return;
          setSavedStoreTitle('No store selected');
          setSavedStoreSubtitle('Choose a store to personalize Home and Search.');
          return;
        }

        const store = await getStoreById({ storeId: activeStoreId, accessToken });
        if (!isActive) return;
        const streetLine = store.street2 ? `${store.street}, ${store.street2}` : store.street;
        setSavedStoreTitle(store.displayName || `Store #${activeStoreId}`);
        setSavedStoreSubtitle(`${streetLine}, ${store.city}, ${store.state} ${store.zip}`);
      } catch (error) {
        if (!isActive) return;
        setSavedStoreTitle('No store selected');
        setSavedStoreSubtitle(getSavedStoreErrorMessage(error));
      } finally {
        if (!isActive) return;
        setIsStoreLoading(false);
      }
    }

    void loadSavedStore();

    return () => {
      isActive = false;
    };
  }, [getCredentials, isLoggedIn, selectedLocation.id]);

  const handleLogin = useCallback(() => {
    openLogin({ pathname: '/user' });
  }, [openLogin]);

  const handleLogout = useCallback(async () => {
    setIsProcessing(true);
    try {
      await clearSession();
    } catch (error) {
      console.error('Auth0 logout failed', error);
    } finally {
      try {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      } catch (error) {
        console.error('Failed to clear local auth token', error);
      }
      router.replace('/login');
      setIsProcessing(false);
    }
  }, [clearSession, router]);

  const handlePaymentMethodsPress = useCallback(async () => {
    const canProceed = ensureAuthenticated({ pathname: '/user' });
    if (!canProceed) return;
    if (!isCustomerSheetConfigured) {
      Alert.alert('Payments unavailable', 'Stripe is not configured for this app.');
      return;
    }

    setIsManagingPaymentMethods(true);
    try {
      let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (!accessToken) {
        const credentials = await getCredentials();
        accessToken = credentials?.accessToken ?? null;
        if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      }

      if (!accessToken) {
        Alert.alert('Session expired', 'Please log in again to manage payment methods.');
        return;
      }

      const { error: initError } = await CustomerSheet.initialize({
        intentConfiguration: {
          paymentMethodTypes: ['card'],
        },
        clientSecretProvider: {
          provideCustomerSessionClientSecret: async () => {
            const response = await createStripeCustomerSession();
            return {
              customerId: response.customerId,
              clientSecret: response.customerSessionClientSecret,
            };
          },
          provideSetupIntentClientSecret: async () => {
            const response = await createStripeSetupIntent();
            return response.setupIntentClientSecret;
          },
        },
        headerTextForSelectionScreen: 'Manage your payment method',
        returnURL: buildStripeReturnUrl(),
      });

      if (initError) {
        Alert.alert('Unable to open payment methods', initError.localizedMessage || initError.message);
        return;
      }

      // Stop row spinner once initialization is complete; the native sheet is about to open.
      setIsManagingPaymentMethods(false);
      const { error, paymentOption } = await CustomerSheet.present();
      if (error) {
        if (error.code === CustomerSheetError.Canceled) return;
        Alert.alert('Payment methods error', error.localizedMessage || error.message);
        return;
      }

      if (paymentOption?.label) setPaymentMethodDescription(paymentOption.label);
    } catch (error) {
      if (isMissingCustomerSessionRoute(error)) {
        Alert.alert(
          'Payment methods unavailable',
          'Customer session endpoint is not available on this backend. Please contact support.'
        );
        return;
      }
      if (error instanceof ApiClientError) {
        Alert.alert('Payment methods error', error.message);
        return;
      }
      if (error instanceof Error) {
        Alert.alert('Payment methods error', error.message);
        return;
      }
      Alert.alert('Payment methods error', 'Unable to manage payment methods right now.');
    } finally {
      setIsManagingPaymentMethods(false);
    }
  }, [ensureAuthenticated, getCredentials, isCustomerSheetConfigured]);

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeaderBackground, { paddingTop: insets.top + 10 }]}>
        <View style={styles.pageHeaderContent}>
          <View>
            <Text style={styles.pageHeaderTitle}>Your Profile</Text>
            <Text style={styles.pageHeaderSubtitle}>Manage account & preferences</Text>
          </View>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: 16,
            paddingBottom: insets.bottom + 44,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: user?.picture ?? 'https://randomuser.me/api/portraits/men/41.jpg',
              }}
              style={styles.avatar}
            />
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.name}>{user?.name ?? 'Guest shopper'}</Text>
            <Text style={styles.email}>
              {user?.email ?? 'Log in to personalize your account.'}
            </Text>
          </View>
          {isLoggedIn && (
            <Pressable style={styles.editButton}>
              <Ionicons
                name="create-outline"
                size={16}
                color="#1C1C1E"
                style={styles.editIcon}
              />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          )}
        </View>

        {!isLoggedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Authentication</Text>
            <Text style={styles.authHint}>
              Log in to manage your account settings and saved info.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.authButton,
                pressed && styles.rowPressed,
              ]}
              onPress={configReady ? handleLogin : undefined}
              disabled={!configReady || isLoading || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.authButtonText}>
                  {configReady ? 'Log in' : 'Configure Auth0'}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {isLoggedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Saved Store</Text>
            <View style={styles.storeCard}>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{savedStoreTitle}</Text>
                {isStoreLoading ? (
                  <ActivityIndicator size="small" color="#4a5568" />
                ) : (
                  <Text style={styles.storeAddress}>{savedStoreSubtitle}</Text>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.changeStoreButton,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => router.push('/find-store')}
              >
                <Text style={styles.changeStoreButtonText}>Change Store</Text>
              </Pressable>
            </View>
          </View>
        )}

        {isLoggedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            {accountActions.map((item, index) => (
              <Pressable
                key={item.title}
                style={({ pressed }) => [
                  styles.rowCard,
                  index > 0 && styles.rowSpacing,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => {
                  if (item.title === 'Payment Methods') {
                    void handlePaymentMethodsPress();
                    return;
                  }
                  if (item.route) {
                    router.push(item.route);
                  }
                }}
                disabled={item.title === 'Payment Methods' && isManagingPaymentMethods}
              >
                <View style={[styles.iconBadge, { backgroundColor: item.tint }]}>
                  <Ionicons name={item.icon as any} size={18} color="#1C1C1E" />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSubtitle}>
                    {item.title === 'Payment Methods'
                      ? paymentMethodDescription
                      : item.description}
                  </Text>
                </View>
                {item.title === 'Payment Methods' && isManagingPaymentMethods ? (
                  <ActivityIndicator size="small" color="#B0B3C1" />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#B0B3C1" />
                )}
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support</Text>
          {supportOptions.map((item, index) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [
                styles.rowCard,
                index > 0 && styles.rowSpacing,
                pressed && styles.rowPressed,
              ]}
              onPress={() => {
                if (item.route) {
                  router.push(item.route);
                }
              }}
            >
              <View style={[styles.iconBadge, { backgroundColor: item.tint }]}>
                <Ionicons name={item.icon as any} size={18} color="#1C1C1E" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B0B3C1" />
            </Pressable>
          ))}
          {isLoggedIn && (
            <Pressable
              style={({ pressed }) => [
                styles.rowCard,
                styles.rowSpacing,
                styles.logoutRow,
                pressed && styles.rowPressed,
              ]}
              onPress={configReady ? handleLogout : undefined}
              disabled={!configReady || isLoading || isProcessing}
            >
              <View style={[styles.iconBadge, styles.logoutIconBadge]}>
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                )}
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.logoutTitle}>Log Out</Text>
                <Text style={styles.logoutSubtitle}>Sign out from your account</Text>
              </View>
            </Pressable>
          )}
        </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarWrapper: {
    borderRadius: 36,
    overflow: 'hidden',
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
  },
  profileMeta: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  email: {
    fontSize: 14,
    color: '#6E7191',
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#FFF6E4',
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A05800',
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIcon: {
    marginRight: 6,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: '#667085',
    fontWeight: '600',
    marginBottom: 12,
  },
  authHint: {
    fontSize: 13,
    color: '#667085',
    marginBottom: 12,
    lineHeight: 18,
  },
  authButton: {
    height: 44,
    borderRadius: 999,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowSpacing: {
    marginTop: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  logoutRow: {
    paddingHorizontal: 0,
  },
  logoutIconBadge: {
    backgroundColor: '#FFF1F1',
  },
  logoutTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1F24',
  },
  logoutSubtitle: {
    fontSize: 13,
    color: '#8E90A6',
    marginTop: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1F24',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#8E90A6',
    marginTop: 2,
  },
  storeCard: {
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  storeInfo: {
    gap: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1F24',
  },
  storeAddress: {
    fontSize: 13,
    color: '#667085',
    lineHeight: 18,
  },
  changeStoreButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1C1C1E',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  changeStoreButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  preferenceSpacing: {
    marginTop: 12,
  },
  pageHeaderBackground: {
    backgroundColor: '#f97316',
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
  },
  pageHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  pageHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  pageHeaderSubtitle: {
    color: '#ffe8d2',
    fontSize: 14,
    marginTop: 4,
  },
});
