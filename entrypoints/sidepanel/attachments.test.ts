import { describe, expect, it } from "vitest";
import {
  buildAttachmentDisplayText,
  classifyAttachmentFile,
  MAX_IMAGE_ATTACHMENT_BYTES,
  truncateAttachmentText,
} from "./attachments";

describe("attachment helpers", () => {
  it("classifies text attachments", () => {
    expect(
      classifyAttachmentFile({
        name: "note.md",
        type: "text/markdown",
        size: 100,
      }),
    ).toEqual({ ok: true, kind: "text" });
  });

  it("classifies image attachments within size limit", () => {
    expect(
      classifyAttachmentFile({
        name: "image.png",
        type: "image/png",
        size: 1024,
      }),
    ).toEqual({ ok: true, kind: "image" });
  });

  it("rejects oversized image attachments", () => {
    expect(
      classifyAttachmentFile({
        name: "image.png",
        type: "image/png",
        size: MAX_IMAGE_ATTACHMENT_BYTES + 1,
      }),
    ).toEqual({ ok: false, reason: "too-large" });
  });

  it("classifies pdf attachments for fallback handling", () => {
    expect(
      classifyAttachmentFile({
        name: "spec.pdf",
        type: "application/pdf",
        size: 100,
      }),
    ).toEqual({ ok: true, kind: "pdf" });
  });

  it("builds a readable attachment display block", () => {
    expect(
      buildAttachmentDisplayText(
        [
          {
            id: "1",
            name: "note.md",
            kind: "text",
            mimeType: "text/markdown",
            size: 10,
          },
        ],
        {
          heading: "添付ファイル",
          pdfNote: "PDF 添付",
          textLabel: "テキスト",
          imageLabel: "画像",
        },
      ),
    ).toContain("添付ファイル:");
  });

  it("uses localized labels for text and image attachments", () => {
    const content = buildAttachmentDisplayText(
      [
        {
          id: "1",
          name: "note.md",
          kind: "text",
          mimeType: "text/markdown",
          size: 10,
        },
        {
          id: "2",
          name: "image.png",
          kind: "image",
          mimeType: "image/png",
          size: 10,
        },
      ],
      {
        heading: "添付ファイル",
        pdfNote: "PDF 添付",
        textLabel: "テキスト",
        imageLabel: "画像",
      },
    );

    expect(content).toContain("note.md (テキスト)");
    expect(content).toContain("image.png (画像)");
  });

  it("truncates oversized text attachment content", () => {
    expect(truncateAttachmentText("x".repeat(9000))).toContain("[truncated]");
  });
});
