import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useForYouFeed } from '@/hooks/useForYouFeed';

type FeedItem = {
  id: string;
  title: string;
  caption: string;
  price: number;
  image: any;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const H_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP) / 2;
const CARD_IMAGE_SIZE = CARD_WIDTH;
const META_HEIGHT = 110;

function StickyHeader({ insetTop }: { insetTop: number }) {
  return (
    <View style={[styles.header, { paddingTop: insetTop + 12 }]}>
      <Text style={styles.headerTitle}>For You</Text>
      <View style={styles.headerAccent}>
        <View style={[styles.accentLine, { backgroundColor: '#feda77' }]} />
        <View style={[styles.accentLine, { backgroundColor: '#fa7e1e' }]} />
        <View style={[styles.accentLine, { backgroundColor: '#d62976' }]} />
      </View>
    </View>
  );
}

function FeedPeek({ heroPreview }: { heroPreview: any }) {
  return (
    <View style={styles.previewRow}>
      <Image source={heroPreview} style={styles.previewImage} />
      <View style={styles.previewCopy}>
        <Text style={styles.previewTitle}>Fresh drop</Text>
        <Text style={styles.previewCaption}>Carousel-worthy baskets, IG style.</Text>
      </View>
    </View>
  );
}

function ForYouProductCard({ item, onAdd }: { item: FeedItem; onAdd?: (item: FeedItem) => void }) {
  const source = typeof item.image === 'string' ? { uri: item.image } : item.image;

  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        {source ? (
          <Image source={source} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No image</Text>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.titleText} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.caption} numberOfLines={2}>
          {item.caption}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          <Text style={styles.cta} onPress={() => onAdd?.(item)}>
            Add
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ForYouTab() {
  const { items, refresh, loadMore, isRefreshing, isFetchingMore, heroPreview } = useForYouFeed();
  const insets = useSafeAreaInsets();

  const handleAdd = useCallback((item: FeedItem) => {
    console.log('Add tapped:', item.title);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => <ForYouProductCard item={item} onAdd={handleAdd} />,
    [handleAdd],
  );

  return (
    <View style={styles.container}>
      <StickyHeader insetTop={insets.top} />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshing={isRefreshing}
        onRefresh={refresh}
        ListHeaderComponent={<FeedPeek heroPreview={heroPreview} />}
        ListFooterComponent={
          isFetchingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={styles.footerCopy}>Loading more recs...</Text>
            </View>
          ) : (
            <View style={styles.footerPad} />
          )
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfcfb',
  },
  header: {
    backgroundColor: '#fcfcfb',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111',
  },
  headerAccent: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  accentLine: {
    flex: 1,
    height: 3,
    borderRadius: 999,
  },
  previewRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  previewCopy: {
    flex: 1,
  },
  previewTitle: {
    color: '#111',
    fontWeight: '700',
    fontSize: 14,
  },
  previewCaption: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: 20,
  },
  columnWrapper: {
    columnGap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: CARD_GAP,
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  imageWrap: {
    height: CARD_IMAGE_SIZE,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f5f7',
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  meta: {
    padding: 18,
    gap: 6,
    minHeight: META_HEIGHT,
  },
  titleText: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
  },
  caption: {
    color: '#475467',
    fontSize: 14,
  },
  footerRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    color: '#111',
    fontWeight: '700',
    fontSize: 16,
  },
  cta: {
    color: '#d62976',
    fontWeight: '700',
    fontSize: 15,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  footerCopy: {
    color: '#475467',
    fontSize: 13,
  },
  footerPad: {
    height: 12,
  },
});
