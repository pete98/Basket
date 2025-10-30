import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Easing,
  useWindowDimensions,
  Keyboard,
  KeyboardEvent,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AGENT_EVENTS, agentBus } from '@/lib/agent-bus';

const FAB_SIZE = 56;
const PANEL_MAX_WIDTH = 320;
const HORIZONTAL_MARGIN = 16;
const VERTICAL_GAP = 16;
const CATEGORY_ALIASES: Record<string, string> = {
  snacks: 'Snacks',
  snack: 'Snacks',
};

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
}

interface PanelSize {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type AgentIntent =
  | { type: 'selectCategory'; category: string; displayName: string };

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveCategoryAlias(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized];
  return toTitleCase(normalized);
}

function parseAgentIntent(message: string): AgentIntent | null {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.startsWith('select ')) {
    let target = normalized.replace(/^select\s+/, '').trim();
    target = target.replace(/category$/, '').trim();
    const category = resolveCategoryAlias(target);
    if (category) {
      return {
        type: 'selectCategory',
        category,
        displayName: category,
      };
    }
  }

  if (normalized.includes('select') && normalized.includes('snack')) {
    const category = resolveCategoryAlias('snacks');
    if (category) {
      return {
        type: 'selectCategory',
        category,
        displayName: category,
      };
    }
  }

  return null;
}

