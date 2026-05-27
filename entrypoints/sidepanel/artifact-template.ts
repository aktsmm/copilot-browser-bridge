import { normalizeDownloadRelativePath } from "./save-path";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateStamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeStamp(date: Date): string {
  return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function slugifyArtifactSegment(input: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "untitled";
}

export function buildArtifactRelativePath(
  basePath: string,
  title: string,
  kind: "summary" | "blog-draft",
  createdAt = new Date(),
): string {
  const slug = slugifyArtifactSegment(title);
  const datePart = formatDateStamp(createdAt);
  const timePart = formatTimeStamp(createdAt);
  return normalizeDownloadRelativePath(
    `${basePath}/${datePart}-${slug}-${kind}-${timePart}.md`,
  );
}

interface ArtifactContentInput {
  pageTitle: string;
  pageUrl: string;
  assistantContent: string;
  createdAt: Date;
}

export function buildSavedMarkdownContent({
  pageTitle,
  pageUrl,
  assistantContent,
  createdAt,
}: ArtifactContentInput): string {
  return [
    `# ${pageTitle || "Untitled Page"}`,
    "",
    `- Saved At: ${createdAt.toISOString()}`,
    `- Source URL: ${pageUrl || "(unknown)"}`,
    "",
    "## Summary",
    "",
    assistantContent.trim() || "(empty assistant response)",
    "",
    "## Primary Source",
    "",
    `- ${pageUrl || "(unknown)"}`,
  ].join("\n");
}

export function buildBlogDraftContent({
  pageTitle,
  pageUrl,
  assistantContent,
  createdAt,
}: ArtifactContentInput): string {
  return [
    `# Blog Draft: ${pageTitle || "Untitled Page"}`,
    "",
    `- Drafted At: ${createdAt.toISOString()}`,
    `- Source URL: ${pageUrl || "(unknown)"}`,
    "",
    "## Angle",
    "",
    "- What is the strongest user-facing takeaway?",
    "- Why does it matter now?",
    "- What should the reader do next?",
    "",
    "## Draft Notes",
    "",
    assistantContent.trim() || "(empty assistant response)",
    "",
    "## Primary Sources",
    "",
    `- ${pageTitle || "Source page"}`,
    `- ${pageUrl || "(unknown)"}`,
  ].join("\n");
}
