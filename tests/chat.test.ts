import { describe, it, expect } from "vitest";

import { MAX_CHAT_MESSAGE_CHARS, MAX_CHAT_MESSAGES, type ChatTurn } from "../src/lib/api";
import { toChatRequest } from "../src/lib/chat";

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
