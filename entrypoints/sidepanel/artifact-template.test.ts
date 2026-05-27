import { describe, expect, it } from "vitest";
import {
  buildArtifactRelativePath,
  buildBlogDraftContent,
  buildSavedMarkdownContent,
  slugifyArtifactSegment,
} from "./artifact-template";

describe("artifact templates", () => {
  it("slugifies titles for filenames", () => {
    expect(slugifyArtifactSegment("Hello, GitHub Copilot! 2026")).toBe(
      "hello-github-copilot-2026",
    );
  });

  it("builds blog artifact paths under the configured base path", () => {
    const createdAt = new Date("2026-05-27T12:34:56.000Z");
    expect(
      buildArtifactRelativePath(
        "output/blog",
        "Product Update",
        "blog-draft",
        createdAt,
      ),
    ).toContain("output/blog/");
  });

  it("builds saved markdown content with URL and assistant body", () => {
    const content = buildSavedMarkdownContent({
      pageTitle: "Example",
      pageUrl: "https://example.com",
      assistantContent: "Summary body",
      createdAt: new Date("2026-05-27T12:00:00.000Z"),
    });

    expect(content).toContain("# Example");
    expect(content).toContain("https://example.com");
    expect(content).toContain("Summary body");
  });

  it("builds blog draft content with primary sources section", () => {
    const content = buildBlogDraftContent({
      pageTitle: "Example",
      pageUrl: "https://example.com",
      assistantContent: "Notes body",
      createdAt: new Date("2026-05-27T12:00:00.000Z"),
    });

    expect(content).toContain("## Draft Notes");
    expect(content).toContain("## Primary Sources");
  });
});