export default function AIModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ left?: string; top?: string }>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const anchorLeft = Number(params.left ?? 0);
  const anchorTop = Number(params.top ?? 0);
  const anchorX = anchorLeft + FAB_SIZE / 2;
  const anchorY = anchorTop + FAB_SIZE / 2;

  const progress = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [panelSize, setPanelSize] = useState<PanelSize>({ width: 0, height: 0 });
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content: "Hey there! I'm your grocery helper. Ask me for recipe ideas, shopping plans, or help finding the best deals.",
    },
  ]);
  const [composerValue, setComposerValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  useEffect(() => {
    const handleShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    };
    const handleHide = () => setKeyboardHeight(0);

    const showSub =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillShow', handleShow)
        : Keyboard.addListener('keyboardDidShow', handleShow);
    const hideSub =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillHide', handleHide)
        : Keyboard.addListener('keyboardDidHide', handleHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const panelWidth = useMemo(() => Math.min(PANEL_MAX_WIDTH, screenWidth - HORIZONTAL_MARGIN * 2), [screenWidth]);
  const effectiveHeight = panelSize.height || 320;

  const finalLeft = useMemo(() => {
    const minLeft = HORIZONTAL_MARGIN;
    const maxLeft = screenWidth - panelWidth - HORIZONTAL_MARGIN;
    const desiredLeft = anchorX - panelWidth / 2;
    return clamp(desiredLeft, minLeft, Math.max(minLeft, maxLeft));
  }, [anchorX, panelWidth, screenWidth]);

  const finalTop = useMemo(() => {
    const minTop = insets.top + VERTICAL_GAP;

    if (keyboardHeight > 0) {
      const keyboardTop = screenHeight - keyboardHeight - VERTICAL_GAP;
      const desiredTop = keyboardTop - effectiveHeight;
      return Math.max(minTop, desiredTop);
    }

    const maxTop = Math.max(minTop, screenHeight - insets.bottom - effectiveHeight - VERTICAL_GAP);

    const placeAbove = anchorTop - effectiveHeight - VERTICAL_GAP;
    if (placeAbove >= minTop) return clamp(placeAbove, minTop, maxTop);

    const placeBelow = anchorTop + FAB_SIZE + VERTICAL_GAP;
    return clamp(placeBelow, minTop, maxTop);
  }, [anchorTop, effectiveHeight, insets.bottom, insets.top, keyboardHeight, screenHeight]);

  const finalCenterX = finalLeft + panelWidth / 2;
  const finalCenterY = finalTop + effectiveHeight / 2;

  const translateFromAnchorX = anchorX - finalCenterX;
  const translateFromAnchorY = anchorY - finalCenterY;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [translateFromAnchorX, 0],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [translateFromAnchorY, 0],
  });

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const opacity = progress;

  const isPanelAboveButton = finalTop + effectiveHeight <= anchorTop + FAB_SIZE / 2;
  const pointerLeft = clamp(anchorX - finalLeft - 8, 12, panelWidth - 28);

  const handlePanelLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setPanelSize((prev) => {
      if (prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  const close = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) router.back();
    });
  }, [isClosing, progress, router]);

  const generateAssistantMock = useCallback((prompt: string) => {
    return `Here’s what I’d suggest for “${prompt}”:\n• Add any missing items to your basket\n• Ask for quick recipes with what you have\n• Track budget by checking current cart totals`;
  }, []);

  const assistantBubbleColor = useMemo(
    () => (colorScheme === 'dark' ? 'rgba(148,163,184,0.18)' : '#f3f4f6'),
    [colorScheme]
  );

  const subtleTextColor = useMemo(
    () => (colorScheme === 'dark' ? 'rgba(236,238,238,0.6)' : 'rgba(15,23,42,0.55)'),
    [colorScheme]
  );

  const composerBorderColor = useMemo(
    () => (colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'),
    [colorScheme]
  );

  const sendDisabledColor = useMemo(
    () => (colorScheme === 'dark' ? 'rgba(236,238,238,0.4)' : 'rgba(15,23,42,0.35)'),
    [colorScheme]
  );

  const handleSend = useCallback(() => {
    const prompt = composerValue.trim();
    if (!prompt || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
    };

    const pendingMessage: ChatMessage = {
      id: `assistant-pending-${Date.now()}`,
      role: 'assistant',
      content: 'Thinking…',
      pending: true,
    };

    setComposerValue('');
    setMessages((prev) => [...prev, userMessage, pendingMessage]);
    setIsStreaming(true);

    const intent = parseAgentIntent(prompt);
    const delay = intent ? 400 : 1200;

    setTimeout(() => {
      setMessages((prev) => {
        const next = [...prev];
        const pendingIndex = next.findIndex((msg) => msg.id === pendingMessage.id);
        if (pendingIndex !== -1) {
          const content = intent
            ? `Absolutely — pulling up ${intent.displayName} options now.`
            : generateAssistantMock(prompt);
          next[pendingIndex] = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content,
          };
        }
        return next;
      });

      if (intent?.type === 'selectCategory') {
        agentBus.emit(AGENT_EVENTS.SelectCategory, { category: intent.category });
      }
      setIsStreaming(false);
    }, delay);
  }, [composerValue, generateAssistantMock, isStreaming]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';
      const bubbleStyles = [
        styles.bubble,
        {
          backgroundColor: isUser ? colors.tint : assistantBubbleColor,
          alignSelf: isUser ? 'flex-end' : 'flex-start',
        },
      ];
      const textColor = isUser ? '#fff' : colors.text;
      const label = isUser ? 'You' : 'Grocery AI';

      return (
        <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAssistant]}>
          <Text style={[styles.messageLabel, { color: subtleTextColor }]}>{label}</Text>
          <View style={bubbleStyles}>
            <Text style={[styles.messageText, { color: textColor }]}>{item.content}</Text>
            {item.pending && (
              <View style={styles.pendingRow}>
                <ActivityIndicator size="small" color={textColor} />
                <Text style={[styles.pendingText, { color: textColor }]}>Preparing reply…</Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [assistantBubbleColor, colors.text, colors.tint, subtleTextColor]
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const listContentInset = useMemo(
    () => ({
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 16,
    }),
    []
  );

  return (
    <View style={styles.container}>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Close AI assistant"
        onPress={close}
      />

      <Animated.View
        onLayout={handlePanelLayout}
        style={[
          styles.panel,
          {
            width: panelWidth,
            left: finalLeft,
            top: finalTop,
            backgroundColor: colors.background,
            opacity,
            transform: [{ translateX }, { translateY }, { scale }],
            shadowColor: '#000',
          },
        ]}
      >
        <View
          style={[
            styles.pointer,
            {
              left: pointerLeft,
              backgroundColor: colors.background,
              ...(isPanelAboveButton ? { bottom: -8, transform: [{ rotate: '45deg' }] } : { top: -8, transform: [{ rotate: '225deg' }] }),
            },
          ]}
        />

        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Ask AI</Text>
            <Text style={[styles.subtitle, { color: subtleTextColor }]}>Chat with your grocery planning assistant</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close AI assistant"
            hitSlop={10}
            onPress={close}
            style={styles.closeBtn}
          >
            <MaterialIcons name="close" size={22} color={colors.tint} />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={listContentInset}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          style={styles.list}
        />

        <View style={[styles.composer, { borderColor: composerBorderColor }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Ask for meal ideas, shopping help, or deals…"
            placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.35)'}
            multiline
            value={composerValue}
            onChangeText={setComposerValue}
            editable={!isStreaming}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  composerValue.trim() && !isStreaming ? colors.tint : colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.08)',
              },
            ]}
            onPress={handleSend}
          >
            <MaterialIcons name="send" size={18} color={composerValue.trim() && !isStreaming ? '#fff' : sendDisabledColor} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    borderRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 18,
  },
  pointer: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 360,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageWrapperUser: {
    alignItems: 'flex-end',
  },
  messageWrapperAssistant: {
    alignItems: 'flex-start',
  },
  messageLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  pendingText: {
    fontSize: 13,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: 20,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
