import { useAuthGuard } from "@/hooks/use-auth-guard";
import { getOrder } from "@/lib/api/orders";
import {
  DELIVERY_STATUSES,
  type Order,
  type StoreReviewStatus,
} from "@/lib/types/orders";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OrderDetailParams {
  orderId?: string | string[];
}

function getParamValue(param: unknown): string | null {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && typeof param[0] === "string") return param[0];
  return null;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").toLowerCase();
}

function formatStoreReviewStatus(status?: StoreReviewStatus): string {
  if (!status) return "unknown";
  return status.replace(/_/g, " ").toLowerCase();
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function canTrackDelivery(order: Order): boolean {
  return (
    order.fulfillmentType === "DELIVERY" &&
    typeof order.deliveryTrackingUrl === "string" &&
    order.deliveryTrackingUrl.trim().length > 0
  );
}

function isDeliveryOrder(order: Order): boolean {
  return order.fulfillmentType === "DELIVERY";
}

function shouldShowStoreReview(order: Order): boolean {
  if (!order.deliveryStatus) return true;
  return (
    order.deliveryStatus !== DELIVERY_STATUSES.dispatched &&
    order.deliveryStatus !== DELIVERY_STATUSES.inTransit &&
    order.deliveryStatus !== DELIVERY_STATUSES.delivered
  );
}

function buildTotals(order: Order): { label: string; value: string }[] {
  const totals: { label: string; value: string }[] = [
    { label: "Subtotal", value: formatMoney(order.subtotal) },
    { label: "Tax", value: formatMoney(order.tax) },
  ];

  if (isDeliveryOrder(order)) {
    if (typeof order.deliveryFeeFinal === "number") {
      totals.push({
        label: "Delivery fee",
        value: formatMoney(order.deliveryFeeFinal),
      });
    } else if (typeof order.deliveryFeeQuoted === "number") {
      totals.push({
        label: "Delivery fee (quoted)",
        value: formatMoney(order.deliveryFeeQuoted),
      });
    }
  }

  if (typeof order.discountTotal === "number" && order.discountTotal > 0) {
    totals.push({
      label: "Discount",
      value: `-${formatMoney(order.discountTotal)}`,
    });
  }

  totals.push({ label: "Total", value: formatMoney(order.total) });
  return totals;
}

interface DetailRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isWarning?: boolean;
}

