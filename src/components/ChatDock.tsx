import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { es } from "../i18n/es";
import { api, MAX_CHAT_MESSAGE_CHARS, type ChatChange, type ChatTurn } from "../lib/api";
import { describeChanges, toChatRequest } from "../lib/chat";
import { appendDictation } from "../lib/dictation";
import { DictationButton } from "./DictationButton";

const t = es.chat;

/** Un turno en pantalla: lo que se envía al backend más los cambios que guardó esa respuesta. */
type DisplayTurn = ChatTurn & { changes?: ChatChange[] };

interface ChatDockProps {
  /** Sala guardada sobre la que se conversa; null mientras no haya ninguna abierta. */
  roomId: number | null;
  /** Fila de acciones bajo el campo de texto (micrófono, "Foto a 3D"). */
  actions?: ReactNode;
  /** El chat guardó cambios en la sala (añadir, quitar o mover objetos). */
  onChanges?: (changes: ChatChange[]) => void;
}

/**
 * Chat acoplado al panel de IA: la misma conversación que ChatPanel (POST /api/v1/chat con la sala
 * actual, saludo local que no se envía, deshabilitado sin sala), pero sin ventana flotante. Los
 * mensajes se muestran SIEMPRE como texto plano: React escapa el contenido y el CSS solo respeta los
 * saltos de línea; nada de Markdown ni HTML. Si la respuesta guardó cambios, debajo va una línea
 * discreta por cambio ("Añadí: Cuadro, en la pared izquierda") y se avisa con onChanges.
 * El micrófono (DictationButton) va primero en la fila de acciones: lo dictado se escribe en el campo
 * y el mensaje solo se envía cuando el usuario pulsa "Enviar".
 */
export function ChatDock({ roomId, actions, onChanges }: ChatDockProps) {
  const [messages, setMessages] = useState<DisplayTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  /** Lo dictado se añade al campo y se le da el foco para revisarlo; enviar sigue siendo cosa del usuario. */
  function handleDictated(text: string) {
    setInput((current) => appendDictation(current, text, MAX_CHAT_MESSAGE_CHARS));
    inputRef.current?.focus();
  }

  // Mantiene a la vista el último mensaje (o la burbuja de "Pensando…").
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || roomId === null) return;

    const nextMessages: DisplayTurn[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const reply = await api.chatAboutRoom(roomId, toChatRequest(nextMessages));
      setMessages([...nextMessages, { role: "assistant", content: reply.content, changes: reply.changes }]);
      if (reply.changes.length > 0) onChanges?.(reply.changes);
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
          <Fragment key={i}>
            <div className={`chat-bubble chat-bubble-${m.role}`}>{m.content}</div>
            {m.changes && m.changes.length > 0 && (
              <div className="hint" role="status" aria-label={t.changes.label}>
                {describeChanges(m.changes).map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
              </div>
            )}
          </Fragment>
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
          ref={inputRef}
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

      <div className="chat-dock-actions">
        <DictationButton disabled={sending || disabled} onText={handleDictated} />
        {actions}
      </div>
    </div>
  );
}
