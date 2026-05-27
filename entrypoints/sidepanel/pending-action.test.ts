import { describe, expect, it } from "vitest";

import { toPendingPrompt } from "./pending-action";

describe("toPendingPrompt", () => {
  it("returns null for null or non-object input", () => {
    expect(toPendingPrompt(null, "ja")).toBeNull();
    expect(toPendingPrompt(undefined, "ja")).toBeNull();
    expect(toPendingPrompt("summarize", "ja")).toBeNull();
    expect(toPendingPrompt(42, "ja")).toBeNull();
  });

  it("returns null when type is unknown", () => {
    expect(toPendingPrompt({ type: "unknown" }, "ja")).toBeNull();
    expect(toPendingPrompt({}, "ja")).toBeNull();
  });

  it("converts summarize action to a localized prompt", () => {
    expect(toPendingPrompt({ type: "summarize" }, "ja")).toBe(
      "このページを要約して",
    );
    expect(toPendingPrompt({ type: "summarize" }, "en")).toBe(
      "Summarize this page",
    );
  });

  it("returns the trimmed text for a question action", () => {
    expect(
      toPendingPrompt({ type: "question", text: "  hello world  " }, "ja"),
    ).toBe("hello world");
  });

  it("returns null when question text is empty or whitespace only", () => {
    expect(toPendingPrompt({ type: "question", text: "" }, "ja")).toBeNull();
    expect(toPendingPrompt({ type: "question", text: "   " }, "ja")).toBeNull();
  });

  it("returns null when question text is missing or non-string", () => {
    expect(toPendingPrompt({ type: "question" }, "ja")).toBeNull();
    expect(
      toPendingPrompt({ type: "question", text: 123 as unknown }, "ja"),
    ).toBeNull();
  });
});
