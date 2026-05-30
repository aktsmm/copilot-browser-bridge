import { describe, expect, it } from "vitest";

import { parseActionsFromResponse } from "./browser-actions";

describe("parseActionsFromResponse security bounds", () => {
  it("ignores negative and oversized optional timeouts", () => {
    expect(
      parseActionsFromResponse("[ACTION: waitForSelector, #ready,-1]"),
    ).toEqual([
      { type: "waitForSelector", selector: "#ready,-1", timeout: undefined },
    ]);
    expect(
      parseActionsFromResponse("[ACTION: waitForText, Complete,99999999]"),
    ).toEqual([
      { type: "waitForText", text: "Complete,99999999", timeout: undefined },
    ]);
  });

  it("preserves bounded optional timeouts", () => {
    expect(
      parseActionsFromResponse("[ACTION: waitForTextGone, Loading,5000]"),
    ).toEqual([{ type: "waitForTextGone", text: "Loading", timeout: 5000 }]);
  });

  it("truncates malformed raw Playwright params", () => {
    const longRaw = "{" + "x".repeat(12_000);
    const [action] = parseActionsFromResponse(
      `[ACTION: playwright, browser_click, ${longRaw}]`,
    );

    expect(action).toMatchObject({
      type: "playwright",
      action: "browser_click",
    });
    if (!action || action.type !== "playwright") {
      throw new Error("Expected playwright action");
    }
    expect(String(action.params.raw).length).toBeLessThan(10_050);
    expect(String(action.params.raw)).toContain("[truncated]");
  });
});
