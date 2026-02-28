import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TicketPayloadBuildResult } from "@/supportChat/types";

interface TicketSummaryCardProps {
  summary: TicketPayloadBuildResult;
  attachmentsCount: number;
  disabled?: boolean;
  onSubmit: () => void;
  onEdit: () => void;
}

export function TicketSummaryCard(props: TicketSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ticket Summary</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Type</Text>
        <Text style={styles.value}>{props.summary.type}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Priority</Text>
        <Text style={styles.value}>{props.summary.priority}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Attachments</Text>
        <Text style={styles.value}>{props.attachmentsCount}</Text>
      </View>

      <Text style={styles.sectionTitle}>Subject</Text>
      <Text style={styles.body}>{props.summary.subject}</Text>

      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.body}>{props.summary.description}</Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.editButton, props.disabled ? styles.disabled : null]}
          onPress={props.onEdit}
          disabled={props.disabled}
          accessibilityRole="button"
          accessibilityLabel="Edit ticket details"
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>

        <Pressable
          style={[styles.submitButton, props.disabled ? styles.disabled : null]}
          onPress={props.onSubmit}
          disabled={props.disabled}
          accessibilityRole="button"
          accessibilityLabel="Submit support ticket"
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionTitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 15,
    color: "#64748b",
  },
  value: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    color: "#0f172a",
    lineHeight: 22,
  },
  actions: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    alignItems: "center",
  },
  submitButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#f97316",
    paddingVertical: 10,
    alignItems: "center",
  },
  editButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
});
