export const MAX_DOWNLOAD_ID = 10_000_000;

export function isValidDownloadId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_DOWNLOAD_ID
  );
}

export function getDownloadShowId(href: string): number | null {
  if (!/^download-show:\d+$/.test(href)) {
    return null;
  }

  const downloadId = Number.parseInt(href.slice("download-show:".length), 10);
  return isValidDownloadId(downloadId) ? downloadId : null;
}