import { useEffect, useState } from "react";

/**
 * Si la consulta de medios se cumple, y se actualiza al cambiar el tamaño de la ventana. Empieza en
 * false (en el prerenderizado no hay ventana) y se corrige al montar.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}
