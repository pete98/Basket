import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export function AppShellSkeleton() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.logoLine, { opacity: pulse }]} />
        <Animated.View style={[styles.searchLine, { opacity: pulse }]} />
      </View>

      <View style={styles.body}>
        <Animated.View style={[styles.sectionTitle, { opacity: pulse }]} />
        <View style={styles.cardRow}>
          <Animated.View style={[styles.card, { opacity: pulse }]} />
          <Animated.View style={[styles.card, { opacity: pulse }]} />
        </View>
        <Animated.View style={[styles.sectionTitleShort, { opacity: pulse }]} />
        <Animated.View style={[styles.listItem, { opacity: pulse }]} />
        <Animated.View style={[styles.listItem, { opacity: pulse }]} />
        <Animated.View style={[styles.listItem, { opacity: pulse }]} />
      </View>

      <View style={styles.tabBar}>
        <Animated.View style={[styles.tabDot, { opacity: pulse }]} />
        <Animated.View style={[styles.tabDot, { opacity: pulse }]} />
        <Animated.View style={[styles.tabDot, { opacity: pulse }]} />
        <Animated.View style={[styles.tabDot, { opacity: pulse }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    gap: 12,
    marginBottom: 22,
  },
  logoLine: {
    width: 140,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  searchLine: {
    width: '100%',
    height: 42,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  body: {
    flex: 1,
    gap: 12,
  },
  sectionTitle: {
    width: 160,
    height: 18,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  sectionTitleShort: {
    width: 120,
    height: 18,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
    marginTop: 8,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    height: 92,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  listItem: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  tabBar: {
    height: 74,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabDot: {
    width: 34,
    height: 10,
    borderRadius: 99,
    backgroundColor: '#94a3b8',
  },
});
