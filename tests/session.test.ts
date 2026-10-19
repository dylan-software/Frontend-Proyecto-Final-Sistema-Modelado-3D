import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

/** In-memory stand-in for the browser's localStorage (vitest runs in Node). */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    has: (key: string) => data.has(key),
    get: (key: string) => data.get(key),
  };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("current room", () => {
  it("opens the remembered room when it still belongs to the account", async () => {
    const { chooseCurrentRoom } = await import("../src/lib/session");

    expect(chooseCurrentRoom([{ id: 2 }, { id: 5 }, { id: 9 }], 5)).toBe(5);
  });

  it("falls back to the newest room when the remembered one is gone or from another account", async () => {
    const { chooseCurrentRoom } = await import("../src/lib/session");

    expect(chooseCurrentRoom([{ id: 2 }, { id: 9 }], 7)).toBe(9);
    expect(chooseCurrentRoom([{ id: 2 }, { id: 9 }], null)).toBe(9);
  });

  it("has no current room when the account has none (the page invites to trace one)", async () => {
    const { chooseCurrentRoom } = await import("../src/lib/session");

    expect(chooseCurrentRoom([], 4)).toBeNull();
  });

  it("remembers the current room in localStorage and reads it back", async () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    const { readCurrentRoomId, saveCurrentRoomId } = await import("../src/lib/session");

    expect(readCurrentRoomId()).toBeNull();
    saveCurrentRoomId(12);

    expect(storage.get("current_room_id")).toBe("12");
    expect(readCurrentRoomId()).toBe(12);
  });

  it("ignores a stored value that is not a room id", async () => {
    vi.stubGlobal("localStorage", memoryStorage({ current_room_id: "demo-project" }));
    const { readCurrentRoomId } = await import("../src/lib/session");

    expect(readCurrentRoomId()).toBeNull();
  });

  it("forgets the current room when the session expires", async () => {
    const storage = memoryStorage({ auth_token: "t", auth_user_id: "5", current_room_id: "12" });
    vi.stubGlobal("localStorage", storage);
    const { expireSession } = await import("../src/lib/session");

    expireSession();

    expect(storage.has("auth_token")).toBe(false);
    expect(storage.has("auth_user_id")).toBe(false);
    expect(storage.has("current_room_id")).toBe(false);
  });

  it("works without storage (blocked or during prerendering)", async () => {
    vi.stubGlobal("localStorage", undefined);
    const { readCurrentRoomId, saveCurrentRoomId, clearStoredSession } = await import("../src/lib/session");

    expect(() => saveCurrentRoomId(1)).not.toThrow();
    expect(() => clearStoredSession()).not.toThrow();
    expect(readCurrentRoomId()).toBeNull();
  });
});
