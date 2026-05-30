import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { getBridgeProviderStatusLabel, Settings } from "./Settings";
import type { BridgeCapabilities, LLMSettings } from "../types";

const noop = vi.fn();

function buildSettings(provider: LLMSettings["provider"]): LLMSettings {
  return {
    provider,
    copilot: { model: "gpt-4o" },
    lmStudio: { endpoint: "http://localhost:1234", model: "" },
  };
}

function renderSettings(options?: {
  provider?: LLMSettings["provider"];
  isConnected?: boolean;
  capabilities?: BridgeCapabilities | null;
  capabilitiesErrorDetail?: string | null;
  language?: "ja" | "en";
  operationMode?: "text" | "hybrid" | "screenshot";
}) {
  return renderToStaticMarkup(
    <Settings
      settings={buildSettings(options?.provider ?? "auto")}
      onSettingsChange={noop}
      onClose={noop}
      isConnected={options?.isConnected ?? true}
      availableModels={[{ provider: "copilot", id: "gpt-4o", name: "GPT-4o" }]}
      modelFetchFailed={false}
      bridgeCapabilities={options?.capabilities ?? null}
      capabilitiesErrorDetail={options?.capabilitiesErrorDetail ?? null}
      onRefreshCapabilities={noop}
      onRefreshModels={noop}
      browserActionsEnabled={true}
      onBrowserActionsChange={noop}
      fileOperationsEnabled={true}
      onFileOperationsChange={noop}
      language={options?.language ?? "en"}
      onLanguageChange={noop}
      maxAgentLoops={500}
      onMaxAgentLoopsChange={noop}
      operationMode={options?.operationMode ?? "hybrid"}
      onOperationModeChange={noop}
      serverPort={3210}
      onServerPortChange={noop}
      allowHighRiskActions={true}
      onAllowHighRiskActionsChange={noop}
      allowEvaluateAction={false}
      onAllowEvaluateActionChange={noop}
      saveDestinationMode="browser-downloads"
      onSaveDestinationModeChange={noop}
      saveRelativePath="output/blog"
      onSaveRelativePathChange={noop}
    />,
  );
}

