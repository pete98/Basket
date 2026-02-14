import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { getUserByAuth0, setActiveStore } from '@/lib/api/users';
import { Store } from '@/lib/types/api';
import { LocationOption, useLocation } from '@/contexts/location-context';

const FIELD_KEYS = {
  address: 'address',
} as const;

const ACCESS_TOKEN_KEY = 'auth0_access_token';

export default function FindStoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 375, 0.9), 1.15);
  const styles = useMemo(() => createStyles(scale), [scale]);

  const [address, setAddress] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [storeResults, setStoreResults] = useState<Store[]>([]);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { getCredentials } = useAuth0();
  const { selectLocation } = useLocation();
  const hideFooter = isKeyboardVisible || focusedField !== null;

  useEffect(() => {
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
  }, [address]);

  useEffect(() => {
    if (selectedStoreId === null) return;
    const stillVisible = storeResults.some((store) => store.id === selectedStoreId);
    if (!stillVisible) {
      setSelectedStoreId(null);
    }
  }, [selectedStoreId, storeResults]);

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
    setStoreError(null);
  };

  const handleSaveStore = async () => {
    if (isSaving) return;
    if (selectedStoreId === null) {
      setStoreError('Select a store to continue.');
      return;
    }

    setIsSaving(true);
    setStoreError(null);

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
        setStoreError('Missing access token. Please log in again.');
        return;
      }

      const userRecord = await getUserByAuth0(accessToken);
      const userId =
        typeof (userRecord as { id?: number | string }).id !== 'undefined'
          ? (userRecord as { id: number | string }).id
          : undefined;
      if (!userId) {
        setStoreError('Unable to identify user profile.');
        return;
      }

      await setActiveStore(userId, accessToken, selectedStoreId);

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

      router.back();
    } catch (error) {
      setStoreError(error instanceof Error ? error.message : 'Unable to save store.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveDisabled = isSaving || selectedStoreId === null;

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

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.addressCard}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={18} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.addressTitle}>Find your Store</Text>
            </View>
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
        </ScrollView>

        {!hideFooter && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryButton, saveDisabled && styles.primaryButtonDisabled]}
              onPress={handleSaveStore}
              activeOpacity={0.9}
              disabled={saveDisabled}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save store</Text>
              )}
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
    scrollContent: {
      paddingHorizontal: 20 * scale,
      paddingBottom: 32 * scale,
      gap: 18 * scale,
    },
    backButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10 * scale,
      paddingVertical: 8 * scale,
      borderRadius: 999,
      backgroundColor: '#e2e8f0',
    },
    addressCard: {
      paddingHorizontal: 4 * scale,
      gap: 16 * scale,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10 * scale,
    },
    addressTitle: {
      fontSize: 26 * scale,
      fontWeight: '800',
      color: '#0f172a',
    },
    addressSubtitle: {
      fontSize: 15 * scale,
      color: 'rgba(15,23,42,0.7)',
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
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      fontSize: 18 * scale,
      fontWeight: '700',
      color: '#fff',
    },
  });
