import { AddItemModal } from '@/components/pantry/add-item-modal';
import { PantryItemCard } from '@/components/pantry/pantry-item-card';
import { PANTRY_CATEGORIES, RECIPE_SUGGESTIONS } from '@/constants/pantry';
import { usePantry } from '@/contexts/pantry-context';
import { PantryItem } from '@/lib/types/pantry';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;
const CARD_GAP = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

export default function PantryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, removeItem, setCategory, setSearchQuery } = usePantry();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [menuItemId, setMenuItemId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let items = state.items;

    // Filter by category
    if (state.selectedCategory !== 'All') {
      if (state.selectedCategory === 'Running Low') {
        items = items.filter((item) => item.status === 'low' || item.quantity <= 2);
      } else if (state.selectedCategory === 'Expiring Soon') {
        items = items.filter((item) => item.status === 'expiring' || item.status === 'expired');
      } else {
        items = items.filter((item) => item.category === state.selectedCategory);
      }
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(query));
    }

    return items;
  }, [state.items, state.selectedCategory, state.searchQuery]);

  const metrics = useMemo(() => {
    const runningLow = state.items.filter((item) => item.status === 'low' || item.quantity <= 2).length;
    const expiringSoon = state.items.filter(
      (item) => item.status === 'expiring' || item.status === 'expired',
    ).length;

    return {
      total: state.items.length,
      runningLow,
      expiringSoon,
    };
  }, [state.items]);

  const aiSuggestion = useMemo(() => {
    if (state.items.length === 0) {
      return 'Add a few staples to unlock curated recipe ideas.';
    }
    const randomRecipe = RECIPE_SUGGESTIONS[Math.floor(Math.random() * RECIPE_SUGGESTIONS.length)];
    return `Pantry AI thinks you could make ${randomRecipe} with what you have.`;
  }, [state.items]);

  const hasActiveFilter = state.selectedCategory !== 'All' || state.searchQuery.trim().length > 0;

  const handleAddItem = () => {
    setEditingItem(null);
    setIsAddModalVisible(true);
  };

  const handleEditItem = (item: PantryItem) => {
    setEditingItem(item);
    setIsAddModalVisible(true);
    setMenuItemId(null);
  };

  const handleDeleteItem = (item: PantryItem) => {
    Alert.alert('Delete Item', `Are you sure you want to delete ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeItem(item.id);
          setMenuItemId(null);
        },
      },
    ]);
  };

  const handleMenuPress = (item: PantryItem) => {
    if (menuItemId === item.id) {
      setMenuItemId(null);
    } else {
      setMenuItemId(item.id);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('All');
  };

  const renderItem = ({ item }: { item: PantryItem }) => {
    const showMenu = menuItemId === item.id;
    return (
      <View style={styles.cardWrapper}>
        <PantryItemCard
          item={item}
          onPress={() => {
            setMenuItemId(null);
            handleEditItem(item);
          }}
          onMenuPress={() => handleMenuPress(item)}
        />
        {showMenu && (
          <View style={styles.menu}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                handleEditItem(item);
                setMenuItemId(null);
              }}
            >
              <Ionicons name="pencil" size={16} color="#666" />
              <Text style={styles.menuItemText}>Edit</Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => handleDeleteItem(item)}
            >
              <Ionicons name="trash" size={16} color="#FF3B30" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    if (state.items.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cube-outline" size={32} color="#0F172A" />
          </View>
          <Text style={styles.emptyStateTitle}>Build your premium pantry</Text>
          <Text style={styles.emptyStateSubtitle}>
            Add a few hero staples or scan your Instacart receipt to keep everything synced.
          </Text>
          <Pressable style={styles.emptyStateButton} onPress={handleAddItem}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.emptyStateButtonText}>Add first item</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyFilterState}>
        <Ionicons name="options-outline" size={24} color="#6B7280" />
        <Text style={styles.emptyFilterText}>No items match this view</Text>
        <Text style={styles.emptyFilterSubtext}>Adjust search or categories to discover more.</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.searchSection}>
        <BlurView intensity={80} tint="light" style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search organic staples, snacks, produce..."
            placeholderTextColor="#9CA3AF"
            value={state.searchQuery}
            onChangeText={setSearchQuery}
          />
          {state.searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={12}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </BlurView>
        <Pressable style={styles.voiceButton} onPress={handleAddItem} hitSlop={12}>
          <Ionicons name="barcode-outline" size={20} color="#0F172A" />
        </Pressable>
      </View>

      <View style={styles.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {PANTRY_CATEGORIES.map((category) => {
            const isActive = state.selectedCategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => setCategory(category)}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroTag}>
            <Ionicons name="sparkles" size={16} color="#0EA960" />
            <Text style={styles.heroTagText}>Pantry concierge</Text>
          </View>
          <Text style={styles.heroSyncText}>Updated just now</Text>
        </View>
        <Text style={styles.heroTitle}>A curated, connected pantry</Text>
        <Text style={styles.heroSubtitle}>
          Track freshness, restock cues, and Instacart deliveries in one fluid view.
        </Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{metrics.total}</Text>
            <Text style={styles.heroStatLabel}>Items tracked</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{metrics.runningLow}</Text>
            <Text style={styles.heroStatLabel}>Running low</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{metrics.expiringSoon}</Text>
            <Text style={styles.heroStatLabel}>Expiring soon</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <Pressable style={styles.primaryAction} onPress={handleAddItem}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.primaryActionText}>New item</Text>
          </Pressable>
        </View>
        <View style={styles.heroHelper}>
          <Ionicons name="sparkles-outline" size={16} color="#0EA960" />
          <Text style={styles.heroHelperText}>
            Need help? Tap the floating AI assistant to add items or manage inventory.
          </Text>
        </View>
      </View>

      <View style={styles.inventoryHeader}>
        <View>
          <Text style={styles.inventoryTitle}>Inventory</Text>
          <Text style={styles.inventorySubtitle}>{metrics.total} premium items curated</Text>
        </View>
        {hasActiveFilter && (
          <Pressable style={styles.resetFilters} onPress={handleResetFilters} hitSlop={8}>
            <Ionicons name="refresh" size={16} color="#0EA960" />
            <Text style={styles.resetFiltersText}>Reset filters</Text>
          </Pressable>
        )}
      </View>

      {state.items.length > 0 && (
        <Pressable style={styles.aiCard} onPress={() => router.push('/ai-modal')}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View style={styles.aiContent}>
            <Text style={styles.aiTitle}>Pantry intelligence</Text>
            <Text style={styles.aiSubtitle}>{aiSuggestion}</Text>
            <View style={styles.aiAction}>
              <Text style={styles.aiActionText}>Open curated ideas</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Add/Edit Modal */}
      <AddItemModal
        visible={isAddModalVisible}
        onClose={() => {
          setIsAddModalVisible(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  listHeader: {
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    marginTop: 28,
  },
  heroGlowOne: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 180,
    height: 180,
    backgroundColor: 'rgba(14,169,96,0.15)',
    borderRadius: 90,
    opacity: 0.5,
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -60,
    left: -20,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderRadius: 100,
    opacity: 0.6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(14,169,96,0.12)',
  },
  heroTagText: {
    color: '#0EA960',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  heroSyncText: {
    color: '#6B7280',
    fontSize: 13,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  heroStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#0EA960',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  heroHelper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  heroHelperText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  categorySection: {
    marginTop: 24,
  },
  categoryScroll: {
    gap: 12,
    paddingRight: 12,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#0EA960',
    borderColor: '#0EA960',
  },
  categoryText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 13,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  aiCard: {
    flexDirection: 'row',
    backgroundColor: '#0EA960',
    borderRadius: 26,
    padding: 20,
    marginTop: 24,
    alignItems: 'center',
    shadowColor: '#0EA960',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  aiIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiContent: {
    flex: 1,
  },
  aiTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  aiAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  aiActionText: {
    color: '#fff',
    fontWeight: '600',
  },
  inventoryHeader: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  inventorySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  resetFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14,169,96,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resetFiltersText: {
    color: '#0EA960',
    fontWeight: '600',
    fontSize: 12,
  },
  row: {
    justifyContent: 'space-between',
    columnGap: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    position: 'relative',
    marginTop: 16,
  },
  menu: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
    minWidth: 130,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 6,
    paddingTop: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: '#111827',
  },
  menuItemTextDanger: {
    color: '#DC2626',
  },
  emptyState: {
    marginTop: 24,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(14,169,96,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 20,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyStateButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0EA960',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyFilterState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFilterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyFilterSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});
