import { useRef, useState, useEffect } from "react";
import { api, MAX_CHAT_MESSAGE_CHARS, type ChatTurn } from "../lib/api";
import { toChatRequest } from "../lib/chat";
import { es } from "../i18n/es";

const t = es.chat;

interface ChatPanelProps {
  /** Sala guardada sobre la que se conversa; null mientras no haya ninguna abierta. */
  roomId: number | null;
}

/**
 * Asistente de IA flotante. Cada mensaje va a POST /api/v1/chat con la sala
 * actual: el backend le pasa al modelo la forma real y los muebles colocados,
 * nunca una imagen. Sin sala guardada, el chat queda deshabilitado.
 * El saludo inicial es local y no se envía al backend.
 */
export function ChatPanel({ roomId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Si la ventana está abierta; la conversación se conserva mientras está cerrada.
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mantiene a la vista el último mensaje (o la burbuja de "Pensando…").
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, isOpen]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || roomId === null) return;

    const nextMessages: ChatTurn[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const reply = await api.chatAboutRoom(roomId, toChatRequest(nextMessages));
      setMessages([...nextMessages, { role: "assistant", content: reply.content }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const disabled = roomId === null;

  return (
    <div className="chat-widget">
      {isOpen && (
        <div className="chat-panel-inner chat-window" role="dialog" aria-label={t.title}>
          <div className="chat-window-header">
            <h2>{t.title}</h2>
            <button type="button" className="chat-minimize" onClick={() => setIsOpen(false)} aria-label={t.minimize}>
              –
            </button>
          </div>
          <p className="hint">{t.dataHint}</p>
          <p className="hint" role="note">
            {t.privacyNotice}
          </p>

          <div className="chat-messages" ref={scrollRef} aria-busy={sending}>
            <div className="chat-bubble chat-bubble-assistant">{t.greeting}</div>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble-${m.role}`}>
                {m.content}
              </div>
            ))}
            {sending && <div className="chat-bubble chat-bubble-assistant">{t.thinking}</div>}
          </div>

          {disabled && <p className="warning">{t.noRoom}</p>}
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
              placeholder={t.placeholder}
              maxLength={MAX_CHAT_MESSAGE_CHARS}
              disabled={sending || disabled}
            />
            <button type="submit" disabled={sending || disabled || !input.trim()}>
              {sending ? t.sending : t.send}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? t.close : t.open}
      >
        {isOpen ? "×" : "💬"}
      </button>
    </div>
  );
}
