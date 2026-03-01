import {
  addSupportTicketAttachment,
  addSupportTicketMessage,
  getSupportTicketDetails,
  listSupportTicketMessages,
} from "@/lib/api/support";
import type { SupportMessage, SupportTicket } from "@/lib/types/support";
import {
  SUPPORT_TICKET_STATUSES,
  isTerminalTicketStatus,
  normalizeTicketStatus,
} from "@/lib/utils/support-ticket-status";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth0 } from "react-native-auth0";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface TicketResultParams {
  orderId?: string | string[];
  ticketId?: string | string[];
  status?: string | string[];
  decisionReason?: string | string[];
}

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function getTitle(status: string): string {
  if (status === SUPPORT_TICKET_STATUSES.resolved)
    return "Issue resolved automatically";
  if (status === SUPPORT_TICKET_STATUSES.rejected)
    return "Ticket closed based on policy";
  if (status === SUPPORT_TICKET_STATUSES.cancelled) return "Ticket is cancelled";
  return "Your ticket is created";
}

export default function TicketResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth0();
  const params = useLocalSearchParams();
  const orderId = toSingleParam((params as TicketResultParams).orderId);
  const ticketId = toSingleParam((params as TicketResultParams).ticketId);
  const statusFromParams = normalizeTicketStatus(
    toSingleParam((params as TicketResultParams).status),
  );
  const reasonFromParams = toSingleParam((params as TicketResultParams).decisionReason);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [screenNotice, setScreenNotice] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [attachmentPreviewUri, setAttachmentPreviewUri] = useState<string | null>(null);
  const [isComposerVisible, setIsComposerVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!ticketId) {
        setErrorMessage("Ticket ID is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setScreenNotice(null);
      try {
        const [ticketResponse, messagesResponse] = await Promise.all([
          getSupportTicketDetails({ ticketId }),
          listSupportTicketMessages({ ticketId }),
        ]);
        if (!isMounted) return;
        setTicket(ticketResponse);
        setMessages(messagesResponse);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load ticket details.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  const status = normalizeTicketStatus(ticket?.status || statusFromParams);
  const decisionReason = ticket?.decisionReason || reasonFromParams;
  const isTerminal = isTerminalTicketStatus(status);
  const title = getTitle(status);

  const timelineEntries = useMemo(() => {
    if (!ticket) return messages;
    const createdEvent: SupportMessage = {
      id: `created-${ticket.id}`,
      ticketId: ticket.id,
      authorType: "SYSTEM",
      authorId: "system",
      body: `Ticket created with status ${normalizeTicketStatus(ticket.status)}.`,
      createdAt: ticket.createdAt,
    };
    return [createdEvent, ...messages].sort((a, b) => {
      const first = new Date(a.createdAt).getTime();
      const second = new Date(b.createdAt).getTime();
      return first - second;
    });
  }, [messages, ticket]);

  async function handleSendMessage() {
    if (!ticket || !ticketId || isTerminal || isSendingMessage) return;
    const body = messageDraft.trim();
    if (!body) {
      setScreenNotice("Write a message before sending.");
      return;
    }

    setIsSendingMessage(true);
    setScreenNotice(null);
    try {
      const response = await addSupportTicketMessage({
        ticketId,
        payload: {
          authorType: "CUSTOMER",
          authorId: user?.sub || ticket.customerId,
          body,
        },
      });
      setMessages((current) => [...current, response]);
      setMessageDraft("");
      setScreenNotice("Message added.");
    } catch (error) {
      setScreenNotice(
        error instanceof Error ? error.message : "Could not add message.",
      );
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleAddEvidence() {
    if (!ticket || !ticketId || isTerminal || isUploadingEvidence) return;

    setIsUploadingEvidence(true);
    setScreenNotice(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setScreenNotice("Media library access is required.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (pickerResult.canceled) return;

      const asset = pickerResult.assets[0];
      if (!asset?.uri) {
        setScreenNotice("Could not read selected image.");
        return;
      }

      const fileName = asset.fileName || `support-evidence-${Date.now()}.jpg`;
      const contentType = asset.mimeType || "image/jpeg";
      await addSupportTicketAttachment({
        ticketId,
        payload: {
          url: asset.uri,
          contentType,
          fileName,
        },
      });
      setAttachmentPreviewUri(asset.uri);
      setScreenNotice("Evidence added.");
    } catch (error) {
      setScreenNotice(
        error instanceof Error ? error.message : "Could not add evidence.",
      );
    } finally {
      setIsUploadingEvidence(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar style="light" backgroundColor="#f97316" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back to order"
          onPress={() =>
            router.replace({
              pathname: "/order-detail",
              params: { orderId: orderId || undefined },
            })
          }
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Ticket</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {isLoading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="small" color="#f97316" />
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.centerBlock}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {!isLoading && !errorMessage ? (
          <View style={styles.section}>
            <Text style={styles.title}>{title}</Text>
            {decisionReason ? <Text style={styles.reasonText}>{decisionReason}</Text> : null}
            <Text style={styles.metaText}>Status: {status}</Text>
            {ticket?.id ? <Text style={styles.metaText}>Ticket: {ticket.id}</Text> : null}
            {ticket?.createdAt ? (
              <Text style={styles.metaText}>Created: {formatDateTime(ticket.createdAt)}</Text>
            ) : null}
          </View>
        ) : null}

        {!isLoading && !errorMessage && isTerminal ? (
          <View style={styles.section}>
            <Text style={styles.mutedText}>
              This ticket is closed. Updates are disabled.
            </Text>
          </View>
        ) : null}

        {!isLoading && !errorMessage && !isTerminal ? (
          <View style={styles.section}>
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.actionButton}
                onPress={() => setIsComposerVisible((current) => !current)}
                accessibilityRole="button"
                accessibilityLabel="Add message"
              >
                <Text style={styles.actionButtonText}>Add Message</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => void handleAddEvidence()}
                accessibilityRole="button"
                accessibilityLabel="Add evidence"
              >
                <Text style={styles.actionButtonText}>
                  {isUploadingEvidence ? "Uploading..." : "Add Evidence"}
                </Text>
              </Pressable>
            </View>
            {isComposerVisible ? (
              <View style={styles.composerWrap}>
                <TextInput
                  value={messageDraft}
                  onChangeText={setMessageDraft}
                  multiline
                  placeholder="Write your message"
                  style={styles.composerInput}
                />
                <Pressable
                  style={styles.sendButton}
                  onPress={() => void handleSendMessage()}
                  disabled={isSendingMessage}
                >
                  <Text style={styles.sendButtonText}>
                    {isSendingMessage ? "Sending..." : "Send Update"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {attachmentPreviewUri ? (
              <Image
                source={{ uri: attachmentPreviewUri }}
                style={styles.previewImage}
                contentFit="cover"
              />
            ) : null}
          </View>
        ) : null}

        {!isLoading && !errorMessage ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {timelineEntries.length === 0 ? (
              <Text style={styles.mutedText}>No updates yet.</Text>
            ) : (
              timelineEntries.map((entry) => (
                <View key={entry.id} style={styles.timelineItem}>
                  <Text style={styles.timelineMeta}>
                    {entry.authorType} • {formatDateTime(entry.createdAt)}
                  </Text>
                  <Text style={styles.timelineBody}>{entry.body}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {screenNotice ? <Text style={styles.noticeText}>{screenNotice}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ea580c",
    backgroundColor: "#f97316",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  centerBlock: {
    paddingVertical: 24,
    alignItems: "center",
  },
  section: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#0f172a",
  },
  reasonText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },
  metaText: {
    marginTop: 4,
    fontSize: 13,
    color: "#334155",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  mutedText: {
    fontSize: 13,
    color: "#64748b",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  composerWrap: {
    marginTop: 10,
    gap: 8,
  },
  composerInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#0f172a",
  },
  sendButton: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#111827",
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  previewImage: {
    width: "100%",
    height: 180,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  timelineItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  timelineMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  timelineBody: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#1e293b",
  },
  noticeText: {
    fontSize: 13,
    color: "#334155",
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
  },
});