describe("Settings provider UI", () => {
  it("renders all explicit provider choices including SDK and CLI", () => {
    const html = renderSettings();

    expect(html).toContain("Auto (Recommended)");
    expect(html).toContain("GitHub Copilot (Chat)");
    expect(html).toContain("GitHub Copilot (Agent)");
    expect(html).toContain("GitHub Copilot SDK (Agent)");
    expect(html).toContain("GitHub Copilot CLI");
    expect(html).toContain("LM Studio");
    expect(html).toContain(
      "All current providers run through a local bridge: either the VS Code extension or the standalone companion.",
    );
  });

  it("localizes Auto label and shows unchecked Auto route status", () => {
    const html = renderSettings({ language: "ja", provider: "auto" });

    expect(html).toContain("Auto (推奨)");
    expect(html).toContain("Auto 経路");
    expect(html).toContain("未取得");
  });

  it("shows the current Auto provider order for browser-agent modes", () => {
    const html = renderSettings({
      provider: "auto",
      operationMode: "hybrid",
      capabilities: {
        version: "0.1.16-test",
        bridge: "standalone",
        recommended: { chat: "vscode-lm", agent: "copilot-sdk" },
        providers: [
          {
            id: "copilot-sdk",
            name: "GitHub Copilot SDK",
            status: "available",
          },
          {
            id: "vscode-lm",
            name: "VS Code Language Model API",
            status: "available",
          },
          {
            id: "copilot-cli",
            name: "GitHub Copilot CLI",
            status: "unavailable",
          },
        ],
      },
    });

    expect(html).toContain("Auto route");
    expect(html).toContain(
      "Browser-agent modes try the Copilot SDK path first.",
    );
    expect(html.indexOf("1. Copilot SDK")).toBeLessThan(
      html.indexOf("2. VS Code LM"),
    );
    expect(html.indexOf("2. VS Code LM")).toBeLessThan(
      html.indexOf("3. Copilot CLI"),
    );
  });

  it("shows VS Code LM first for Auto text mode", () => {
    const html = renderSettings({ provider: "auto", operationMode: "text" });

    expect(html).toContain(
      "Text mode tries the lightweight VS Code LM path first.",
    );
    expect(html.indexOf("1. VS Code LM")).toBeLessThan(
      html.indexOf("2. Copilot SDK"),
    );
  });

  it("hides Auto route details for explicit providers", () => {
    const html = renderSettings({ provider: "copilot-sdk" });

    expect(html).toContain("GitHub Copilot SDK (Agent)");
    expect(html).not.toContain("Auto route");
    expect(html).not.toContain("1. Copilot SDK");
    expect(html).not.toContain("not checked");
  });

  it("localizes new provider helper text and bridge status labels", () => {
    const html = renderSettings({
      language: "ja",
      capabilities: {
        version: "0.1.16-test",
        bridge: "standalone",
        recommended: { chat: "vscode-lm", agent: "copilot-sdk" },
        providers: [
          {
            id: "vscode-lm",
            name: "VS Code Language Model API",
            status: "available",
          },
          {
            id: "copilot-sdk",
            name: "GitHub Copilot SDK",
            status: "unavailable",
          },
          { id: "copilot-cli", name: "GitHub Copilot CLI", status: "unknown" },
        ],
      },
    });

    expect(html).toContain("利用可能な bridge provider を自動選択");
    expect(html).toContain("ツール権限は既定でブロック");
    expect(html).toContain("Copilot CLI prompt 経路を直接使用");
    expect(html).toContain("Chrome 拡張単体ではなくローカル bridge が必要");
    expect(html).toContain("利用可能");
    expect(html).toContain("利用不可");
    expect(html).toContain("未確認");
  });

  it("maps provider status labels by locale", () => {
    expect(getBridgeProviderStatusLabel("available", "ja")).toBe("利用可能");
    expect(getBridgeProviderStatusLabel("unavailable", "ja")).toBe("利用不可");
    expect(getBridgeProviderStatusLabel("unknown", "ja")).toBe("未確認");
    expect(getBridgeProviderStatusLabel(null, "ja")).toBe("未取得");
    expect(getBridgeProviderStatusLabel("available", "en")).toBe("available");
    expect(getBridgeProviderStatusLabel(null, "en")).toBe("not checked");
  });

  it("renders bridge capabilities and provider status details", () => {
    const html = renderSettings({
      capabilities: {
        version: "0.1.16-test",
        bridge: "standalone",
        recommended: { chat: "vscode-lm", agent: "copilot-sdk" },
        providers: [
          {
            id: "vscode-lm",
            name: "VS Code Language Model API",
            status: "available",
          },
          {
            id: "copilot-sdk",
            name: "GitHub Copilot SDK",
            status: "unknown",
            detail: "Runtime auth is checked on first request.",
          },
          {
            id: "copilot-cli",
            name: "GitHub Copilot CLI",
            status: "unavailable",
          },
          { id: "lm-studio", name: "LM Studio", status: "unknown" },
        ],
      },
    });

    expect(html).toContain("Bridge status");
    expect(html).toContain("Bridge version: 0.1.16-test");
    expect(html).toContain("Bridge type: standalone");
    expect(html).toContain("VS Code Language Model API");
    expect(html).toContain("available");
    expect(html).toContain("GitHub Copilot SDK");
    expect(html).toContain("Runtime auth is checked on first request.");
    expect(html).toContain("GitHub Copilot CLI");
    expect(html).toContain("unavailable");
  });

  it("shows bridge connection and capability errors in settings", () => {
    expect(renderSettings({ isConnected: false })).toContain(
      "Local bridge is not connected.",
    );

    expect(
      renderSettings({
        capabilitiesErrorDetail:
          "Capabilities request failed (401 Unauthorized)",
      }),
    ).toContain("Capabilities request failed (401 Unauthorized)");
  });

  it("hides the Copilot model selector for the explicit CLI provider", () => {
    const html = renderSettings({ provider: "copilot-cli" });

    expect(html).toContain("GitHub Copilot CLI");
    expect(html).not.toContain('aria-label="Model selection"');
  });
});
