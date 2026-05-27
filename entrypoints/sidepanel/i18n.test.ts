import { describe, expect, it } from "vitest";
import { translations } from "./i18n";

describe("GitHub Copilot branding", () => {
  it("uses GitHub Copilot wording in Japanese settings text", () => {
    expect(translations.ja.appTitle).toContain("GitHub Copilot");
    expect(translations.ja.modelFetchFailed).toContain("GitHub Copilot");
  });

  it("uses GitHub Copilot wording in English settings text", () => {
    expect(translations.en.appTitle).toContain("GitHub Copilot");
    expect(translations.en.modelFetchFailed).toContain("GitHub Copilot");
  });
});
