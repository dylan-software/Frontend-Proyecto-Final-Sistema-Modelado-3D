import { describe, it, expect, vi, afterEach } from "vitest";

import {
  AI_PANEL_OPEN_KEY,
  groupOpenKey,
  readAiPanelOpen,
  readGroupOpen,
  saveAiPanelOpen,
  saveGroupOpen,
} from "../src/lib/uiPrefs";

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

describe("group section preference", () => {
  it("uses one key per group and one for the projects without a group", () => {
    expect(groupOpenKey(7)).toBe("ui_group_open_7");
    expect(groupOpenKey(null)).toBe("ui_group_open_none");
  });

  it("is open by default and remembers each group on its own", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    expect(readGroupOpen(1)).toBe(true);

    saveGroupOpen(1, false);
    saveGroupOpen(null, false);

    expect(readGroupOpen(1)).toBe(false);
    expect(readGroupOpen(2)).toBe(true);
    expect(readGroupOpen(null)).toBe(false);
    saveGroupOpen(1, true);
    expect(readGroupOpen(1)).toBe(true);
  });

  it("stores only 'true' or 'false'", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    saveGroupOpen(3, false);
    saveGroupOpen(4, true);

    expect([storage.get("ui_group_open_3"), storage.get("ui_group_open_4")]).toEqual(["false", "true"]);
  });

  it("works with blocked storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readGroupOpen(1)).toBe(true);
    expect(() => saveGroupOpen(1, false)).not.toThrow();
  });
});
