import { es } from "../i18n/es";
import { descriptionCount } from "../lib/groups";

interface DescriptionCounterProps {
  /** id para enlazarlo desde el campo con aria-describedby. */
  id: string;
  /** Texto del campo tal como está (el contador quita los espacios de los extremos, como el backend). */
  text: string;
  max: number;
  className?: string;
}

/**
 * Contador visible "120 / 500" de una descripción mientras se edita, con su versión para lectores de
 * pantalla ("120 de 500 caracteres"). Si el texto ya pasaba del límite (una descripción antigua), se
 * marca y dice cuántos caracteres sobran. No es una región viva: se lee al enfocar el campo, no a cada
 * tecla. Sin estado (se prueba renderizándolo en el servidor).
 */
export function DescriptionCounter({ id, text, max, className = "" }: DescriptionCounterProps) {
  const t = es.inlineEdit;
  const { used, over } = descriptionCount(text, max);
  return (
    <span id={id} className={`description-count${over > 0 ? " is-over" : ""} ${className}`.trim()}>
      <span aria-hidden="true">{t.count(used, max)}</span>
      <span className="visually-hidden">{t.countLabel(used, max)}</span>
      {over > 0 && <span className="description-count-over">{t.overLimit(over)}</span>}
    </span>
  );
}
