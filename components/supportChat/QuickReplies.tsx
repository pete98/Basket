import { Pressable, StyleSheet, Text, View } from "react-native";
import type { QuickReplyOption } from "@/supportChat/types";

interface QuickRepliesProps {
  options: QuickReplyOption[];
  disabled?: boolean;
  onSelect: (option: QuickReplyOption) => void;
}

export function QuickReplies(props: QuickRepliesProps) {
  if (props.options.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {props.options.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => props.onSelect(option)}
            style={[styles.chip, props.disabled ? styles.disabled : null]}
            disabled={props.disabled}
            accessibilityRole="button"
            accessibilityLabel={option.label}
          >
            <Text style={styles.chipText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  content: {
    gap: 8,
    alignSelf: "flex-end",
  },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-end",
  },
  chipText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.45,
  },
});
