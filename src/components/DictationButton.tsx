import { useEffect, useId, useRef, useState } from "react";

import { es } from "../i18n/es";
import { DictationSession, detectDictationSupport, dictationErrorMessage, type DictationSupport } from "../lib/dictation";

const t = es.dictation;

/** "unknown" hasta montar en el navegador (en el servidor no hay window). */
export type DictationSupportKind = DictationSupport["kind"] | "unknown";

interface DictationViewProps {
  support: DictationSupportKind;
  listening: boolean;
  /** Estado en curso ("Escuchando…", el texto provisional, "Listo…"); se anuncia con aria-live. */
  status: string | null;
  /** Error en español (permiso, micrófono, conexión, silencio…). */
  error: string | null;
  disabled: boolean;
  onToggle: () => void;
}

/** Icono de micrófono. */
function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Parte visible del dictado, sin estado: se prueba renderizándola en el servidor. Sin soporte no hay
 * botón, solo una línea que lo explica. Con soporte: el botón (que pasa a "Cancelar" mientras
 * escucha), una línea de estado con aria-live y el aviso de privacidad, enlazado al botón.
 */
export function DictationView({ support, listening, status, error, disabled, onToggle }: DictationViewProps) {
  const noteId = useId();

  if (support === "unknown") return null;
  if (support !== "supported") {
    return <p className="dictation-note">{support === "insecure" ? t.errors.insecure : t.unsupported}</p>;
  }

  return (
    <div className="dictation">
      <button
        type="button"
        className={`dictation-button${listening ? " dictation-listening" : ""}`}
        onClick={onToggle}
        disabled={disabled && !listening}
        aria-pressed={listening}
        aria-label={listening ? t.cancelLabel : t.startLabel}
        aria-describedby={noteId}
        title={listening ? t.cancelLabel : t.startLabel}
      >
        {listening ? <span className="dictation-pulse" aria-hidden="true" /> : <MicIcon />}
        {listening ? t.cancel : t.start}
      </button>
      <p className="dictation-status" role="status" aria-live="polite">
        {status ?? ""}
      </p>
      {error && (
        <p className="dictation-error warning" role="alert">
          {error}
        </p>
      )}
      <p id={noteId} className="dictation-note">
        {t.privacy}
      </p>
    </div>
  );
}

interface DictationButtonProps {
  /** Mientras el chat envía o no hay sala, no se puede empezar a dictar. */
  disabled: boolean;
  /** Recibe el texto definitivo para escribirlo en el campo del chat (nunca para enviarlo). */
  onText: (text: string) => void;
}

/**
 * Botón de micrófono del chat. Al montar solo DETECTA el soporte; el permiso del micrófono lo pide el
 * navegador al pulsar (DictationSession.start). Al desmontar o deshabilitarse, cancela la escucha.
 */
export function DictationButton({ disabled, onText }: DictationButtonProps) {
  const [support, setSupport] = useState<DictationSupportKind>("unknown");
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<DictationSession | null>(null);
  const ctorRef = useRef<DictationSupport | null>(null);
  // Si la escucha que termina entregó texto (para decir "Listo" o limpiar el estado).
  const gotTextRef = useRef(false);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    const detected = detectDictationSupport(window);
    ctorRef.current = detected;
    setSupport(detected.kind);
    return () => sessionRef.current?.cancel();
  }, []);

  // Si el chat se deshabilita (por ejemplo, empieza a enviar), se deja de escuchar.
  useEffect(() => {
    if (disabled) sessionRef.current?.cancel();
  }, [disabled]);

  function getSession(): DictationSession | null {
    if (sessionRef.current) return sessionRef.current;
    const detected = ctorRef.current;
    if (!detected || detected.kind !== "supported") return null;
    sessionRef.current = new DictationSession(detected.ctor, {
      onInterim: (text) => setStatus(t.heard(text)),
      onFinal: (text) => {
        gotTextRef.current = true;
        onTextRef.current(text);
      },
      onError: (code) => setError(dictationErrorMessage(code)),
      onEnd: () => {
        setListening(false);
        // Tras cancelar se conserva "Dictado cancelado"; si hubo texto, se invita a revisarlo.
        setStatus((current) => (gotTextRef.current ? t.done : current === t.cancelled ? current : null));
      },
    });
    return sessionRef.current;
  }

  function handleToggle() {
    const session = getSession();
    if (!session) return;

    if (listening) {
      session.cancel();
      gotTextRef.current = false;
      setListening(false);
      setStatus(t.cancelled);
      return;
    }

    setError(null);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError(dictationErrorMessage("offline"));
      return;
    }
    gotTextRef.current = false;
    setListening(true);
    setStatus(t.listening);
    session.start();
  }

  return (
    <DictationView
      support={support}
      listening={listening}
      status={status}
      error={error}
      disabled={disabled}
      onToggle={handleToggle}
    />
  );
}
