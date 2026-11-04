import { describe, it, expect, vi, afterEach } from "vitest";

import { AI_PANEL_OPEN_KEY, readAiPanelOpen, saveAiPanelOpen } from "../src/lib/uiPrefs";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    get: (key: string) => data.get(key),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AI panel preference", () => {
  it("is open by default", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    expect(readAiPanelOpen()).toBe(true);
  });

  it("stores only 'true' or 'false' under ui_ai_panel_open and reads it back", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    saveAiPanelOpen(false);
    expect(storage.get(AI_PANEL_OPEN_KEY)).toBe("false");
    expect(readAiPanelOpen()).toBe(false);

    saveAiPanelOpen(true);
    expect(storage.get("ui_ai_panel_open")).toBe("true");
    expect(readAiPanelOpen()).toBe(true);
  });

  it("treats any other stored value as open", () => {
    vi.stubGlobal("localStorage", memoryStorage({ ui_ai_panel_open: "0" }));
    expect(readAiPanelOpen()).toBe(true);
  });

  it("works with blocked storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readAiPanelOpen()).toBe(true);
    expect(() => saveAiPanelOpen(false)).not.toThrow();
  });
});
