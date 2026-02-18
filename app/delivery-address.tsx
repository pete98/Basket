import { useCheckout } from '@/contexts/checkout-context';
import { getUserByAuth0, updateUserProfile, type UserProfileResponse } from '@/lib/api/users';
import type { DeliveryAddress } from '@/lib/types/orders';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

interface DeliveryFormState {
  recipientName: string;
  recipientPhone: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
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

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  if (digits.length <= 3) return area;
  if (digits.length <= 6) return `(${area}) ${prefix}`;
  return `(${area}) ${prefix}-${line}`;
}

function extractProfileName(profile: UserProfileResponse | null, fallback: string): string {
  if (!profile) return fallback;
  const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
  return fullName || fallback;
}

export default function DeliveryAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { getCredentials, user } = useAuth0();
  const { state: checkoutState, patchCheckout } = useCheckout();
  const scale = useMemo(() => Math.min(Math.max(width / 375, 0.9), 1.15), [width]);
  const styles = useMemo(() => createStyles(scale), [scale]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(checkoutState.saveAddressToProfile);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [form, setForm] = useState<DeliveryFormState>({
    recipientName: '',
    recipientPhone: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  const getAccessToken = useCallback(async () => {
    let token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token) return token;
    const credentials = await getCredentials();
    token = credentials?.accessToken ?? null;
    if (token) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    return token;
  }, [getCredentials]);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const token = await getAccessToken();
        if (token && isActive) setAccessToken(token);

        const snapshotAddress = checkoutState.deliveryAddress;
        const snapshotContact = checkoutState.deliveryContact;
        if (snapshotAddress && snapshotContact && isActive) {
          setForm({
            recipientName: snapshotContact.name,
            recipientPhone: snapshotContact.phone,
            street1: snapshotAddress.street1,
            street2: snapshotAddress.street2 ?? '',
            city: snapshotAddress.city,
            state: snapshotAddress.state,
            zip: snapshotAddress.zip,
            country: snapshotAddress.country || 'US',
          });
          return;
        }

        if (!token) return;

        const profile = await getUserByAuth0(token);
        if (!isActive) return;
        setUserProfile(profile);

        const fallbackName = user?.name ?? user?.email ?? '';
        setForm({
          recipientName: extractProfileName(profile, fallbackName),
          recipientPhone: profile.phone ?? '',
          street1: profile.streetAddress ?? '',
          street2: '',
          city: profile.city ?? '',
          state: profile.state ?? '',
          zip: profile.postalCode ?? '',
          country: profile.country ?? 'US',
        });
      } catch (loadError) {
        if (!isActive) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load address');
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      isActive = false;
    };
  }, [checkoutState.deliveryAddress, checkoutState.deliveryContact, getAccessToken, user?.email, user?.name]);

  function updateField<K extends keyof DeliveryFormState>(key: K, value: DeliveryFormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function validate() {
    if (!form.recipientName.trim()) return 'Recipient name is required.';
    if (!normalizeToE164(form.recipientPhone)) return 'Enter a valid phone number.';
    if (!form.street1.trim()) return 'Street address is required.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.state.trim()) return 'State is required.';
    if (!form.zip.trim()) return 'ZIP code is required.';
    if (!form.country.trim()) return 'Country is required.';
    return null;
  }

  function buildDeliveryAddress(): DeliveryAddress {
    return {
      street1: form.street1.trim(),
      street2: form.street2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      country: form.country.trim().toUpperCase(),
    };
  }

  async function handleSave() {
    if (isSaving) return;
    setError(null);
    setWarning(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalizedPhone = normalizeToE164(form.recipientPhone);
    if (!normalizedPhone) {
      setError('Enter a valid phone number.');
      return;
    }

    setIsSaving(true);
    const deliveryAddress = buildDeliveryAddress();
    patchCheckout({
      deliveryAddress,
      deliveryContact: {
        name: form.recipientName.trim(),
        phone: normalizedPhone,
      },
      saveAddressToProfile: saveAsDefault,
      deliveryQuote: null,
      fulfillmentType: 'delivery',
    });

    if (saveAsDefault && accessToken && userProfile?.id) {
      try {
        await updateUserProfile(userProfile.id, accessToken, {
          phone: normalizedPhone,
          streetAddress: deliveryAddress.street1,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          postalCode: deliveryAddress.zip,
          country: deliveryAddress.country,
        });
      } catch (updateError) {
        setWarning(
          updateError instanceof Error
            ? `Saved for this order only: ${updateError.message}`
            : 'Saved for this order only; profile update failed.'
        );
      }
    }

    setIsSaving(false);
    router.back();
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Address</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {warning ? <Text style={styles.warningText}>{warning}</Text> : null}

        <Text style={styles.label}>Recipient Name</Text>
        <TextInput
          value={form.recipientName}
          onChangeText={(value) => updateField('recipientName', value)}
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Recipient Phone</Text>
        <TextInput
          value={form.recipientPhone}
          onChangeText={(value) => updateField('recipientPhone', formatPhoneInput(value))}
          style={styles.input}
          placeholder="(555) 555-5555"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Street Address</Text>
        <TextInput
          value={form.street1}
          onChangeText={(value) => updateField('street1', value)}
          style={styles.input}
          placeholder="Street address"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Apartment / Suite (Optional)</Text>
        <TextInput
          value={form.street2}
          onChangeText={(value) => updateField('street2', value)}
          style={styles.input}
          placeholder="Apt, suite, etc."
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          value={form.city}
          onChangeText={(value) => updateField('city', value)}
          style={styles.input}
          placeholder="City"
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.row}>
          <View style={styles.rowCell}>
            <Text style={styles.label}>State</Text>
            <TextInput
              value={form.state}
              onChangeText={(value) => updateField('state', value)}
              style={styles.input}
              placeholder="State"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View style={styles.rowCell}>
            <Text style={styles.label}>ZIP</Text>
            <TextInput
              value={form.zip}
              onChangeText={(value) => updateField('zip', value)}
              style={styles.input}
              placeholder="ZIP"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>Country</Text>
        <TextInput
          value={form.country}
          onChangeText={(value) => updateField('country', value)}
          style={styles.input}
          placeholder="US"
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Save as default address</Text>
          <Switch value={saveAsDefault} onValueChange={setSaveAsDefault} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Address</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(scale: number) {
  return StyleSheet.create({
    loadingRoot: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
    },
    root: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10 * scale,
      paddingHorizontal: 16 * scale,
      paddingBottom: 10 * scale,
    },
    backButton: {
      width: 36 * scale,
      height: 36 * scale,
      borderRadius: 18 * scale,
      backgroundColor: '#e2e8f0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22 * scale,
      fontWeight: '800',
      color: '#0f172a',
    },
    content: {
      paddingHorizontal: 16 * scale,
      paddingBottom: 24 * scale,
      gap: 8 * scale,
    },
    label: {
      marginTop: 6 * scale,
      fontSize: 13 * scale,
      fontWeight: '600',
      color: '#334155',
    },
    input: {
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 12 * scale,
      paddingHorizontal: 12 * scale,
      paddingVertical: 11 * scale,
      backgroundColor: '#fff',
      fontSize: 15 * scale,
      color: '#0f172a',
    },
    row: {
      flexDirection: 'row',
      gap: 10 * scale,
    },
    rowCell: {
      flex: 1,
    },
    toggleRow: {
      marginTop: 8 * scale,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10 * scale,
    },
    toggleText: {
      fontSize: 14 * scale,
      color: '#0f172a',
      fontWeight: '600',
    },
    errorText: {
      color: '#dc2626',
      fontSize: 13 * scale,
      marginBottom: 4 * scale,
    },
    warningText: {
      color: '#b45309',
      fontSize: 13 * scale,
      marginBottom: 4 * scale,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      backgroundColor: '#fff',
      paddingHorizontal: 16 * scale,
      paddingTop: 10 * scale,
    },
    saveButton: {
      backgroundColor: '#111322',
      borderRadius: 14 * scale,
      paddingVertical: 15 * scale,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveText: {
      color: '#fff',
      fontSize: 16 * scale,
      fontWeight: '700',
    },
  });
}
