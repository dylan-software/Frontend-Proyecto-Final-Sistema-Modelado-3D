/**
 * Rótulos de la escena 3D que no se pisan. Los rótulos son HTML encima del lienzo (drei Html): su
 * tamaño en pantalla no depende de la distancia, así que el choque se resuelve en PÍXELES, con los
 * rectángulos que ocupan en pantalla en la vista actual.
 */

/** Rectángulo de un rótulo en pantalla, en píxeles (como getBoundingClientRect, y hacia abajo). */
export interface LabelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Separación mínima, en píxeles, entre dos rótulos apilados. */
export const LABEL_SPACING_PX = 2;

function overlaps(a: LabelRect, b: LabelRect, spacing: number): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height + spacing &&
    b.top < a.top + a.height + spacing
  );
}

/**
 * Cuánto subir cada rótulo (en píxeles, >= 0) para que ninguno pise a otro.
 *
 * Voraz: se colocan de abajo arriba en la pantalla (empates por orden de entrada); cada uno empieza en
 * su sitio y, si pisa a uno ya colocado, sube justo por encima de él, hasta quedar libre. Subir solo
 * aleja de los que ya se saltó, así que acaba en, como mucho, tantos pasos como rótulos colocados.
 * Determinista. Los rótulos sin rectángulo (null) o de tamaño 0 (ocultos) no se mueven ni estorban.
 *
 * Coste: O(n²) comparaciones en el peor caso, con n rótulos.
 */
export function spreadLabels(rects: readonly (LabelRect | null)[], spacing = LABEL_SPACING_PX): number[] {
  const offsets = rects.map(() => 0);
  const order = rects
    .map((rect, index) => ({ rect, index }))
    .filter((entry): entry is { rect: LabelRect; index: number } =>
      entry.rect !== null && entry.rect.width > 0 && entry.rect.height > 0,
    )
    .sort((a, b) => b.rect.top - a.rect.top || a.index - b.index);

  const placed: LabelRect[] = [];
  for (const { rect, index } of order) {
    let current = rect;
    for (let step = 0; step <= placed.length; step++) {
      const blocker = placed.find((other) => overlaps(current, other, spacing));
      if (!blocker) break;
      current = { ...current, top: blocker.top - spacing - current.height };
    }
    offsets[index] = rect.top - current.top;
    placed.push(current);
  }
  return offsets;
}
