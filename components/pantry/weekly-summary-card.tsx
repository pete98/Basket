import { usePantry } from '@/contexts/pantry-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function WeeklySummaryCard() {
  const { state } = usePantry();

  const metrics = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const itemsAddedThisWeek = state.items.filter((item) => {
      const addedDate = new Date(item.addedDate);
      return addedDate >= weekAgo;
    }).length;

    const itemsRunningLow = state.items.filter((item) => item.status === 'low' || item.quantity <= 2).length;

    // For consumed items, we'll track items that were removed (this would need additional tracking)
    // For now, we'll use a simple calculation based on items that might have been consumed
    const itemsConsumed = 0; // This would need to be tracked separately

    return {
      itemsAdded: itemsAddedThisWeek,
      itemsConsumed,
      itemsRunningLow,
    };
  }, [state.items]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Summary</Text>
      <View style={styles.metricsContainer}>
        <View style={styles.metric}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="add-circle" size={20} color="#047857" />
          </View>
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{metrics.itemsAdded}</Text>
            <Text style={styles.metricLabel}>Added</Text>
          </View>
        </View>

        <View style={styles.metric}>
          <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="remove-circle" size={20} color="#1E40AF" />
          </View>
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{metrics.itemsConsumed}</Text>
            <Text style={styles.metricLabel}>Consumed</Text>
          </View>
        </View>

        <View style={styles.metric}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="warning" size={20} color="#92400E" />
          </View>
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{metrics.itemsRunningLow}</Text>
            <Text style={styles.metricLabel}>Running Low</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricContent: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
});

