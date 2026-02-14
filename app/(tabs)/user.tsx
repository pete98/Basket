import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { isAuth0Configured } from '@/lib/config/auth0';
import { useAuthGuard } from '@/hooks/use-auth-guard';

const accountActions = [
  {
    title: 'Payment Methods',
    description: 'Visa •••• 3941',
    icon: 'card-outline',
    tint: '#EDF6FF',
  },
  {
    title: 'Saved Store',
    description: '2 delivery locations',
    icon: 'home-outline',
    tint: '#F5F0FF',
    route: '/find-store',
  },
  {
    title: 'Security',
    description: 'Password & sign-in options',
    icon: 'shield-checkmark-outline',
    tint: '#FFF6ED',
  },
];

const supportOptions = [
  {
    title: 'Help Center',
    description: 'FAQs and live chat',
    icon: 'chatbubbles-outline',
    tint: '#E8FBF1',
  },
  {
    title: 'Order History',
    description: 'Track or reorder past items',
    icon: 'time-outline',
    tint: '#E9F2FF',
  },
];

export default function UserProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const { clearSession, user, isLoading } = useAuth0();
  const { isLoggedIn, openLogin } = useAuthGuard();
  const [isProcessing, setIsProcessing] = useState(false);
  const configReady = isAuth0Configured;

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
      setIsProcessing(false);
    }
  }, [clearSession]);

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
        contentContainerStyle={styles.contentContainer}
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
            {isLoggedIn && (
              <View style={styles.badge}>
                <Ionicons
                  name="star"
                  size={14}
                  color="#FFB100"
                  style={styles.badgeIcon}
                />
                <Text style={styles.badgeText}>Premium member</Text>
              </View>
            )}
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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Authentication</Text>
          {!isLoggedIn && (
            <Text style={styles.authHint}>
              Log in to manage your account settings and saved info.
            </Text>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.authButton,
              isLoggedIn && styles.authButtonSecondary,
              pressed && styles.rowPressed,
            ]}
            onPress={
              configReady ? (isLoggedIn ? handleLogout : handleLogin) : undefined
            }
            disabled={!configReady || isLoading || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator
                size="small"
                color={isLoggedIn ? '#1C1C1E' : '#fff'}
              />
            ) : (
              <Text
                style={[
                  styles.authButtonText,
                  isLoggedIn && styles.authButtonTextSecondary,
                  !configReady && styles.authButtonTextSecondary,
                ]}
              >
                {configReady ? (isLoggedIn ? 'Log out' : 'Log in') : 'Configure Auth0'}
              </Text>
            )}
          </Pressable>
        </View>

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
          </View>
        )}

        {isLoggedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Preferences</Text>
            <View style={[styles.preferenceRow, styles.preferenceSpacing]}>
              <View>
                <Text style={styles.rowTitle}>Push Notifications</Text>
                <Text style={styles.rowSubtitle}>Updates for deliveries</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                thumbColor={pushEnabled ? '#fff' : '#f4f4f5'}
                trackColor={{ false: '#d4d7e1', true: '#4CAF50' }}
              />
            </View>
            <View style={[styles.preferenceRow, styles.preferenceSpacing]}>
              <View>
                <Text style={styles.rowTitle}>Promotions</Text>
                <Text style={styles.rowSubtitle}>Personalized deals & tips</Text>
              </View>
              <Switch
                value={promoEnabled}
                onValueChange={setPromoEnabled}
                thumbColor={promoEnabled ? '#fff' : '#f4f4f5'}
                trackColor={{ false: '#d4d7e1', true: '#FF7849' }}
              />
            </View>
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
              ]}>
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
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  authButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  authButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  authButtonTextSecondary: {
    color: '#1C1C1E',
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
