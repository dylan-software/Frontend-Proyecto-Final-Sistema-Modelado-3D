import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { es } from "../i18n/es";

/** Líneas que se ven de la descripción recortada (debe coincidir con -webkit-line-clamp en project.css). */
export const CLAMPED_LINES = 2;

interface DescriptionToggleProps {
  expanded: boolean;
  /** id del bloque que se despliega (aria-controls). */
  controls: string;
  onToggle: () => void;
}

/** "Ver más" / "Ver menos" bajo la descripción. Sin estado (se prueba renderizándolo en el servidor). */
export function DescriptionToggle({ expanded, controls, onToggle }: DescriptionToggleProps) {
  return (
    <button
      type="button"
      className="description-toggle"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
    >
      {expanded ? es.project.showLess : es.project.showMore}
    </button>
  );
}

/**
 * ¿El texto ocupa más de `lines` líneas? Compara la altura total del contenido (scrollHeight, que
 * incluye lo recortado) con `lines` alturas de línea. Con line-height "normal" se supone 1,4.
 */
export function exceedsLines(scrollHeight: number, lineHeightPx: number, fontSizePx: number, lines: number): boolean {
  const lineHeight = Number.isFinite(lineHeightPx) && lineHeightPx > 0 ? lineHeightPx : fontSizePx * 1.4;
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return false;
  return scrollHeight > lineHeight * lines + 1;
}

interface ClampedDescriptionProps {
  /** Estado guardado por el padre: dura mientras la página está abierta (no se guarda en el navegador). */
  expanded: boolean;
  onToggle: () => void;
  /** La descripción editable (InlineEdit); el lápiz queda fuera del recorte. */
  children: ReactNode;
}

/**
 * Envuelve la descripción del proyecto. En el móvil, el CSS la recorta a dos líneas mientras no esté
 * desplegada; aquí solo se mide si de verdad hay más texto, para enseñar "Ver más" únicamente entonces.
 * Mientras se edita (no hay texto mostrado) el botón no aparece. En el escritorio el CSS oculta el botón.
 */
export function ClampedDescription({ expanded, onToggle, children }: ClampedDescriptionProps) {
  const id = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const text = box.querySelector<HTMLElement>(".inline-edit-text");
      if (!text) {
        setLong(false);
        return;
      }
      const style = window.getComputedStyle(text);
      setLong(exceedsLines(text.scrollHeight, parseFloat(style.lineHeight), parseFloat(style.fontSize), CLAMPED_LINES));
    };
    measure();
    // Se vuelve a medir al cambiar el ancho (girar el móvil) y al abrir o cerrar la edición.
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(box);
    const mutation = new MutationObserver(measure);
    mutation.observe(box, { childList: true, subtree: true, characterData: true });
    return () => {
      resize?.disconnect();
      mutation.disconnect();
    };
  }, []);

  return (
    <>
      <div id={id} ref={boxRef} className={`description-clamp${expanded ? " is-expanded" : ""}`}>
        {children}
      </div>
      {long && <DescriptionToggle expanded={expanded} controls={id} onToggle={onToggle} />}
    </>
  );
}
