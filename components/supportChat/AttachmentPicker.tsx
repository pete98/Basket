import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LocalAttachment } from "@/supportChat/types";

interface AttachmentPickerProps {
  attachments: LocalAttachment[];
  disabled?: boolean;
  onAddAttachment: (attachment: LocalAttachment) => void;
  onRemoveAttachment: (attachmentId: string) => void;
}

function toLocalAttachment(
  asset: ImagePicker.ImagePickerAsset,
): LocalAttachment {
  return {
    id: `${asset.fileName || "image"}:${asset.uri}`,
    uri: asset.uri,
    fileName: asset.fileName || `image-${Date.now()}.jpg`,
    mimeType: asset.mimeType || "image/jpeg",
    width: asset.width,
    height: asset.height,
  };
}

export function AttachmentPicker(props: AttachmentPickerProps) {
  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (result.canceled || result.assets.length === 0) return;
    props.onAddAttachment(toLocalAttachment(result.assets[0]));
  }

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;
    props.onAddAttachment(toLocalAttachment(result.assets[0]));
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          style={[styles.button, props.disabled ? styles.disabled : null]}
          onPress={() => void pickFromCamera()}
          disabled={props.disabled}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
        >
          <Ionicons name="camera" size={14} color="#0f172a" />
          <Text style={styles.buttonText}>Take photo</Text>
        </Pressable>

        <Pressable
          style={[styles.button, props.disabled ? styles.disabled : null]}
          onPress={() => void pickFromLibrary()}
          disabled={props.disabled}
          accessibilityRole="button"
          accessibilityLabel="Choose from gallery"
        >
          <Ionicons name="images" size={14} color="#0f172a" />
          <Text style={styles.buttonText}>Choose from gallery</Text>
        </Pressable>
      </View>

      {props.attachments.map((attachment) => (
        <View key={attachment.id} style={styles.attachmentRow}>
          <View style={styles.attachmentMeta}>
            <Text style={styles.attachmentName} numberOfLines={1}>
              {attachment.fileName}
            </Text>
            <Text style={styles.attachmentType}>{attachment.mimeType}</Text>
          </View>
          <Pressable
            onPress={() => props.onRemoveAttachment(attachment.id)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${attachment.fileName}`}
          >
            <Ionicons name="close-circle" size={18} color="#dc2626" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  disabled: {
    opacity: 0.45,
  },
  attachmentRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  attachmentType: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748b",
  },
});
