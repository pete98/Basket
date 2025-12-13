import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolate, interpolate, useAnimatedStyle } from 'react-native-reanimated';

function HeroCard({ item, progress, onAdd }) {
  const titleStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(progress.value, [0, 1], [18, 22], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.05], Extrapolate.CLAMP) },
    ],
  }));

  const captionStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(progress.value, [0, 1], [13.5, 15.5], Extrapolate.CLAMP),
    opacity: interpolate(progress.value, [0, 1], [0.9, 1], Extrapolate.CLAMP),
  }));

  const imageStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [180, 250], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.02], Extrapolate.CLAMP) },
    ],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.95, 1], Extrapolate.CLAMP) },
    ],
  }));

  const priceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [4, 0], Extrapolate.CLAMP) },
    ],
  }));

  const formattedPrice = typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price;

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.imageWrapper, imageStyle]}>
        <Image
          source={typeof item.image === 'string' ? { uri: item.image } : item.image}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.overlayTop} />
        <View style={styles.overlayBottom} />
        <View style={styles.tagRow}>
          <Text style={styles.tag}>For You</Text>
          <Text style={styles.spark}>✨</Text>
        </View>
      </Animated.View>

      <View style={styles.body}>
        <Animated.Text style={[styles.title, titleStyle]} numberOfLines={2}>
          {item.title}
        </Animated.Text>
        <Animated.Text style={[styles.caption, captionStyle]} numberOfLines={2}>
          {item.caption}
        </Animated.Text>

        <View style={styles.footer}>
          <Animated.View style={[styles.priceChip, priceStyle]}>
            <Text style={styles.priceText}>{formattedPrice}</Text>
            <Text style={styles.priceMeta}>Curated for today</Text>
          </Animated.View>
          <Animated.View style={buttonStyle}>
            <Pressable
              style={styles.cta}
              onPress={() => onAdd?.(item)}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.ctaText}>Add</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

export default memo(HeroCard);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
  },
  imageWrapper: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.2)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  tagRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  spark: {
    fontSize: 12,
  },
  body: {
    marginTop: 14,
    gap: 8,
  },
  title: {
    color: '#0f172a',
    fontWeight: '800',
    lineHeight: 26,
  },
  caption: {
    color: '#475467',
    lineHeight: 20,
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  priceMeta: {
    fontSize: 12,
    color: '#475467',
  },
  cta: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 3,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
