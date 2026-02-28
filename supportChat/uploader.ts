import type { LocalAttachment } from "@/supportChat/types";

export interface UploadedAttachment {
  url: string;
  contentType: string;
  fileName: string;
}

export interface AttachmentUploader {
  upload(attachment: LocalAttachment): Promise<UploadedAttachment>;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0).toString(16);
}

export class StubAttachmentUploader implements AttachmentUploader {
  async upload(attachment: LocalAttachment): Promise<UploadedAttachment> {
    const suffix = hashString(`${attachment.uri}:${attachment.fileName}`);
    const fileName = attachment.fileName || `support-image-${suffix}.jpg`;

    return {
      url: `https://stub-cdn.basket.local/support/${suffix}/${encodeURIComponent(fileName)}`,
      contentType: attachment.mimeType || "image/jpeg",
      fileName,
    };
  }
}
