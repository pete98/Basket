import { StyleSheet, Text, View } from "react-native";

interface ChatBubbleProps {
  role: "assistant" | "user" | "system";
  text: string;
}

export function ChatBubble(props: ChatBubbleProps) {
  const isUser = props.role === "user";
  const isSystem = props.role === "system";

  return (
    <View
      style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}
      accessibilityRole="text"
      accessibilityLabel={`${props.role} message`}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          isSystem ? styles.systemBubble : null,
        ]}
      >
        <Text
          style={[
            styles.text,
            isUser ? styles.userText : styles.assistantText,
            isSystem ? styles.systemText : null,
          ]}
        >
          {props.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    marginBottom: 8,
  },
  rowLeft: {
    alignItems: "flex-start",
  },
  rowRight: {
    alignItems: "flex-end",
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: "87%",
  },
  assistantBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  userBubble: {
    backgroundColor: "#0f172a",
  },
  systemBubble: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
  },
  text: {
    fontSize: 16,
    lineHeight: 23,
  },
  assistantText: {
    color: "#0f172a",
  },
  userText: {
    color: "#ffffff",
  },
  systemText: {
    color: "#9a3412",
  },
});
