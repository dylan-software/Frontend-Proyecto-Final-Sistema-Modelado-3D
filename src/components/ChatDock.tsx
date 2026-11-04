import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { es } from "../i18n/es";
import { api, MAX_CHAT_MESSAGE_CHARS, type ChatTurn } from "../lib/api";
import { toChatRequest } from "../lib/chat";

const t = es.chat;

interface ChatDockProps {
  /** Sala guardada sobre la que se conversa; null mientras no haya ninguna abierta. */
  roomId: number | null;
  /** Fila de acciones bajo el campo de texto (micrófono, "Foto a 3D"). */
  actions?: ReactNode;
}

/**
 * Chat acoplado al panel de IA: la misma conversación que ChatPanel (POST /api/v1/chat con la sala
 * actual, saludo local que no se envía, deshabilitado sin sala), pero sin ventana flotante. Los
 * mensajes se muestran SIEMPRE como texto plano: React escapa el contenido y el CSS solo respeta los
 * saltos de línea; nada de Markdown ni HTML.
 */
export function ChatDock({ roomId, actions }: ChatDockProps) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  // Mantiene a la vista el último mensaje (o la burbuja de "Pensando…").
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

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
    <div className="chat-dock">
      <div className="chat-dock-messages" ref={scrollRef} aria-busy={sending} aria-live="polite">
        <div className="chat-bubble chat-bubble-assistant">{t.greeting}</div>
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble chat-bubble-${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="chat-bubble chat-bubble-assistant">{t.thinking}</div>}
      </div>

      <p className="chat-dock-note" role="note">
        {t.privacyNotice}
      </p>
      {disabled && <p className="warning">{t.noRoom}</p>}
      {error && (
        <p className="warning connection-alert" role="alert">
          {error}
        </p>
      )}

      <form
        className="chat-dock-composer"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <label className="visually-hidden" htmlFor={inputId}>
          {t.inputLabel}
        </label>
        <input
          id={inputId}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          maxLength={MAX_CHAT_MESSAGE_CHARS}
          disabled={sending || disabled}
          autoComplete="off"
        />
        <button type="submit" disabled={sending || disabled || !input.trim()}>
          {sending ? t.sending : t.send}
        </button>
      </form>

      {actions && <div className="chat-dock-actions">{actions}</div>}
    </div>
  );
}
