import { describe, expect, it } from "vitest";

import { getDownloadShowId, isValidDownloadId, MAX_DOWNLOAD_ID } from "./download-id";

describe("download id validation", () => {
  it("accepts bounded integer download ids", () => {
    expect(isValidDownloadId(0)).toBe(true);
    expect(isValidDownloadId(123)).toBe(true);
    expect(isValidDownloadId(MAX_DOWNLOAD_ID)).toBe(true);
  });

  it("rejects malformed, negative, unsafe, and too-large download ids", () => {
    expect(isValidDownloadId(-1)).toBe(false);
    expect(isValidDownloadId(1.5)).toBe(false);
    expect(isValidDownloadId(Number.MAX_SAFE_INTEGER)).toBe(false);
    expect(isValidDownloadId("1")).toBe(false);
    expect(getDownloadShowId("download-show:abc")).toBeNull();
    expect(getDownloadShowId("download-show:1?x=2")).toBeNull();
    expect(getDownloadShowId(`download-show:${MAX_DOWNLOAD_ID + 1}`)).toBeNull();
  });
});