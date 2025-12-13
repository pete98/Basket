import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolate, interpolate, useAnimatedStyle } from 'react-native-reanimated';

function MediumCard({ item, progress, onAdd }) {
  const titleStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(progress.value, [0, 1], [16, 18], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.03], Extrapolate.CLAMP) },
    ],
  }));

  const captionStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(progress.value, [0, 1], [13, 14], Extrapolate.CLAMP),
    opacity: interpolate(progress.value, [0, 1], [0.9, 1], Extrapolate.CLAMP),
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.94, 1], Extrapolate.CLAMP) },
    ],
  }));

  const price = typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Image
          source={typeof item.image === 'string' ? { uri: item.image } : item.image}
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={styles.meta}>
          <Animated.Text style={[styles.title, titleStyle]} numberOfLines={2}>
            {item.title}
          </Animated.Text>
          <Animated.Text style={[styles.caption, captionStyle]} numberOfLines={2}>
            {item.caption}
          </Animated.Text>
          <View style={styles.metaRow}>
            <Text style={styles.price}>{price}</Text>
            <Animated.View style={buttonStyle}>
              <Pressable
                style={styles.addButton}
                onPress={() => onAdd?.(item)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default memo(MediumCard);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  thumb: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  meta: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    color: '#0f172a',
    fontWeight: '700',
    lineHeight: 22,
  },
  caption: {
    color: '#475467',
    marginTop: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  price: {
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 15,
  },
  addButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addText: {
    color: '#fff',
    fontWeight: '700',
  },
});
