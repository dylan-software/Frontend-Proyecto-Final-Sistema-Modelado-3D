import { useCallback, useEffect, useMemo, useState } from "react";

import { roomThumbnailCache, roomThumbnailKey, type ThumbnailRoom } from "../lib/roomThumbnails";
import { observeVisibility } from "../lib/visibility";

/**
 * Miniatura 3D de la tarjeta de una sala. Devuelve la URL de la imagen (o null) y el `ref` del
 * elemento que se observa. Solo la pide cuando la tarjeta está (casi) en pantalla; si deja de verse
 * antes de empezar, la petición sale de la cola. Mientras no hay URL, o si falla (sin WebGL, contexto
 * perdido...), la tarjeta sigue con el plano 2D. La escena (three.js) se descarga al pedir la primera.
 */
export function useRoomThumbnail(
  roomId: number,
  room: ThumbnailRoom | null
): { url: string | null; ref: (element: Element | null) => void } {
  const key = useMemo(() => (room ? roomThumbnailKey(roomId, room) : null), [roomId, room]);
  const [element, setElement] = useState<Element | null>(null);
  const [visible, setVisible] = useState(false);
  // Solo fuerza un nuevo render cuando llega una imagen: la URL se lee SIEMPRE de la caché, así una
  // imagen ya liberada (tope de la caché, sala olvidada) nunca se sigue usando.
  const [, setPainted] = useState(0);

  const ref = useCallback((next: Element | null) => setElement(next), []);

  useEffect(() => {
    if (!element) return;
    return observeVisibility(element, setVisible);
  }, [element]);

  const url = (key ? roomThumbnailCache.peek(key) : undefined) ?? null;

  useEffect(() => {
    if (!visible || !key || !room || url) return;
    const controller = new AbortController();
    let active = true;
    import("../render/thumbnailScene")
      .then(({ requestRoomThumbnail }) => requestRoomThumbnail(roomThumbnailCache, roomId, room, controller.signal))
      .then(
        () => {
          if (active) setPainted((n) => n + 1);
        },
        () => {
          // Sin miniatura (cancelada, sin WebGL o fallo): se queda el plano 2D.
        }
      );
    return () => {
      active = false;
      controller.abort();
    };
  }, [visible, key, room, roomId, url]);

  return { url, ref };
}