function DetailRow(props: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Ionicons
        name={props.icon}
        size={18}
        color={props.isWarning ? "#b45309" : "#64748b"}
      />
      <View style={styles.detailRowBody}>
        <Text style={styles.detailLabel}>{props.label}</Text>
        <Text
          style={[
            styles.detailValue,
            props.isWarning ? styles.warningText : null,
          ]}
        >
          {props.value}
        </Text>
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoggedIn, openLogin } = useAuthGuard();
  const params = useLocalSearchParams();
  const orderId = getParamValue((params as OrderDetailParams).orderId);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const orderTotals = useMemo(() => {
    if (!order) return [];
    return buildTotals(order);
  }, [order]);
  const isFooterVisible = !isLoading && !errorMessage && Boolean(order);

  const loadOrder = useCallback(async () => {
    if (!isLoggedIn) {
      setOrder(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    if (!orderId) {
      setOrder(null);
      setErrorMessage("Order ID is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getOrder({ orderId });
      setOrder(data);
    } catch (error) {
      setOrder(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load order details.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function handleTrackDelivery(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setErrorMessage("Unable to open tracking link right now.");
    }
  }

  function handleHelpPress() {
    router.push({
      pathname: "/order-help",
      params: order?.orderId
        ? {
            orderId: order.orderId,
            customerId: String(order.userId),
            storeId: String(order.storeId),
          }
        : undefined,
    });
  }

  function handleReorderPress() {
    router.push("/");
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <StatusBar
          style="light"
          backgroundColor="#f97316"
          translucent={false}
        />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>

        <View style={styles.gateContainer}>
          <Text style={styles.gateTitle}>Log in to view this order</Text>
          <Text style={styles.gateSubtitle}>
            Sign in to see item details, status, and total.
          </Text>
          <Pressable
            style={styles.gateButton}
            onPress={() =>
              openLogin({
                pathname: "/order-detail",
                params: orderId ? { orderId } : undefined,
              })
            }
          >
            <Text style={styles.gateButtonText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#f97316" translucent={false} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isFooterVisible ? { paddingBottom: insets.bottom + 96 } : null,
        ]}
      >
        {isLoading ? (
          <View style={styles.centerSection}>
            <ActivityIndicator size="small" color="#111827" />
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.centerSection}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => void loadOrder()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !errorMessage && order ? (
          <>
            <View>
              <Text style={styles.orderLabel}>Order No.</Text>
              <Text style={styles.orderNumberHero}>{order.orderId}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="bag-handle-outline" size={14} color="#fff" />
              </View>
              <Text style={styles.sectionHeading}>Items</Text>
            </View>
            {order.items.map((item, index) => (
              <View
                key={`${item.productId}:${item.name}:${index}`}
                style={[
                  styles.itemRow,
                  index === order.items.length - 1 ? styles.itemRowLast : null,
                ]}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    Qty {item.quantity} x {formatMoney(item.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {formatMoney(item.lineTotal)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.statusRow}>
              <View style={styles.statusMeta}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#64748b"
                />
                <View style={styles.detailRowBody}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.statusValueBadge}>
                    {formatStatus(order.status)}
                  </Text>
                </View>
              </View>
              {isDeliveryOrder(order) && canTrackDelivery(order) ? (
                <Pressable
                  style={styles.trackButtonInline}
                  onPress={() =>
                    handleTrackDelivery(order.deliveryTrackingUrl!.trim())
                  }
                >
                  <Ionicons name="navigate-outline" size={16} color="#0f172a" />
                  <Text style={styles.trackButtonText}>Track delivery</Text>
                </Pressable>
              ) : null}
            </View>
            {shouldShowStoreReview(order) ? (
              <DetailRow
                icon="storefront-outline"
                label="Store review"
                value={formatStoreReviewStatus(order.storeReviewStatus)}
              />
            ) : null}
            {(order.pendingSubstitutionCount ?? 0) > 0 ? (
              <DetailRow
                icon="swap-horizontal-outline"
                label="Substitutions"
                value={`Waiting on your decision (${order.pendingSubstitutionCount})`}
                isWarning
              />
            ) : null}

            <View style={styles.divider} />

            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="receipt-outline" size={14} color="#fff" />
              </View>
              <Text style={styles.sectionHeading}>Totals</Text>
            </View>
            {orderTotals.map((totalLine) => (
              <View key={totalLine.label} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{totalLine.label}</Text>
                <Text
                  style={[
                    styles.totalValue,
                    totalLine.label === "Total"
                      ? styles.totalValueStrong
                      : null,
                  ]}
                >
                  {totalLine.value}
                </Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      {isFooterVisible ? (
        <View
          style={[styles.footerActions, { paddingBottom: insets.bottom + 2 }]}
        >
          <Pressable style={styles.helpButton} onPress={handleHelpPress}>
            <Text style={styles.helpButtonText}>Help</Text>
          </Pressable>
          <Pressable style={styles.reorderButton} onPress={handleReorderPress}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.reorderButtonText}>Reorder</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    minHeight: 54,
    backgroundColor: "#f97316",
    borderBottomWidth: 1,
    borderBottomColor: "#ea580c",
  },
  backButton: {
    position: "absolute",
    left: 20,
    bottom: 10,
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fb923c",
    borderWidth: 1,
    borderColor: "#fdba74",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingTop: 18,
    paddingBottom: 30,
  },
  centerSection: {
    paddingVertical: 28,
    alignItems: "flex-start",
  },
  orderLabel: {
    fontSize: 13,
    color: "#64748b",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  orderNumberHero: {
    marginTop: 10,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "800",
    color: "#0f172a",
    backgroundColor: "#e5e7eb",
    alignSelf: "flex-start",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#eef2f7",
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  statusMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  detailRowBody: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  detailValue: {
    marginTop: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    textTransform: "capitalize",
  },
  statusValueBadge: {
    marginTop: 3,
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  warningText: {
    color: "#b45309",
  },
  trackButtonInline: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  trackButtonText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#020617",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  itemMeta: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 3,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#020617",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: "#475569",
  },
  totalValue: {
    fontSize: 16,
    color: "#0f172a",
  },
  totalValueStrong: {
    fontSize: 26,
    fontWeight: "700",
    color: "#020617",
  },
  errorText: {
    fontSize: 15,
    color: "#b42318",
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  gateContainer: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  gateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#020617",
  },
  gateSubtitle: {
    fontSize: 15,
    color: "#64748b",
    marginTop: 6,
    lineHeight: 22,
  },
  gateButton: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  gateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footerActions: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 8,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff",
    paddingTop: 2,
  },
  helpButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  reorderButton: {
    flex: 1.1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#f97316",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  reorderButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
