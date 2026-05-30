export function normalizeDownloadRelativePath(
  inputPath: string,
  fallbackFilename = "download.txt",
): string {
  const normalized = inputPath.replace(/\\/g, "/").trim();
  const segments: string[] = [];

  for (const rawSegment of normalized.split("/")) {
    const segment = rawSegment.trim();
    if (segment.length === 0 || segment === ".") {
      continue;
    }

    if (segment === "..") {
      return fallbackFilename;
    }

    segments.push(segment);
  }

  if (segments.length === 0) {
    return fallbackFilename;
  }

  return segments.join("/");
}

export function shouldFallbackToDownloadsFromWorkspaceError(
  errorMessage: string | undefined,
): boolean {
  return errorMessage?.includes("No workspace folder open") === true;
}
