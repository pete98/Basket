import {
  chatWithSupportAi,
  type SupportAiChatRequest,
  type SupportAiChatResponse,
} from "@/api/supportApi";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface RetryPayload {
  request: SupportAiChatRequest;
}

interface SupportChatParams {
  orderId?: string | string[];
  topic?: string | string[];
}

const MAX_MESSAGE_LENGTH = 4000;
const ORDER_STATUS_FALLBACK =
  "I am currently in the process of being connected to our live tracking system. For now, I can help you find your tracking number in your email or explain our general shipping timelines.";

const DEFAULT_QUICK_PROMPTS = [
  "My order is delayed. What can I do?",
  "How do I request a refund?",
  "Can I edit my delivery address?",
  "I got a wrong item",
] as const;

const ISSUE_FIELDS = [
  "Missing item",
  "Wrong item",
  "Damaged item",
  "Item quality problem",
  "Order not delivered",
  "Order delayed",
  "Cancel order",
  "Payment issue",
  "Something else",
] as const;

const INITIAL_ASSISTANT_MESSAGE =
  "Hi, I am Basket AI Support. Tell me what happened and I will help you quickly.";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function buildConversationId(orderId: string): string {
  return `order-help-${orderId}-001`;
}

function isOrderStatusIntent(input: string): boolean {
  return /(track|tracking|status|where.*order|order.*where|delayed|delay|shipping)/i.test(
    input,
  );
}

function extractAssistantText(response: SupportAiChatResponse): string {
  const directKeys = [
    response.reply,
    response.message,
    response.content,
    response.assistantMessage,
    response.output,
  ];

  const directText = directKeys.find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  if (directText) return directText.trim();

  const nestedResult = response.data;
  if (nestedResult && typeof nestedResult === "object") {
    const nested = nestedResult as Record<string, unknown>;
    const nestedText = [nested.reply, nested.message, nested.content, nested.output].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );
    if (nestedText) return nestedText.trim();
  }

  return "I could not generate a response right now. Please try again.";
}

function parsePendingActionToken(response: SupportAiChatResponse): string | null {
  const topLevelToken =
    response.pendingAction &&
    typeof response.pendingAction === "object" &&
    typeof response.pendingAction.token === "string"
      ? response.pendingAction.token
      : null;
  if (topLevelToken && topLevelToken.trim().length > 0) return topLevelToken.trim();

  const nestedResult = response.data;
  if (!nestedResult || typeof nestedResult !== "object") return null;
  const nested = nestedResult as Record<string, unknown>;
  const nestedPendingAction = nested.pendingAction;
  if (!nestedPendingAction || typeof nestedPendingAction !== "object") return null;
  const token = (nestedPendingAction as Record<string, unknown>).token;
  if (typeof token !== "string" || token.trim().length === 0) return null;
  return token.trim();
}

function requiresConfirmation(response: SupportAiChatResponse): boolean {
  if (response.requiresConfirmation === true) return true;
  const nestedResult = response.data;
  if (!nestedResult || typeof nestedResult !== "object") return false;
  return (nestedResult as { requiresConfirmation?: unknown }).requiresConfirmation === true;
}

function buildDraftMetadataFromMessage(
  message: string,
): Record<string, string> | undefined {
  const normalized = message.toLowerCase();

  if (normalized.includes("damaged")) {
    return {
      ticketType: "DAMAGED_ITEM",
      subject: "Damaged item in order",
      description: "Product arrived damaged.",
      evidenceProvided: "true",
    };
  }

  if (normalized.includes("wrong")) {
    return {
      ticketType: "WRONG_ITEM",
      subject: "Wrong item in order",
      description: "Received an incorrect product.",
      evidenceProvided: "true",
    };
  }

  if (normalized.includes("missing")) {
    return {
      ticketType: "MISSING_ITEM",
      subject: "Missing item in order",
      description: "One or more items were missing from delivery.",
      evidenceProvided: "false",
    };
  }

  return undefined;
}

