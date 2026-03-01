import { createSupportTicket } from "@/lib/api/support";
import { getOrder } from "@/lib/api/orders";
import type { Order } from "@/lib/types/orders";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface HelpIssueItemsParams {
  orderId?: string | string[];
  issueType?: string | string[];
}

const WRONG_ITEM_ISSUE_OPTIONS = [
  "Received completely different item",
  "Item was incorrect variation",
  "Item missing and replaced with something else",
];

function toSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

export default function HelpIssueItemsScreen() {
  const router = useRouter();
  const { user } = useAuth0();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const orderId = toSingleParam((params as HelpIssueItemsParams).orderId);
  const issueType = toSingleParam((params as HelpIssueItemsParams).issueType) || "Issue";
  const isDamagedIssue = issueType.toLowerCase() === "damaged item";
  const isWrongItemIssue = issueType.toLowerCase() === "wrong item";
  const isMissingItemIssue = issueType.toLowerCase() === "missing item";
  const supportsOptionalPhoto = isDamagedIssue || isWrongItemIssue;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const [wrongItemIssue, setWrongItemIssue] = useState<string | null>(null);
  const [damagePhotoUri, setDamagePhotoUri] = useState<string | null>(null);
  const [imagePickerError, setImagePickerError] = useState<string | null>(null);

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
          error instanceof Error ? error.message : "Unable to load order items.",
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

  const orderItems = useMemo(() => order?.items ?? [], [order]);
  const selectedOrderItems = useMemo(
    () =>
      orderItems.filter((item, index) =>
        selectedItemKeys.includes(`${item.productId}:${index}`),
      ),
    [orderItems, selectedItemKeys],
  );

  function toggleItemSelection(itemKey: string) {
    setSubmitErrorMessage(null);
    setSubmitSuccessMessage(null);
    setSelectedItemKeys((current) => {
      if (current.includes(itemKey))
        return current.filter((value) => value !== itemKey);
      return [...current, itemKey];
    });
  }

  async function handleUploadDamagePhoto() {
    setImagePickerError(null);

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setImagePickerError("Media library access is required to upload a photo.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (pickerResult.canceled) return;

    const selectedAsset = pickerResult.assets[0];
    if (!selectedAsset?.uri) {
      setImagePickerError("Could not read the selected image.");
      return;
    }

    setDamagePhotoUri(selectedAsset.uri);
  }

  async function handleContinueForMissingItem() {
    if (!isMissingItemIssue || isSubmitting) return;
    if (!orderId) {
      setSubmitErrorMessage("Order ID is missing.");
      return;
    }
    if (!order) {
      setSubmitErrorMessage("Order details are not loaded yet.");
      return;
    }
    if (selectedOrderItems.length === 0) {
      setSubmitErrorMessage("Select at least one missing item.");
      return;
    }
    if (!user?.sub) {
      setSubmitErrorMessage("Could not identify your account. Please log in again.");
      return;
    }

    const selectedNames = selectedOrderItems.map((item) => item.name.trim()).filter(Boolean);
    const subjectSeed =
      selectedNames.length === 1
        ? `Missing item: ${selectedNames[0]}`
        : `Missing items (${selectedNames.length})`;
    const descriptionLines = [
      `${selectedOrderItems.length} item(s) were not delivered.`,
      `Items: ${selectedNames.join(", ")}`,
    ];

    setIsSubmitting(true);
    setSubmitErrorMessage(null);
    setSubmitSuccessMessage(null);
    try {
      const ticketPayload = {
        orderId,
        storeId: String(order.storeId),
        customerId: user.sub,
        type: "MISSING_ITEM" as const,
        subject: truncateText(subjectSeed, 255),
        description: truncateText(descriptionLines.join(" "), 4000),
        priority: "HIGH" as const,
        evidenceProvided: false,
      };
      console.log("[Support Ticket] Create payload", ticketPayload);

      const response = await createSupportTicket({
        payload: ticketPayload,
      });
      const ticketId = String(response.ticketId || response.id || "").trim();
      router.replace({
        pathname: "/ticket-result",
        params: {
          orderId,
          ticketId: ticketId || undefined,
          status: response.status || undefined,
          decisionReason: response.decisionReason || undefined,
        },
      });
      return;
    } catch (error) {
      setSubmitErrorMessage(
        error instanceof Error ? error.message : "Could not create ticket.",
      );
    } finally {
      setIsSubmitting(false);
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
        <Text style={styles.title}>Which item has this issue?</Text>
        {orderId ? <Text style={styles.orderPill}>Order {orderId}</Text> : null}
        {supportsOptionalPhoto ? (
          <View style={styles.uploadCard}>
            <Text style={styles.uploadTitle}>Upload photo (optional)</Text>
            <Pressable
              style={styles.uploadButton}
              onPress={() => void handleUploadDamagePhoto()}
              accessibilityRole="button"
              accessibilityLabel="Upload photo"
            >
              <Ionicons name="image-outline" size={16} color="#fff" />
              <Text style={styles.uploadButtonText}>
                {damagePhotoUri ? "Change photo" : "Choose photo"}
              </Text>
            </Pressable>
            {imagePickerError ? <Text style={styles.uploadErrorText}>{imagePickerError}</Text> : null}
            {damagePhotoUri ? (
              <Image
                source={{ uri: damagePhotoUri }}
                style={styles.damagePhotoPreview}
                contentFit="cover"
              />
            ) : null}
          </View>
        ) : null}

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

        {!isLoading && !errorMessage && orderItems.length === 0 ? (
          <View style={styles.centerBlock}>
            <Text style={styles.emptyText}>No items found for this order.</Text>
          </View>
        ) : null}

        {!isLoading && !errorMessage && orderItems.length > 0 ? (
          <View style={styles.itemList}>
            {orderItems.map((item, index) => {
              const itemKey = `${item.productId}:${index}`;
              const isSelected = selectedItemKeys.includes(itemKey);
              return (
                <Pressable
                  key={itemKey}
                  style={[styles.itemCard, isSelected ? styles.itemCardSelected : null]}
                  onPress={() => toggleItemSelection(itemKey)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.name}`}
                >
                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      Qty {item.quantity} x {formatMoney(item.unitPrice)}
                    </Text>
                  </View>
                  <View style={[styles.checkboxOuter, isSelected ? styles.checkboxOuterSelected : null]}>
                    {isSelected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!isLoading &&
        !errorMessage &&
        isWrongItemIssue &&
        selectedItemKeys.length > 0 ? (
          <View style={styles.issueTypeCard}>
            <Text style={styles.issueTypeTitle}>What was the issue?</Text>
            <View style={styles.issueTypeList}>
              {WRONG_ITEM_ISSUE_OPTIONS.map((option) => {
                const isSelected = wrongItemIssue === option;
                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.issueTypeOption,
                      isSelected ? styles.issueTypeOptionSelected : null,
                    ]}
                    onPress={() => setWrongItemIssue(option)}
                    accessibilityRole="button"
                    accessibilityLabel={option}
                  >
                    <Text
                      style={[
                        styles.issueTypeOptionText,
                        isSelected ? styles.issueTypeOptionTextSelected : null,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {!isLoading && !errorMessage && isMissingItemIssue ? (
          <View style={styles.continueWrap}>
            <Pressable
              style={[
                styles.continueButton,
                selectedOrderItems.length === 0 || isSubmitting
                  ? styles.continueButtonDisabled
                  : null,
              ]}
              onPress={() => void handleContinueForMissingItem()}
              disabled={selectedOrderItems.length === 0 || isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.continueButtonText}>
                {isSubmitting ? "Submitting..." : "Continue"}
              </Text>
            </Pressable>
            {submitErrorMessage ? (
              <Text style={styles.submitErrorText}>{submitErrorMessage}</Text>
            ) : null}
            {submitSuccessMessage ? (
              <Text style={styles.submitSuccessText}>{submitSuccessMessage}</Text>
            ) : null}
          </View>
        ) : null}
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
  uploadCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 14,
    backgroundColor: "#fff7ed",
    padding: 12,
    gap: 10,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9a3412",
  },
  uploadButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f97316",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  uploadErrorText: {
    fontSize: 13,
    color: "#b91c1c",
  },
  damagePhotoPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },
  centerBlock: {
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
  },
  itemList: {
    marginTop: 16,
    gap: 10,
  },
  continueWrap: {
    marginTop: 18,
    gap: 8,
  },
  continueButton: {
    borderRadius: 12,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  continueButtonDisabled: {
    opacity: 0.55,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  submitErrorText: {
    fontSize: 13,
    color: "#b91c1c",
  },
  submitSuccessText: {
    fontSize: 13,
    color: "#166534",
    fontWeight: "600",
  },
  issueTypeCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    backgroundColor: "#fff",
    padding: 12,
    gap: 10,
  },
  issueTypeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  issueTypeList: {
    gap: 8,
  },
  issueTypeOption: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  issueTypeOptionSelected: {
    borderColor: "#f97316",
    backgroundColor: "#fff7ed",
  },
  issueTypeOptionText: {
    fontSize: 14,
    color: "#334155",
  },
  issueTypeOptionTextSelected: {
    color: "#9a3412",
    fontWeight: "600",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  itemCardSelected: {
    borderColor: "#f97316",
    backgroundColor: "#fff7ed",
  },
  itemTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748b",
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOuterSelected: {
    borderColor: "#f97316",
    backgroundColor: "#f97316",
  },
});
