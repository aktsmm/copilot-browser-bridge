export type ChatAttachmentKind = "text" | "image" | "pdf";

export interface ChatAttachment {
  id: string;
  name: string;
  kind: ChatAttachmentKind;
  mimeType: string;
  size: number;
  textContent?: string;
  dataUrl?: string;
  note?: string;
}

export const MAX_ATTACHMENT_COUNT = 5;
export const MAX_TEXT_ATTACHMENT_CHARS = 8000;
export const MAX_IMAGE_ATTACHMENT_BYTES = 2 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "html",
  "htm",
  "js",
  "ts",
  "tsx",
  "jsx",
  "css",
  "yml",
  "yaml",
  "xml",
  "log",
]);

function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function classifyAttachmentFile(file: {
  name: string;
  type: string;
  size: number;
}):
  | { ok: true; kind: ChatAttachmentKind }
  | { ok: false; reason: "unsupported" | "too-large" } {
  if (file.type === "application/pdf" || getExtension(file.name) === "pdf") {
    return { ok: true, kind: "pdf" };
  }

  if (file.type.startsWith("image/")) {
    return file.size > MAX_IMAGE_ATTACHMENT_BYTES
      ? { ok: false, reason: "too-large" }
      : { ok: true, kind: "image" };
  }

  if (
    TEXT_EXTENSIONS.has(getExtension(file.name)) ||
    file.type.startsWith("text/")
  ) {
    return { ok: true, kind: "text" };
  }

  return { ok: false, reason: "unsupported" };
}

export function truncateAttachmentText(text: string): string {
  return text.length > MAX_TEXT_ATTACHMENT_CHARS
    ? `${text.slice(0, MAX_TEXT_ATTACHMENT_CHARS)}\n...[truncated]`
    : text;
}

export function buildAttachmentDisplayText(
  attachments: ChatAttachment[],
  labels: {
    heading: string;
    pdfNote: string;
    textLabel: string;
    imageLabel: string;
  } = {
    heading: "Attached files",
    pdfNote: "PDF attached, text extraction skipped",
    textLabel: "text",
    imageLabel: "image",
  },
): string {
  if (attachments.length === 0) {
    return "";
  }

  const lines = attachments.map((attachment) => {
    if (attachment.kind === "pdf") {
      return `- ${attachment.name} (${labels.pdfNote})`;
    }

    return `- ${attachment.name} (${attachment.kind === "text" ? labels.textLabel : labels.imageLabel})`;
  });

  return `\n\n${labels.heading}:\n${lines.join("\n")}`;
}