export function SupportChatbotScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const orderId = toSingleParam((params as SupportChatParams).orderId);
  const topic = toSingleParam((params as SupportChatParams).topic);
  const isIssueTopic = topic === "issue";
  const isDark = colorScheme === "dark";
  const bubbleMaxWidth = Math.min(Math.round(width * 0.8), 520);
  const quickPrompts = isIssueTopic ? ISSUE_FIELDS : DEFAULT_QUICK_PROMPTS;
  const conversationIdRef = useRef<string | null>(
    orderId ? buildConversationId(orderId) : null,
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage("assistant", INITIAL_ASSISTANT_MESSAGE),
  ]);
  const [composerValue, setComposerValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingActionToken, setPendingActionToken] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<RetryPayload | null>(null);

  const styles = useMemo(() => createStyles(isDark), [isDark]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }

  async function requestAssistantReply(payload: RetryPayload) {
    setIsSending(true);
    setSendError(null);
    console.log("[Support AI UI] Sending payload", payload.request);

    try {
      const response = await chatWithSupportAi(payload.request);
      console.log("[Support AI UI] Response", response);

      const assistantReply = extractAssistantText(response);
      setMessages((current) => [...current, createMessage("assistant", assistantReply)]);
      if (requiresConfirmation(response)) {
        const token = parsePendingActionToken(response);
        setPendingActionToken(token);
      } else {
        setPendingActionToken(null);
      }
      setRetryPayload(null);
      scrollToBottom();
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "We could not reach AI support. Check your connection and retry.",
      );
      setRetryPayload(payload);
    } finally {
      setIsSending(false);
    }
  }

  function submitUserMessage(input: string) {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    if (!orderId || !conversationIdRef.current) {
      setSendError("Order ID is missing. Open Help from the order details screen.");
      return;
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setSendError(`Message is too long. Max ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setMessages((current) => [...current, createMessage("user", trimmed)]);
    setComposerValue("");
    setSendError(null);
    scrollToBottom();

    if (isOrderStatusIntent(trimmed)) {
      setMessages((current) => [...current, createMessage("assistant", ORDER_STATUS_FALLBACK)]);
      scrollToBottom();
      return;
    }

    const requestPayload: SupportAiChatRequest = {
      message: trimmed,
      conversationId: conversationIdRef.current,
      selectedOrderId: orderId,
      metadata: buildDraftMetadataFromMessage(trimmed),
    };
    console.log("[Support AI UI] Draft request", requestPayload);
    void requestAssistantReply({
      request: requestPayload,
    });
  }

  function retryLastRequest() {
    if (!retryPayload || isSending) return;
    void requestAssistantReply(retryPayload);
  }

  function confirmPendingAction() {
    if (!pendingActionToken || isSending) return;
    if (!orderId || !conversationIdRef.current) {
      setSendError("Order ID is missing. Open Help from the order details screen.");
      return;
    }

    setMessages((current) => [...current, createMessage("user", "Confirm")]);
    setPendingActionToken(null);
    const confirmRequestPayload: SupportAiChatRequest = {
      message: "Confirm",
      conversationId: conversationIdRef.current,
      selectedOrderId: orderId,
      confirmAction: true,
      pendingActionToken,
    };
    console.log("[Support AI UI] Confirm request", confirmRequestPayload);
    void requestAssistantReply({
      request: confirmRequestPayload,
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <View style={styles.headerBadge}>
          <Ionicons name="sparkles" size={14} color={isDark ? "#86efac" : "#166534"} />
          <Text style={styles.headerBadgeText}>AI Support</Text>
        </View>
        <Text style={styles.headerTitle}>Ask anything about your order</Text>
        <Text style={styles.headerSubtitle}>Fast answers, refunds help, and delivery guidance.</Text>
        {!orderId ? (
          <Text style={styles.missingOrderText}>
            Open this chat from Order Details so we can attach your order automatically.
          </Text>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
          renderItem={({ item }) => {
            const isUser = item.role === "user";
            return (
              <View style={[styles.messageRow, isUser ? styles.messageRowRight : styles.messageRowLeft]}>
                <View
                  style={[
                    styles.messageBubble,
                    { maxWidth: bubbleMaxWidth },
                    isUser ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
                    {item.content}
                  </Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <View style={styles.footerSpace}>
              {isSending ? (
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color={isDark ? "#86efac" : "#166534"} />
                  <Text style={styles.typingText}>AI is typing...</Text>
                </View>
              ) : null}
            </View>
          }
        />

        <View style={styles.composerCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPromptsRow}
          >
            {quickPrompts.map((prompt) => (
              <Pressable
                key={prompt}
                style={styles.quickPromptChip}
                onPress={() => submitUserMessage(prompt)}
                disabled={isSending}
                accessibilityRole="button"
                accessibilityLabel={`Send prompt: ${prompt}`}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={composerValue}
              onChangeText={setComposerValue}
              placeholder="Type your message"
              placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              editable={!isSending}
              accessibilityLabel="AI support message input"
            />
            <Pressable
              style={[styles.sendButton, isSending ? styles.sendButtonDisabled : null]}
              onPress={() => submitUserMessage(composerValue)}
              disabled={isSending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Ionicons name="send" size={16} color="#ffffff" />
            </Pressable>
          </View>

          <View style={styles.composerMetaRow}>
            <Text style={styles.charCount}>{composerValue.length}/{MAX_MESSAGE_LENGTH}</Text>
            {pendingActionToken ? (
              <Pressable onPress={confirmPendingAction} disabled={isSending}>
                <Text style={styles.confirmText}>Confirm action</Text>
              </Pressable>
            ) : null}
            {sendError ? (
              <Pressable onPress={retryLastRequest} disabled={!retryPayload || isSending}>
                <Text style={styles.retryText}>{retryPayload ? "Retry" : ""}</Text>
              </Pressable>
            ) : null}
          </View>

          {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#020617" : "#f8fafc",
    },
    flex: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: isDark ? "#03120d" : "#ecfdf3",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#14532d" : "#bbf7d0",
      gap: 6,
    },
    headerBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: isDark ? "#064e3b" : "#dcfce7",
    },
    headerBadgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#a7f3d0" : "#166534",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: isDark ? "#f8fafc" : "#052e16",
    },
    headerSubtitle: {
      fontSize: 14,
      color: isDark ? "#cbd5e1" : "#166534",
      lineHeight: 20,
    },
    missingOrderText: {
      fontSize: 12,
      lineHeight: 17,
      color: isDark ? "#fda4af" : "#991b1b",
      marginTop: 2,
    },
    messagesContent: {
      paddingHorizontal: 14,
      paddingTop: 16,
      paddingBottom: 8,
    },
    messageRow: {
      width: "100%",
      marginBottom: 10,
    },
    messageRowLeft: {
      alignItems: "flex-start",
    },
    messageRowRight: {
      alignItems: "flex-end",
    },
    messageBubble: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    assistantBubble: {
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      borderWidth: 1,
      borderColor: isDark ? "#1e293b" : "#e2e8f0",
    },
    userBubble: {
      backgroundColor: isDark ? "#166534" : "#16a34a",
    },
    messageText: {
      fontSize: 15,
      lineHeight: 22,
    },
    assistantText: {
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    userText: {
      color: "#ffffff",
    },
    footerSpace: {
      paddingTop: 4,
      paddingBottom: 6,
    },
    typingRow: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      borderWidth: 1,
      borderColor: isDark ? "#1e293b" : "#e2e8f0",
    },
    typingText: {
      fontSize: 13,
      color: isDark ? "#cbd5e1" : "#334155",
    },
    composerCard: {
      borderTopWidth: 1,
      borderTopColor: isDark ? "#1e293b" : "#dbeafe",
      backgroundColor: isDark ? "#020617" : "#ffffff",
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
      gap: 8,
    },
    quickPromptsRow: {
      gap: 8,
      paddingRight: 8,
    },
    quickPromptChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#bfdbfe",
      backgroundColor: isDark ? "#0f172a" : "#eff6ff",
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    quickPromptText: {
      fontSize: 13,
      color: isDark ? "#e2e8f0" : "#1e3a8a",
      fontWeight: "600",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#cbd5e1",
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      color: isDark ? "#f8fafc" : "#0f172a",
      fontSize: 15,
      paddingHorizontal: 12,
      paddingTop: 11,
      paddingBottom: 11,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#16a34a",
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    composerMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    charCount: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    retryText: {
      fontSize: 13,
      fontWeight: "700",
      color: isDark ? "#86efac" : "#166534",
    },
    confirmText: {
      fontSize: 13,
      fontWeight: "700",
      color: isDark ? "#93c5fd" : "#1d4ed8",
    },
    errorText: {
      fontSize: 13,
      lineHeight: 18,
      color: isDark ? "#fda4af" : "#b91c1c",
    },
  });
}

export default SupportChatbotScreen;
