import { useRef, useState, useEffect } from "react";
import { api, type ChatTurn } from "../lib/api";

/** A single turn of the chat as shown in the panel and sent to the backend. */
export interface MessageInterface extends ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * POSTs the whole conversation to the backend and resolves with the
 * assistant's reply as a new chat message.
 */
async function sendPromptToBackend(projectId: string, history: MessageInterface[]): Promise<MessageInterface> {
  const reply = await api.chat(projectId, history);
  return { role: "assistant", content: reply.content };
}

interface ChatPanelProps {
  projectId: string;
}

/**
 * AI organization assistant. Every message goes through the backend's
 * /api/chat, which runs the OpenRouter tool-calling loop — the
 * assistant can query the real room shape and placed items (see
 * backend/src/ai/sceneAssistant.ts) before answering, but it only ever
 * sees that structured data, never a picture of the room.
 */
export function ChatPanel({ projectId }: ChatPanelProps) {
  const [messages, setMessages] = useState<MessageInterface[]>([
    {
      role: "assistant",
      content: "Hi! Ask me how to organize your space — I can check its shape and what's placed in it so far.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the floating chat window is expanded; the conversation is kept while it's closed.
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest message (or the "Thinking…" bubble) in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, isOpen]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: MessageInterface[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const reply = await sendPromptToBackend(projectId, nextMessages);
      setMessages([...nextMessages, reply]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-widget">
      {isOpen && (
        <div className="chat-panel-inner chat-window" role="dialog" aria-label="AI Assistant">
          <div className="chat-window-header">
            <h2>AI Assistant</h2>
            <button type="button" className="chat-minimize" onClick={() => setIsOpen(false)} aria-label="Minimize chat">
              –
            </button>
          </div>
          <p className="hint">
            Gets its answers from the real data of your project (room shape + placed items) — it cannot see a photo or
            render of the space.
          </p>

          <div className="chat-messages" ref={scrollRef} aria-busy={sending}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble-${m.role}`}>
                {m.content}
              </div>
            ))}
            {sending && <div className="chat-bubble chat-bubble-assistant">Thinking…</div>}
          </div>

          {error && (
            <p className="warning connection-alert" role="alert">
              {error}
            </p>
          )}

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. How should I arrange my furniture?"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()}>
              {sending ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
      >
        {isOpen ? "×" : "💬"}
      </button>
    </div>
  );
}
