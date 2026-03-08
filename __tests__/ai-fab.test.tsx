import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AIFab } from '@/components/ai/fab';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  mockPush.mockReset();
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: 'Medium' },
}));

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(JSON.stringify({ x: 10, y: 20 })),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Reanimated + RNGH mocks for tests
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Animated = Object.assign(
    React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />),
    { View }
  );

  return {
    __esModule: true,
    default: Animated,
    runOnJS: (fn: (...args: any[]) => unknown) => fn,
    useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
    useSharedValue: <T,>(value: T) => ({ value }),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown, _config?: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const tapEndHandlers: Array<(event: unknown, success: boolean) => void> = [];

  function createPanBuilder() {
    return {
      hitSlop: () => createPanBuilder(),
      minDistance: () => createPanBuilder(),
      onStart: () => createPanBuilder(),
      onChange: () => createPanBuilder(),
      onEnd: () => createPanBuilder(),
    };
  }

  function createTapBuilder() {
    return {
      maxDuration: () => createTapBuilder(),
      maxDeltaX: () => createTapBuilder(),
      maxDeltaY: () => createTapBuilder(),
      onEnd: (handler?: (event: unknown, success: boolean) => void) => {
        if (handler) tapEndHandlers.push(handler);
        return createTapBuilder();
      },
    };
  }

  function createLongPressBuilder() {
    return {
      minDuration: () => createLongPressBuilder(),
      maxDistance: () => createLongPressBuilder(),
      onEnd: () => createLongPressBuilder(),
    };
  }

  return {
    Gesture: {
      Pan: () => createPanBuilder(),
      Tap: () => createTapBuilder(),
      LongPress: () => createLongPressBuilder(),
      Race: (...gestures: any[]) => gestures,
      Simultaneous: (_a: any, _b: any) => ({}),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => {
      const child = React.Children.only(children);
      const testId = child.props?.testID;
      const handlerIndex = testId === 'ai-fab-indicator' ? 1 : 0;
      return React.cloneElement(child, {
        onResponderRelease: () => tapEndHandlers[handlerIndex]?.({}, true),
      });
    },
  };
});

describe('AIFab', () => {
  it('navigates on tap and triggers haptics', async () => {
    const { getByTestId } = render(<AIFab />);
    const fab = getByTestId('ai-fab');
    fireEvent(fab, 'onResponderRelease'); // fallback event in mocked env

    await waitFor(() => {
      const { impactAsync } = require('expo-haptics');
      expect(impactAsync).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/ai-modal',
        params: {
          left: expect.any(String),
          top: expect.any(String),
        },
      });
    });
  });

  it('restores position from storage on mount (calls getItem)', async () => {
    const { getItemAsync } = require('expo-secure-store');
    render(<AIFab />);
    await waitFor(() => {
      expect(getItemAsync).toHaveBeenCalledWith('ai_fab_position_v1');
    });
  });
});




