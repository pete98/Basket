import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AIFab } from '@/components/ai/fab';

const pushMock = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  pushMock.mockReset();
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
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Gesture: {
      Pan: () => ({ hitSlop: () => ({ onChange: () => ({ onEnd: () => ({}) }) }) }),
      Tap: () => ({ maxDuration: () => ({ onEnd: () => ({}) }) }),
      Simultaneous: (_a: any, _b: any) => ({}),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
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
      expect(pushMock).toHaveBeenCalledWith({
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











