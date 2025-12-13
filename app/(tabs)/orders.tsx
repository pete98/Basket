import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeaderBackground, { paddingTop: insets.top + 8 }]}>
        <View style={styles.pageHeaderContent}>
          <View>
            <Text style={styles.pageHeaderTitle}>Orders</Text>
            <Text style={styles.pageHeaderSubtitle}>No orders yet</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pageHeaderBackground: {
    backgroundColor: '#f97316',
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
  },
  pageHeaderContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pageHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  pageHeaderSubtitle: {
    fontSize: 14,
    color: '#ffe8d2',
    marginTop: 4,
  },
});
