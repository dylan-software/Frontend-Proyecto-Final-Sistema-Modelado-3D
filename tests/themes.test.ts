import { describe, it, expect } from "vitest";

import { DEFAULT_THEME_ID, THEMES, THEME_ORDER, cssVarName, isThemeId, type ThemeColors } from "../src/styles/themes";

describe("theme palette", () => {
  it("lists each of the six themes exactly once in the selector order", () => {
    expect(THEME_ORDER).toHaveLength(6);
    expect(new Set(THEME_ORDER)).toEqual(new Set(Object.keys(THEMES)));
  });

  it("keys every theme by its own id", () => {
    for (const [key, theme] of Object.entries(THEMES)) {
      expect(theme.id).toBe(key);
    }
  });

  it("defines the same color tokens in every theme, so switching never leaves a stale variable", () => {
    const expected = Object.keys(THEMES[DEFAULT_THEME_ID].colors).sort();
    for (const theme of Object.values(THEMES)) {
      expect(Object.keys(theme.colors).sort()).toEqual(expected);
    }
  });
});

describe("isThemeId", () => {
  it("accepts the six theme ids", () => {
    for (const id of THEME_ORDER) expect(isThemeId(id)).toBe(true);
  });

  it("rejects unknown or corrupted localStorage values", () => {
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId("")).toBe(false);
    expect(isThemeId("solarized")).toBe(false);
    // Inherited Object properties must not count as themes.
    expect(isThemeId("toString")).toBe(false);
  });
});

describe("cssVarName", () => {
  it("turns camelCase tokens into kebab-case custom properties", () => {
    expect(cssVarName("bg")).toBe("--color-bg");
    expect(cssVarName("surfaceAlt")).toBe("--color-surface-alt");
    expect(cssVarName("accentContrast" satisfies keyof ThemeColors)).toBe("--color-accent-contrast");
  });
});
