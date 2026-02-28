import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OrderHelpParams {
  orderId?: string | string[];
}

interface HelpOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const HELP_OPTIONS: HelpOption[] = [
  {
    id: "track",
    title: "Track order status",
    subtitle: "See latest status updates and ETA.",
    icon: "navigate-outline",
  },
  {
    id: "issue",
    title: "Issue with this order",
    subtitle: "Report missing, wrong, or damaged items.",
    icon: "alert-circle-outline",
  },
  {
    id: "refund",
    title: "Refund and payments",
    subtitle: "Get help with charges, refunds, or payment issues.",
    icon: "card-outline",
  },
  {
    id: "delivery",
    title: "Delivery instructions",
    subtitle: "Update handoff preferences and delivery notes.",
    icon: "location-outline",
  },
];

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export default function OrderHelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const orderId = toSingleParam((params as OrderHelpParams).orderId);

  function handleOptionPress(option: HelpOption) {
    router.push({
      pathname: "/help",
      params: {
        orderId: orderId || undefined,
        topic: option.id,
      },
    });
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </Pressable>
        <Text style={styles.headerTitle}>Order Help</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>
          Choose a topic and we will guide you through the next steps.
        </Text>
        {orderId ? <Text style={styles.orderPill}>Order {orderId}</Text> : null}

        <View style={styles.optionsList}>
          {HELP_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleOptionPress(option)}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name={option.icon} size={18} color="#fff" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
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
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fff",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: "#020617",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748b",
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
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748b",
  },
});
