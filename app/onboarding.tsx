import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');

  const handleGetStarted = () => {
    // For now just go back to the main app
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Let&apos;s get to know you</Text>
          <Text style={styles.subtitle}>
            A few quick details so we can tailor deals, recommendations, and delivery options just for you.
          </Text>

          <View style={styles.card}>
            <View style={styles.formRow}>
              <View style={styles.field}>
                <Text style={styles.label}>First name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#9ca3af" />
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Jane"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Last name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-circle-outline" size={18} color="#9ca3af" />
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Doe"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#9ca3af" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.field}>
                <Text style={styles.label}>Phone</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color="#9ca3af" />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="(555) 000-0000"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    returnKeyType="next"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Birth date</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
                  <TextInput
                    value={birthDate}
                    onChangeText={setBirthDate}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={18} color="#9ca3af" />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street, city, state"
                  placeholderTextColor="#9ca3af"
                  style={[styles.input, styles.inputMultiline]}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.benefitsRow}>
              <View style={styles.benefitItem}>
                <Ionicons name="pricetag-outline" size={18} color="#f97316" />
                <Text style={styles.benefitText}>Personalized deals</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="time-outline" size={18} color="#f97316" />
                <Text style={styles.benefitText}>Faster checkout</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="bicycle-outline" size={18} color="#f97316" />
                <Text style={styles.benefitText}>Smarter delivery</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Save &amp; continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(15,23,42,0.8)',
    marginBottom: 18,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 4,
  },
  inputMultiline: {
    minHeight: 64,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginTop: 8,
    marginBottom: 12,
  },
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#f9fafb',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingVertical: 14,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(15,23,42,0.85)',
  },
});
