import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FAB_SIZE = 56;
const MARGIN = 12;
const STORAGE_KEY = 'ai_fab_position_v1';
const VISIBILITY_KEY = 'ai_fab_visible_v1';
const INDICATOR_SIZE = 12;

interface StoredPosition {
  x: number;
  y: number;
}

type ThemeName = keyof typeof Colors;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export const AIFab: React.FC = React.memo(function AIFab() {
  const router = useRouter();
  const colorScheme: ThemeName = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

  const backgroundColor = useMemo(() => Colors[colorScheme].tint, [colorScheme]);
  const iconColor = useMemo(() => (colorScheme === 'dark' ? '#111' : '#fff'), [colorScheme]);

  // Shared values for translation
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  // Shared value for visibility
  const isVisible = useSharedValue(true);
  const opacity = useSharedValue(1);

  // Bounds computed at runtime using window size via onLayout to avoid stale Dimensions
  const bounds = useSharedValue({ minX: 0, maxX: 0, minY: 0, maxY: 0 });

  const handleNavigate = useCallback(
    (left: number, top: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      router.push({
        pathname: '/ai-modal',
        params: {
          left: Math.round(left).toString(),
          top: Math.round(top).toString(),
        },
      });
    },
    [router]
  );

  // Restore last position and visibility
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const available = await SecureStore.isAvailableAsync();
        if (!available) return;
        
        // Restore position
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const parsed: StoredPosition = JSON.parse(raw);
          if (isMounted && typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
            translateX.value = parsed.x;
            translateY.value = parsed.y;
          }
        }
        
        // Restore visibility
        const visibilityRaw = await SecureStore.getItemAsync(VISIBILITY_KEY);
        if (visibilityRaw !== null) {
          const shouldBeVisible = visibilityRaw === 'true';
          if (isMounted) {
            isVisible.value = shouldBeVisible;
            opacity.value = shouldBeVisible ? 1 : 0;
          }
        }
      } catch {}
    })();
    return () => {
      isMounted = false;
    };
  }, [translateX, translateY, isVisible, opacity]);

  const savePosition = useCallback((x: number, y: number) => {
    (async () => {
      try {
        const available = await SecureStore.isAvailableAsync();
        if (!available) return;
        await SecureStore.setItemAsync(
          STORAGE_KEY,
          JSON.stringify({ x, y } satisfies StoredPosition)
        );
      } catch {}
    })();
  }, []);

  const saveVisibility = useCallback((visible: boolean) => {
    (async () => {
      try {
        const available = await SecureStore.isAvailableAsync();
        if (!available) return;
        await SecureStore.setItemAsync(VISIBILITY_KEY, visible.toString());
      } catch {}
    })();
  }, []);

  const handleHide = useCallback(() => {
    isVisible.value = false;
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(saveVisibility)(false);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [isVisible, opacity, saveVisibility]);

  const handleShow = useCallback(() => {
    isVisible.value = true;
    opacity.value = withTiming(1, { duration: 200 }, (finished) => {
      if (finished) runOnJS(saveVisibility)(true);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [isVisible, opacity, saveVisibility]);

  const pan = Gesture.Pan()
    .hitSlop(10)
    .minDistance(8)
    .onStart((_e) => {
      // noop; we use absolute translation, but ensuring gesture state initialized
    })
    .onChange((e) => {
      // Use absolute translation to avoid accumulating floating errors
      const nx = translateX.value + e.changeX;
      const ny = translateY.value + e.changeY;
      // Clamp while dragging to avoid overflowing values that could cause NaNs on spring
      const cx = clamp(nx, bounds.value.minX, bounds.value.maxX);
      const cy = clamp(ny, bounds.value.minY, bounds.value.maxY);
      translateX.value = cx;
      translateY.value = cy;
    })
    .onEnd(() => {
      // Final clamp and persist safely
      const clampedX = clamp(translateX.value, bounds.value.minX, bounds.value.maxX);
      const clampedY = clamp(translateY.value, bounds.value.minY, bounds.value.maxY);
      const isFiniteXY = Number.isFinite(clampedX) && Number.isFinite(clampedY);
      translateX.value = withSpring(clampedX, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(clampedY, { damping: 15, stiffness: 200 }, (finished) => {
        if (finished && isFiniteXY) runOnJS(savePosition)(clampedX, clampedY);
      });
    });

  const tap = Gesture.Tap()
    .maxDuration(300)
    .maxDeltaX(15)
    .maxDeltaY(15)
    .onEnd((_e, success) => {
      if (success && isVisible.value) {
        runOnJS(handleNavigate)(translateX.value, translateY.value);
      }
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .maxDistance(10)
    .onEnd(() => {
      if (isVisible.value) {
        runOnJS(handleHide)();
      }
    });

  // Use Race so long press takes priority if user holds still, otherwise pan/tap work
  const composed = Gesture.Race(
    longPress,
    Gesture.Simultaneous(pan, tap)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
    pointerEvents: isVisible.value ? 'auto' : 'none',
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: isVisible.value ? 0 : 1,
    pointerEvents: isVisible.value ? 'none' : 'auto',
  }));

  const TAB_BAR_GAP = 92;

  const indicatorPositionStyle = useMemo(() => ({
    bottom: MARGIN + TAB_BAR_GAP + insets.bottom, // Above tab bar with safe area
    right: MARGIN + insets.right,
  }), [insets.bottom, insets.right]);

  const onContainerLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    const minX = MARGIN;
    const maxX = width - FAB_SIZE - MARGIN;
    // Keep above tab bar: add bottom inset and extra offset
    const extraBottomGap = TAB_BAR_GAP; // approximate tab bar height space
    const minY = MARGIN + insets.top;
    const maxY = height - FAB_SIZE - Math.max(insets.bottom + extraBottomGap, 0);
    bounds.value = { minX, maxX, minY, maxY };

    // If at initial origin (0,0), place default bottom-right
    const isAtOrigin = translateX.value === 0 && translateY.value === 0;
    if (isAtOrigin) {
      translateX.value = maxX;
      translateY.value = maxY;
    }
  }, [bounds, insets.bottom, insets.top, translateX, translateY]);

  return (
    <View style={styles.container} onLayout={onContainerLayout} pointerEvents="box-none">
      <GestureDetector gesture={composed}>
        <Animated.View
          testID="ai-fab"
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ask AI"
          style={[styles.fab, animatedStyle, { backgroundColor }]}
        >
          <MaterialIcons name="auto-awesome" size={24} color={iconColor} />
        </Animated.View>
      </GestureDetector>
      
      {/* Hidden indicator - tap to restore */}
      <Animated.View style={[styles.indicator, indicatorStyle, indicatorPositionStyle]}>
        <GestureDetector gesture={Gesture.Tap().onEnd(() => runOnJS(handleShow)())}>
          <Animated.View
            testID="ai-fab-indicator"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Show AI button"
            style={[styles.indicatorDot, { backgroundColor }]}
          />
        </GestureDetector>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    // Elevation (Android)
    elevation: 6,
  },
  indicator: {
    position: 'absolute',
    width: INDICATOR_SIZE + 8,
    height: INDICATOR_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    // Elevation (Android)
    elevation: 4,
  },
});

export default AIFab;
