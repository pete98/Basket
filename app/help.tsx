import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { listSupportTicketsByOrderAndType } from "@/lib/api/support";
import type { SupportTicket } from "@/lib/types/support";

interface HelpParams {
  orderId?: string | string[];
  topic?: string | string[];
}

interface HelpFieldConfig {
  title: string;
  subtitle: string;
  fields: string[];
}

const ITEM_SELECTION_FIELDS = new Set([
  "Missing item",
  "Wrong item",
  "Damaged item",
]);
const ORDER_NOT_DELIVERED_FIELD = "Order not delivered";

const ISSUE_FIELDS = [
  "Missing item",
  "Wrong item",
  "Damaged item",
  "Order not delivered",
  "Order delayed",
  "Payment issue",
  "Something else",
];

const HELP_FIELDS_BY_TOPIC: Record<string, HelpFieldConfig> = {
  issue: {
    title: "Issue with this order",
    subtitle: "Select the issue type:",
    fields: ISSUE_FIELDS,
  },
  cancel: {
    title: "Cancel order",
    subtitle: "Select a cancellation option:",
    fields: ["Cancel order", "Something else"],
  },
  default: {
    title: "Help",
    subtitle: "Select a support option:",
    fields: ["Something else"],
  },
};

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function getHelpConfig(topic: string | null): HelpFieldConfig {
  if (!topic) return HELP_FIELDS_BY_TOPIC.default;
  return HELP_FIELDS_BY_TOPIC[topic] ?? HELP_FIELDS_BY_TOPIC.default;
}

function toIssueTypeParam(field: string): string {
  return field.trim().toUpperCase().replace(/\s+/g, "_");
}

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [isCheckingIssue, setIsCheckingIssue] = useState(false);
  const [issueCheckError, setIssueCheckError] = useState<string | null>(null);
  const latestIssueCheckKeyRef = useRef<string | null>(null);
  const [cachedOrderId, setCachedOrderId] = useState<string | null>(null);
  const [cachedIssueType, setCachedIssueType] = useState<string | null>(null);
  const [cachedTicket, setCachedTicket] = useState<SupportTicket | null>(null);

  const orderId = toSingleParam((params as HelpParams).orderId);
  const topic = toSingleParam((params as HelpParams).topic);
  const config = getHelpConfig(topic);
  const isIssueTopic = topic === "issue";

  async function handleFieldPress(field: string) {
    setIssueCheckError(null);
    const issueType = toIssueTypeParam(field);

    if (isIssueTopic && orderId && issueType) {
      if (cachedOrderId !== orderId || cachedIssueType !== issueType) {
        setCachedOrderId(orderId);
        setCachedIssueType(issueType);
        setCachedTicket(null);
      }

      if (
        cachedOrderId === orderId &&
        cachedIssueType === issueType &&
        cachedTicket
      ) {
        router.push({
          pathname: "/ticket-result",
          params: {
            orderId,
            ticketId: cachedTicket.id || cachedTicket.ticketId || undefined,
            status: cachedTicket.status || undefined,
            decisionReason: cachedTicket.decisionReason || undefined,
          },
        });
        return;
      }

      const issueCheckKey = ["tickets", orderId, issueType].join(":");
      latestIssueCheckKeyRef.current = issueCheckKey;
      setIsCheckingIssue(true);
      try {
        const existing = await listSupportTicketsByOrderAndType({
          orderId,
          type: issueType,
          page: 0,
          size: 20,
        });
        if (latestIssueCheckKeyRef.current !== issueCheckKey) return;

        const existingTicket = existing.content.find(
          (ticket) => toIssueTypeParam(String(ticket.type || "")) === issueType,
        );
        if (existingTicket) {
          setCachedOrderId(orderId);
          setCachedIssueType(issueType);
          setCachedTicket(existingTicket);
          router.push({
            pathname: "/ticket-result",
            params: {
              orderId,
              ticketId: existingTicket.id || existingTicket.ticketId || undefined,
              status: existingTicket.status || undefined,
              decisionReason: existingTicket.decisionReason || undefined,
            },
          });
          return;
        }
        setCachedOrderId(orderId);
        setCachedIssueType(issueType);
        setCachedTicket(null);
      } catch (error) {
        if (latestIssueCheckKeyRef.current !== issueCheckKey) return;
        setIssueCheckError(
          error instanceof Error ? error.message : "Could not check existing tickets.",
        );
        return;
      } finally {
        if (latestIssueCheckKeyRef.current === issueCheckKey) setIsCheckingIssue(false);
      }
    }

    if (ITEM_SELECTION_FIELDS.has(field)) {
      router.push({
        pathname: "/help-issue-items",
        params: {
          orderId: orderId || undefined,
          issueType: field,
        },
      });
      return;
    }

    if (field === ORDER_NOT_DELIVERED_FIELD) {
      router.push({
        pathname: "/help-order-not-delivered",
        params: {
          orderId: orderId || undefined,
          issueType: field,
        },
      });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar style="light" backgroundColor="#f97316" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{config.title}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, isIssueTopic ? styles.issueSubtitle : null]}>
          {config.subtitle}
        </Text>
        {orderId ? <Text style={styles.orderPill}>Order {orderId}</Text> : null}

        <View style={styles.optionsList}>
          {config.fields.map((field) => (
            <Pressable
              key={field}
              style={styles.optionButton}
              accessibilityRole="button"
              accessibilityLabel={field}
              onPress={() => void handleFieldPress(field)}
              disabled={isCheckingIssue}
            >
              <Text style={[styles.optionText, isIssueTopic ? styles.issueOptionText : null]}>
                {field}
              </Text>
            </Pressable>
          ))}
        </View>
        {isCheckingIssue ? (
          <View style={styles.checkWrap}>
            <ActivityIndicator size="small" color="#f97316" />
            <Text style={styles.checkText}>Checking existing ticket...</Text>
          </View>
        ) : null}
        {issueCheckError ? <Text style={styles.checkErrorText}>{issueCheckError}</Text> : null}
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
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748b",
  },
  issueSubtitle: {
    fontSize: 18,
    lineHeight: 26,
  },
  orderPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  optionsList: {
    marginTop: 18,
    gap: 10,
  },
  optionButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  issueOptionText: {
    fontSize: 18,
    lineHeight: 24,
  },
  checkWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkText: {
    fontSize: 13,
    color: "#475569",
  },
  checkErrorText: {
    marginTop: 10,
    fontSize: 13,
    color: "#b91c1c",
  },
});
