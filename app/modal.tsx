import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocation, LocationOption } from '@/contexts/location-context';

const currentLocationPlaceholder: LocationOption = {
  id: 'current-location',
  label: 'Current Location',
  address: 'Detected from device GPS',
  zip: 'Auto-detect',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LocationModal() {
  const router = useRouter();
  const { savedLocations, selectedLocation, selectLocation } = useLocation();
  const [manualZip, setManualZip] = useState('');
  const [showManualZipInput, setShowManualZipInput] = useState(false);

  const handleAddressSelect = (location: LocationOption) => {
    selectLocation(location);
    router.back();
  };

  const handleManualZipSubmit = () => {
    const zip = manualZip.trim();
    if (!zip) return;
    handleAddressSelect({
      id: `manual-${zip}`,
      label: 'Custom ZIP',
      address: `ZIP ${zip}`,
      zip,
    });
    setShowManualZipInput(false);
  };

  const handleUseCurrentLocation = () => {
    selectLocation(currentLocationPlaceholder);
    router.back();
  };

  const addressList = useMemo(() => savedLocations, [savedLocations]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.backdrop} />
      <View style={styles.bottomSheet}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>
              Choose delivery area
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Tap an address or add a new ZIP to swap warehouses.
            </ThemedText>
          </View>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={addressList}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.horizontalDivider} />}
          contentContainerStyle={styles.horizontalListContent}
          style={styles.addressList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.addressCard,
                selectedLocation.id === item.id && styles.addressCardSelected,
              ]}
              onPress={() => handleAddressSelect(item)}
            >
              <View>
                <ThemedText type="subtitle" style={styles.addressLabel}>
                  {item.label}
                </ThemedText>
                <ThemedText style={styles.addressText}>{item.address}</ThemedText>
              </View>
              <View style={styles.zipChip}>
                <ThemedText style={styles.addressZip}>{item.zip}</ThemedText>
              </View>
            </TouchableOpacity>
          )}
        />

        <View style={styles.manualSection}>
          <ThemedText type="subtitle" style={styles.manualTitle}>
            More options
          </ThemedText>
          <View style={styles.manualRow}>
            {showManualZipInput ? (
              <>
                <TextInput
                  style={styles.zipInput}
                  placeholder="Enter US ZIP code"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  value={manualZip}
                  onChangeText={setManualZip}
                  maxLength={10}
                />
                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    manualZip.trim() === '' && styles.applyButtonDisabled,
                  ]}
                  onPress={handleManualZipSubmit}
                  disabled={manualZip.trim() === ''}
                >
                  <ThemedText type="link" style={styles.applyButtonText}>
                    Apply
                  </ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setShowManualZipInput(true)}>
                <ThemedText style={styles.manualLink}>Find with US ZIP code</ThemedText>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation}>
            <Ionicons name="locate" size={20} color="#2563eb" style={styles.locationIcon} />
            <ThemedText style={styles.locationButtonText}>Use my current location</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    height: SCREEN_HEIGHT * 0.5,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 14,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  horizontalListContent: {
    paddingVertical: 10,
  },
  addressList: {
    flexGrow: 0,
  },
  addressCard: {
    width: 190,
    height: 190,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
  },
  addressCardSelected: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: '#4b5563',
  },
  addressZip: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  zipChip: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  horizontalDivider: {
    width: 8,
  },
  manualSection: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  zipInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    marginLeft: 10,
  },
  applyButtonDisabled: {
    opacity: 0.4,
  },
  applyButtonText: {
    color: '#fff',
  },
  locationButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 8,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
});
