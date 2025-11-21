import { STATUS_BADGE_COLORS, STATUS_COLORS } from '@/constants/pantry';
import { PantryItem } from '@/lib/types/pantry';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface PantryItemCardProps {
  item: PantryItem;
  onPress?: () => void;
  onMenuPress?: () => void;
}

export function PantryItemCard({ item, onPress, onMenuPress }: PantryItemCardProps) {
  const statusColor = STATUS_COLORS[item.status];
  const badgeColors = STATUS_BADGE_COLORS[item.status];

  const getBadgeText = () => {
    if (item.status === 'low') return 'Low';
    if (item.status === 'expiring') return 'Expiring';
    if (item.status === 'expired') return 'Expired';
    return null;
  };

  const badgeText = getBadgeText();
  const showBadge = badgeText && (item.status === 'low' || item.status === 'expiring' || item.status === 'expired');

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        {showBadge && (
          <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.badgeText, { color: badgeColors.text }]}>{badgeText}</Text>
          </View>
        )}
        <Pressable
          style={styles.menuButton}
          onPress={(e) => {
            e.stopPropagation();
            onMenuPress?.();
          }}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.quantity}>
            {item.quantity} {item.quantityUnit || 'unit'}
            {item.quantity !== 1 ? 's' : ''}
          </Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  menuButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
    minHeight: 36,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantity: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

