import { describe, expect, it } from "vitest";

import { getQuickActions, markdownSanitizeSchema } from "./Chat";
import { getDownloadShowId } from "../download-id";

describe("getQuickActions", () => {
  it("uses grounded, non-navigating Japanese prompts", () => {
    const prompts = getQuickActions("ja").map((action) => action.prompt);

    expect(prompts.join("\n")).toContain("ブラウザ操作");
    expect(prompts.join("\n")).toContain("抽出済み本文");
    expect(prompts.join("\n")).toContain("Markdown");
    expect(prompts.join("\n")).toContain("保存や新しいブラウザ操作");
    expect(prompts.every((prompt) => prompt.includes("ページ遷移"))).toBe(true);
  });

  it("uses grounded, non-navigating English prompts", () => {
    const prompts = getQuickActions("en").map((action) => action.prompt);

    expect(prompts.join("\n")).toContain("extracted page text");
    expect(prompts.join("\n")).toContain("Do not navigate");
    expect(prompts.join("\n")).toContain("Markdown");
    expect(prompts.join("\n")).toContain("Do not save files");
    expect(prompts.every((prompt) => prompt.includes("Do not navigate"))).toBe(
      true,
    );
  });

  it("keeps internal download-show links available for click handling", () => {
    expect(markdownSanitizeSchema.protocols?.href).toContain("download-show");
  });

  it("accepts only numeric internal download-show ids", () => {
    expect(getDownloadShowId("download-show:123")).toBe(123);
    expect(getDownloadShowId("download-show:abc")).toBeNull();
    expect(getDownloadShowId("download-show:1?x=2")).toBeNull();
    expect(getDownloadShowId("download-show:10000001")).toBeNull();
    expect(getDownloadShowId("https://example.com")).toBeNull();
  });
});
