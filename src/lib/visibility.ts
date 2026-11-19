/**
 * Avisa cuándo un elemento entra o sale de la pantalla (con un margen, para empezar un poco antes de
 * que se vea). Lo usan las tarjetas de Proyectos para pedir su miniatura 3D solo al hacerse visibles.
 */

/** Margen alrededor de la pantalla: una tarjeta a menos de 200 px ya cuenta como visible. */
export const VISIBILITY_MARGIN = "200px";

type ObserverConstructor = new (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => Pick<IntersectionObserver, "observe" | "disconnect">;

/**
 * Llama a `onChange(true|false)` cada vez que `element` entra o sale de la pantalla y devuelve la
 * función que deja de observar. Sin IntersectionObserver (navegadores muy viejos), lo da por visible.
 */
export function observeVisibility(
  element: Element,
  onChange: (visible: boolean) => void,
  Observer: ObserverConstructor | undefined = globalThis.IntersectionObserver
): () => void {
  if (!Observer) {
    onChange(true);
    return () => undefined;
  }
  const observer = new Observer(
    (entries) => {
      const last = entries[entries.length - 1];
      if (last) onChange(last.isIntersecting);
    },
    { rootMargin: VISIBILITY_MARGIN }
  );
  observer.observe(element);
  return () => observer.disconnect();
}
