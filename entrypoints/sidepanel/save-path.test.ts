import { describe, expect, it } from "vitest";
import {
  normalizeDownloadRelativePath,
  shouldFallbackToDownloadsFromWorkspaceError,
} from "./save-path";

describe("normalizeDownloadRelativePath", () => {
  it("preserves nested relative paths", () => {
    expect(normalizeDownloadRelativePath("output/blog/post.md")).toBe(
      "output/blog/post.md",
    );
  });

  it("normalizes windows separators", () => {
    expect(normalizeDownloadRelativePath("output\\blog\\post.md")).toBe(
      "output/blog/post.md",
    );
  });

  it("removes leading slashes and traversal segments", () => {
    expect(normalizeDownloadRelativePath("/../output/./blog/../post.md")).toBe(
      "output/post.md",
    );
  });

  it("falls back when the path becomes empty", () => {
    expect(normalizeDownloadRelativePath("../..///", "fallback.md")).toBe(
      "fallback.md",
    );
  });

  it("only falls back to downloads when no workspace is open", () => {
    expect(
      shouldFallbackToDownloadsFromWorkspaceError("No workspace folder open"),
    ).toBe(true);
    expect(
      shouldFallbackToDownloadsFromWorkspaceError("Invalid file path"),
    ).toBe(false);
    expect(
      shouldFallbackToDownloadsFromWorkspaceError("Path escapes workspace"),
    ).toBe(false);
  });
});