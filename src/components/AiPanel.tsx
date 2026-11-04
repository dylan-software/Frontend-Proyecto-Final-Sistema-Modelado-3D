import { useId, type ReactNode } from "react";

import { es } from "../i18n/es";

interface AiPanelProps {
  /** Desplegado (true) o recogido en la barra delgada (false). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El chat (ChatDock), que ocupa casi todo el alto. */
  chat: ReactNode;
  /** Debajo del chat: el buscador de muebles y la sección plegable. */
  children?: ReactNode;
  /** Texto del botón de recoger: "Minimizar" en escritorio, "Cerrar" en la capa del móvil. */
  collapseLabel?: string;
  className?: string;
}

/** Icono del asistente: un bocadillo con tres puntos. */
function AssistantIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 4v-4h0.5A2.5 2.5 0 0 1 4 13.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="10" r="1" fill="currentColor" />
      <circle cx="12" cy="10" r="1" fill="currentColor" />
      <circle cx="15.5" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Panel izquierdo de la pantalla del proyecto. Recogido, se queda en una barra delgada con el icono
 * del asistente; el contenido NO se desmonta (solo se oculta con `hidden`), así que la conversación,
 * el texto a medio escribir y el formulario se conservan.
 */
export function AiPanel({ open, onOpenChange, chat, children, collapseLabel, className = "" }: AiPanelProps) {
  const t = es.aiPanel;
  const contentId = useId();
  const titleId = useId();

  return (
    <aside className={`ai-panel glass${open ? "" : " ai-panel-collapsed"} ${className}`.trim()} aria-labelledby={titleId}>
      {!open && (
        <button
          type="button"
          className="ai-panel-rail"
          onClick={() => onOpenChange(true)}
          aria-expanded={false}
          aria-controls={contentId}
          aria-label={t.expand}
          title={t.expand}
        >
          <AssistantIcon />
        </button>
      )}

      <div id={contentId} className="ai-panel-content" hidden={!open}>
        <header className="ai-panel-header">
          <span className="ai-panel-icon">
            <AssistantIcon />
          </span>
          <h2 id={titleId} className="ai-panel-title">
            {t.title}
          </h2>
          <button
            type="button"
            className="ai-panel-collapse"
            onClick={() => onOpenChange(false)}
            aria-expanded={true}
            aria-controls={contentId}
            aria-label={collapseLabel ?? t.minimize}
            title={collapseLabel ?? t.minimize}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="ai-panel-chat">{chat}</div>
        {children && <div className="ai-panel-extras">{children}</div>}
      </div>
    </aside>
  );
}
