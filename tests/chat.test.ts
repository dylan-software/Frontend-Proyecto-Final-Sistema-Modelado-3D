import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import { MAX_CHAT_MESSAGE_CHARS, MAX_CHAT_MESSAGES, type ChatChange, type ChatTurn } from "../src/lib/api";
import { describeChanges, toChatRequest } from "../src/lib/chat";

const turn = (i: number): ChatTurn => ({ role: i % 2 === 0 ? "user" : "assistant", content: `mensaje ${i}` });

describe("toChatRequest", () => {
  it("keeps a short conversation unchanged", () => {
    const history = [turn(0), turn(1), turn(2)];
    expect(toChatRequest(history)).toEqual(history);
  });

  it("sends only the last MAX_CHAT_MESSAGES turns, ending with the newest", () => {
    const history = Array.from({ length: MAX_CHAT_MESSAGES + 5 }, (_, i) => turn(i));
    const sent = toChatRequest(history);
    expect(sent).toHaveLength(MAX_CHAT_MESSAGES);
    expect(sent[0]).toEqual(turn(5));
    expect(sent.at(-1)).toEqual(turn(MAX_CHAT_MESSAGES + 4));
  });

  it("cuts a long assistant reply to MAX_CHAT_MESSAGE_CHARS so the next request is not a 422", () => {
    const sent = toChatRequest([
      { role: "assistant", content: "a".repeat(MAX_CHAT_MESSAGE_CHARS + 300) },
      { role: "user", content: "¿y ahora?" },
    ]);
    expect(sent[0].content).toHaveLength(MAX_CHAT_MESSAGE_CHARS);
    expect(sent[1].content).toBe("¿y ahora?");
  });

  it("counts code points like the backend, without splitting an emoji", () => {
    const sent = toChatRequest([{ role: "assistant", content: "🛋".repeat(MAX_CHAT_MESSAGE_CHARS + 1) }]);
    expect(Array.from(sent[0].content)).toHaveLength(MAX_CHAT_MESSAGE_CHARS);
    expect(sent[0].content.endsWith("🛋")).toBe(true);
  });

  it("drops empty or blank turns, which the backend rejects", () => {
    const sent = toChatRequest([
      { role: "assistant", content: "" },
      { role: "user", content: "   " },
      { role: "user", content: "hola" },
    ]);
    expect(sent).toEqual([{ role: "user", content: "hola" }]);
  });

  it("does not modify the history it receives", () => {
    const history: ChatTurn[] = [{ role: "assistant", content: "b".repeat(MAX_CHAT_MESSAGE_CHARS + 1) }];
    toChatRequest(history);
    expect(history[0].content).toHaveLength(MAX_CHAT_MESSAGE_CHARS + 1);
  });
});

describe("describeChanges", () => {
  it("says each saved change in one plain line", () => {
    const changes: ChatChange[] = [
      { action: "added", name: "Cuadro", where: "en la pared izquierda" },
      { action: "removed", name: "Silla", where: "en el suelo" },
      { action: "moved", name: "Mesa", where: "en el suelo, junto a la pared del fondo" },
    ];

    expect(describeChanges(changes)).toEqual([
      "Añadí: Cuadro, en la pared izquierda",
      "Quité: Silla",
      "Moví: Mesa, en el suelo, junto a la pared del fondo",
    ]);
  });

  it("skips unknown actions and an empty list gives no lines", () => {
    expect(describeChanges([{ action: "painted", name: "Pared", where: "" } as unknown as ChatChange])).toEqual([]);
    expect(describeChanges([])).toEqual([]);
  });
});

describe("api.chatAboutRoom", () => {
  function memoryStorage(initial: Record<string, string>) {
    const data = new Map(Object.entries(initial));
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    };
  }

  function answer(body: unknown) {
    return vi.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => null }, json: async () => body });
  }

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", memoryStorage({ auth_token: "header.payload.signature", auth_user_id: "5" }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns the changes the chat saved", async () => {
    const changes = [{ action: "added", name: "Cuadro", where: "en la pared izquierda" }];
    vi.stubGlobal("fetch", answer({ role: "assistant", content: "Añadí «Cuadro» en la pared izquierda.", changes }));
    const { api } = await import("../src/lib/api");

    const reply = await api.chatAboutRoom(3, [{ role: "user", content: "Pon un cuadro" }]);

    const [url, init] = vi.mocked(fetch).mock.calls.at(-1)!;
    expect(url).toBe("http://localhost:8000/api/v1/chat");
    expect(JSON.parse(init!.body as string)).toEqual({ roomId: 3, messages: [{ role: "user", content: "Pon un cuadro" }] });
    expect(reply).toEqual({ role: "assistant", content: "Añadí «Cuadro» en la pared izquierda.", changes });
  });

  it("an answer without changes (an older backend) gives an empty list", async () => {
    vi.stubGlobal("fetch", answer({ role: "assistant", content: "Hola." }));
    const { api } = await import("../src/lib/api");

    expect(await api.chatAboutRoom(3, [{ role: "user", content: "Hola" }])).toEqual({
      role: "assistant",
      content: "Hola.",
      changes: [],
    });
  });
});
describe("toChatRequest with displayed changes", () => {
  it("sends only role and content, never the changes shown on screen", () => {
    const shown = [
      { role: "user" as const, content: "Pon un cuadro" },
      {
        role: "assistant" as const,
        content: "Añadí «Cuadro» en la pared izquierda.",
        changes: [{ action: "added" as const, name: "Cuadro", where: "en la pared izquierda" }],
      },
    ];

    expect(toChatRequest(shown)).toEqual([
      { role: "user", content: "Pon un cuadro" },
      { role: "assistant", content: "Añadí «Cuadro» en la pared izquierda." },
    ]);
  });
});