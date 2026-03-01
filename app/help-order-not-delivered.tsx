import { getOrder } from "@/lib/api/orders";
import type { Order } from "@/lib/types/orders";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface HelpOrderNotDeliveredParams {
  orderId?: string | string[];
  issueType?: string | string[];
}

const ORDER_NOT_DELIVERED_OPTIONS = [
  "I never received the order",
  "Delivered to wrong location",
  "Driver did not contact me",
];

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function canTrackDelivery(order: Order | null): boolean {
  if (!order) return false;
  return (
    order.fulfillmentType === "DELIVERY" &&
    typeof order.deliveryTrackingUrl === "string" &&
    order.deliveryTrackingUrl.trim().length > 0
  );
}

export default function HelpOrderNotDeliveredScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const orderId = toSingleParam((params as HelpOrderNotDeliveredParams).orderId);
  const issueType =
    toSingleParam((params as HelpOrderNotDeliveredParams).issueType) ||
    "Order not delivered";

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      if (!orderId) {
        setErrorMessage("Order ID is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await getOrder({ orderId });
        if (!isMounted) return;
        setOrder(data);
      } catch (error) {
        if (!isMounted) return;
        setOrder(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load order details.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadOrder();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const trackingUrl = useMemo(() => {
    if (!canTrackDelivery(order)) return null;
    return order?.deliveryTrackingUrl?.trim() || null;
  }, [order]);

  async function handleTrackDelivery() {
    if (!trackingUrl) return;
    try {
      await Linking.openURL(trackingUrl);
    } catch {
      setErrorMessage("Unable to open tracking link right now.");
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
        <Text style={styles.headerTitle}>{issueType}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What was the issue?</Text>
        {orderId ? <Text style={styles.orderPill}>Order {orderId}</Text> : null}

        {isLoading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="small" color="#f97316" />
          </View>
        ) : null}

        {!isLoading ? (
          <View style={styles.optionList}>
            {ORDER_NOT_DELIVERED_OPTIONS.map((option) => {
              const isSelected = selectedOption === option;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.optionCard,
                    isSelected ? styles.optionCardSelected : null,
                  ]}
                  onPress={() => setSelectedOption(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected ? styles.optionTextSelected : null,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {trackingUrl ? (
          <Pressable
            style={styles.trackDeliveryButton}
            onPress={() => void handleTrackDelivery()}
            accessibilityRole="button"
            accessibilityLabel="Track delivery"
          >
            <Ionicons name="navigate-outline" size={16} color="#0f172a" />
            <Text style={styles.trackDeliveryText}>Track delivery</Text>
          </Pressable>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
    color: "#0f172a",
  },
  orderPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  centerBlock: {
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  optionList: {
    marginTop: 16,
    gap: 10,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionCardSelected: {
    borderColor: "#f97316",
    backgroundColor: "#fff7ed",
  },
  optionText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#9a3412",
  },
  trackDeliveryButton: {
    marginTop: 18,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trackDeliveryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: "#b91c1c",
  },
});
