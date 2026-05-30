import { describe, expect, it } from "vitest";

import {
  getAutoProviderLabel,
  getAutoProviderOrder,
  getCapabilityStatus,
} from "./auto-provider";

describe("Auto provider helpers", () => {
  it("uses VS Code LM first for text mode", () => {
    expect(getAutoProviderOrder("text")).toEqual([
      "vscode-lm",
      "copilot-sdk",
      "copilot-cli",
    ]);
  });

  it("uses Copilot SDK first for browser-agent modes", () => {
    expect(getAutoProviderOrder("hybrid")).toEqual([
      "copilot-sdk",
      "vscode-lm",
      "copilot-cli",
    ]);
    expect(getAutoProviderOrder("screenshot")).toEqual([
      "copilot-sdk",
      "vscode-lm",
      "copilot-cli",
    ]);
  });

  it("renders compact provider labels and capability statuses", () => {
    expect(getAutoProviderLabel("vscode-lm")).toBe("VS Code LM");
    expect(getAutoProviderLabel("copilot-sdk")).toBe("Copilot SDK");
    expect(getAutoProviderLabel("copilot-cli")).toBe("Copilot CLI");
    expect(
      getCapabilityStatus(
        {
          version: "test",
          recommended: { chat: "vscode-lm", agent: "copilot-sdk" },
          providers: [
            {
              id: "copilot-sdk",
              name: "GitHub Copilot SDK",
              status: "available",
            },
          ],
        },
        "copilot-sdk",
      ),
    ).toBe("available");
  });
});
