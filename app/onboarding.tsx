import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuth0 } from 'react-native-auth0';
import { getStoresByZip } from '@/lib/api/stores';
import { createUser, setActiveStore } from '@/lib/api/users';
import { Store } from '@/lib/types/api';
import { LocationOption, useLocation } from '@/contexts/location-context';

const FIELD_KEYS = {
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  birthDate: 'birthDate',
  address: 'address',
} as const;

type Step = 'profile' | 'address';

const PROFILE_DRAFT_KEY = 'pending_user_profile';
const ACCESS_TOKEN_KEY = 'auth0_access_token';

const decodeJwtPayload = (token: string) => {
  const payload = token.split('.')[1];
  if (!payload) return null;
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  if (typeof globalThis.atob !== 'function') return null;
  try {
    return JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
  } catch (error) {
    console.warn('Unable to decode idToken', error);
    return null;
  }
};

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 375, 0.9), 1.15);
  const styles = useMemo(() => createStyles(scale), [scale]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailLocked, setEmailLocked] = useState(false);
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [step, setStep] = useState<Step>('profile');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [storeResults, setStoreResults] = useState<Store[]>([]);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { selectLocation } = useLocation();
  const { getCredentials } = useAuth0();
  const hideFooter = isKeyboardVisible || focusedField !== null;

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const month = digits.slice(0, 2);
    const day = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    if (digits.length <= 2) return month;
    if (digits.length <= 4) return `${month}/${day}`;
    return `${month}/${day}/${year}`;
  };

  const handleBirthDateChange = (value: string) => {
    setBirthDate(formatBirthDate(value));
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6, 10);
    if (digits.length <= 3) return area;
    if (digits.length <= 6) return `(${area}) ${prefix}`;
    return `(${area}) ${prefix}-${line}`;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneNumber(value));
  };

  const formatPhoneForApi = (value: string) => value.replace(/\D/g, '');

  const formatBirthDateForApi = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8) return '';
    const month = digits.slice(0, 2);
    const day = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    return `${year}-${month}-${day}`;
  };

  const persistProfileDraft = async () => {
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: formatPhoneForApi(phone),
      birthDate: formatBirthDateForApi(birthDate),
    };
    try {
      await SecureStore.setItemAsync(PROFILE_DRAFT_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to save profile draft', error);
    }
  };

  useEffect(() => {
    if (step !== 'address') return;
    const zip = address.trim();
    if (zip.length < 5) {
      setStoreResults([]);
      setStoreError(null);
      setStoreLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setStoreLoading(true);
      setStoreError(null);
      try {
        const results = await getStoresByZip({ zip, signal: controller.signal });
        setStoreResults(results);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setStoreError(error instanceof Error ? error.message : 'Unable to load stores.');
        setStoreResults([]);
      } finally {
        setStoreLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [address, step]);

  useEffect(() => {
    if (selectedStoreId === null) return;
    const stillVisible = storeResults.some((store) => store.id === selectedStoreId);
    if (!stillVisible) {
      setSelectedStoreId(null);
    }
  }, [selectedStoreId, storeResults]);

  useEffect(() => {
    let isActive = true;
    const loadEmailFromIdToken = async () => {
      try {
        const credentials = await getCredentials();
        const idToken = credentials?.idToken;
        if (!idToken) return;
        const decoded = decodeJwtPayload(idToken);
        if (isActive && decoded && typeof decoded.email === 'string') {
          setEmail(decoded.email);
          setEmailLocked(true);
        }
      } catch (error) {
        console.warn('Unable to read email from idToken', error);
      }
    };
    loadEmailFromIdToken();
    return () => {
      isActive = false;
    };
  }, [getCredentials]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);


  const formatStoreAddress = (store: Store) => {
    const streetLine = store.street2 ? `${store.street}, ${store.street2}` : store.street;
    return `${streetLine}, ${store.city}, ${store.state} ${store.zip}`;
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStoreId(store.id);
  };

  const handleGetStarted = async () => {
    if (step === 'profile') {
      void persistProfileDraft();
      setFocusedField(null);
      setStep('address');
      return;
    }

    void persistProfileDraft();
    if (isSaving) return;
    setIsSaving(true);

    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (!accessToken) {
        console.warn('Missing access token for onboarding save');
        return;
      }

      const draft = await SecureStore.getItemAsync(PROFILE_DRAFT_KEY);
      const parsedDraft = draft ? (JSON.parse(draft) as Record<string, unknown>) : {};
      const payload = {
        firstName: String(parsedDraft.firstName ?? firstName).trim(),
        lastName: String(parsedDraft.lastName ?? lastName).trim(),
        phone: String(parsedDraft.phone ?? formatPhoneForApi(phone)).trim(),
        birthDate: String(parsedDraft.birthDate ?? formatBirthDateForApi(birthDate)).trim(),
        email: String(parsedDraft.email ?? email).trim(),
      };

      const createdUser = await createUser(accessToken, payload);
      const userId =
        typeof (createdUser as { id?: number | string }).id !== 'undefined'
          ? (createdUser as { id: number | string }).id
          : undefined;
      if (!userId) {
        console.warn('User id missing from create user response');
        return;
      }

      if (selectedStoreId !== null) {
        await setActiveStore(userId, accessToken, selectedStoreId);
      }
    } catch (error) {
      console.warn('Failed to save onboarding profile', error);
      return;
    } finally {
      setIsSaving(false);
    }

    if (selectedStoreId !== null) {
      const selectedStore = storeResults.find((store) => store.id === selectedStoreId);
      if (selectedStore) {
        const location: LocationOption = {
          id: `store-${selectedStore.id}`,
          label: selectedStore.displayName,
          address: formatStoreAddress(selectedStore),
          zip: selectedStore.zip,
        };
        selectLocation(location);
      }
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top + 12 * scale,
            paddingBottom: isKeyboardVisible ? 0 : insets.bottom,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete your profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            isKeyboardVisible && styles.scrollContentKeyboard,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'profile' ? (
            <View style={styles.formCard}>
              <View style={styles.formStack}>
                <View style={styles.field}>
                  <Text style={styles.label}>First name</Text>
                  <View style={[styles.inputWrapper, focusedField === FIELD_KEYS.firstName && styles.inputWrapperFocused]}>
                    <Ionicons name="person-outline" size={20} color="#9ca3af" />
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Jane"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onFocus={() => setFocusedField(FIELD_KEYS.firstName)}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Last name</Text>
                  <View style={[styles.inputWrapper, focusedField === FIELD_KEYS.lastName && styles.inputWrapperFocused]}>
                    <Ionicons name="person-circle-outline" size={20} color="#9ca3af" />
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Doe"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onFocus={() => setFocusedField(FIELD_KEYS.lastName)}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[styles.inputWrapper, focusedField === FIELD_KEYS.email && styles.inputWrapperFocused]}>
                    <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@basket.com"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      editable={!emailLocked}
                      onFocus={() => setFocusedField(FIELD_KEYS.email)}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Phone</Text>
                  <View style={[styles.inputWrapper, focusedField === FIELD_KEYS.phone && styles.inputWrapperFocused]}>
                    <Ionicons name="call-outline" size={20} color="#9ca3af" />
                    <TextInput
                      value={phone}
                      onChangeText={handlePhoneChange}
                    placeholder="(555) 000-0000"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    onFocus={() => setFocusedField(FIELD_KEYS.phone)}
                    onBlur={() => setFocusedField(null)}
                  />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Birth date</Text>
                  <View style={[styles.inputWrapper, focusedField === FIELD_KEYS.birthDate && styles.inputWrapperFocused]}>
                    <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
                    <TextInput
                      value={birthDate}
                      onChangeText={handleBirthDateChange}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      keyboardType="numbers-and-punctuation"
                      returnKeyType="next"
                      onFocus={() => setFocusedField(FIELD_KEYS.birthDate)}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.addressCard}>
              <Text style={styles.addressTitle}>Find your Store</Text>
              <Text style={styles.addressSubtitle}>
                Enter your zip code to see the stores that can serve you.
              </Text>
              <View style={styles.field}>
                <Text style={styles.label}>Zip code</Text>
                <View style={[styles.inputWrapper, focusedField === FIELD_KEYS.address && styles.inputWrapperFocused]}>
                  <Ionicons name="location-outline" size={20} color="#9ca3af" />
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter your zipcode"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    keyboardType="number-pad"
                    onFocus={() => setFocusedField(FIELD_KEYS.address)}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
              <View style={styles.storeResults}>
                {storeLoading && <Text style={styles.helperText}>Searching for stores...</Text>}
                {!storeLoading && storeError && <Text style={styles.errorText}>{storeError}</Text>}
                {!storeLoading && !storeError && address.trim().length >= 5 && storeResults.length === 0 && (
                  <Text style={styles.helperText}>No active stores found for this ZIP.</Text>
                )}
                {storeResults.map((store) => (
                  <TouchableOpacity
                    key={store.id}
                    style={[
                      styles.storeCard,
                      selectedStoreId === store.id && styles.storeCardSelected,
                    ]}
                    onPress={() => handleStoreSelect(store)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.storeHeader}>
                      <Text style={styles.storeName}>{store.displayName}</Text>
                      {selectedStoreId === store.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                      )}
                    </View>
                    <Text style={styles.storeAddress}>{formatStoreAddress(store)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {!hideFooter && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted} activeOpacity={0.9}>
          <Text style={styles.primaryButtonText}>{step === 'profile' ? 'Continue' : 'Save profile'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (scale: number) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * scale,
    marginBottom: 12 * scale,
  },
  backButton: {
    width: 44 * scale,
    height: 44 * scale,
    borderRadius: 22 * scale,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20 * scale,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSpacer: {
    width: 44 * scale,
  },
  scrollContent: {
    paddingHorizontal: 20 * scale,
    paddingBottom: 32 * scale,
    gap: 18 * scale,
  },
  scrollContentKeyboard: {
    paddingBottom: 0,
  },
  formCard: {
    paddingHorizontal: 4 * scale,
    gap: 18 * scale,
  },
  addressCard: {
    paddingHorizontal: 4 * scale,
    gap: 16 * scale,
  },
  addressTitle: {
    fontSize: 26 * scale,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6 * scale,
  },
  addressSubtitle: {
    fontSize: 15 * scale,
    color: 'rgba(15,23,42,0.7)',
    marginBottom: 16 * scale,
  },
  formStack: {
    gap: 16 * scale,
  },
  field: {
    gap: 8 * scale,
  },
  label: {
    fontSize: 14 * scale,
    fontWeight: '600',
    color: '#475569',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22 * scale,
    paddingHorizontal: 16 * scale,
    paddingVertical: 14 * scale,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12 * scale,
  },
  inputWrapperFocused: {
    borderColor: '#f97316',
  },
  input: {
    flex: 1,
    fontSize: 17 * scale,
    color: '#0f172a',
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 80 * scale,
  },
  storeResults: {
    gap: 12 * scale,
  },
  storeCard: {
    padding: 14 * scale,
    borderRadius: 16 * scale,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  storeCardSelected: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8 * scale,
  },
  storeName: {
    fontSize: 16 * scale,
    fontWeight: '700',
    color: '#0f172a',
  },
  storeAddress: {
    marginTop: 4 * scale,
    fontSize: 14 * scale,
    color: '#475569',
  },
  helperText: {
    fontSize: 14 * scale,
    color: '#64748b',
  },
  errorText: {
    fontSize: 14 * scale,
    color: '#dc2626',
  },
  footer: {
    paddingHorizontal: 20 * scale,
    paddingTop: 18 * scale,
    backgroundColor: '#f9fafb',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingVertical: 18 * scale,
    gap: 8 * scale,
  },
  primaryButtonText: {
    fontSize: 18 * scale,
    fontWeight: '700',
    color: '#fff',
  },
});
