/**
 * Rutas de la aplicación y la única regla de redirección según haya sesión o no.
 */
export const ROUTES = {
  login: "/",
  projects: "/proyectos",
  social: "/red",
  project: (id: number) => `/proyecto/${encodeURIComponent(id)}`,
  /** Perfil público de la red social; protegido por la misma regla de sesión que el resto. */
  profile: (code: string) => `/red/perfil/${encodeURIComponent(code)}`,
} as const;

/**
 * Adónde redirigir desde `pathname` (ruta del router de páginas, p. ej. "/proyecto/[id]"), o null si
 * la página se queda. Con sesión, "/" lleva a Proyectos; sin sesión, cualquier otra ruta lleva a "/".
 * No hay bucle posible: "/" sin sesión y Proyectos con sesión no redirigen nunca.
 */
export function sessionRedirect(pathname: string, signedIn: boolean): string | null {
  const isLogin = pathname === ROUTES.login;
  if (signedIn && isLogin) return ROUTES.projects;
  if (!signedIn && !isLogin) return ROUTES.login;
  return null;
}

/** Lo que pinta una página con guardia: la pantalla de carga neutra o su propio contenido. */
export type SessionView = "loading" | "page";

/**
 * Decisión de la guardia de sesión para `pathname`. `signedIn` es null mientras no se sabe si hay
 * sesión. Hasta saberlo (y con el router listo) no se redirige, y mientras no se sabe o mientras se
 * redirige la página solo muestra la carga neutra: nunca su contenido ni el login.
 */
export function sessionGate(
  pathname: string,
  signedIn: boolean | null,
  routerReady: boolean
): { redirect: string | null; view: SessionView } {
  if (signedIn === null || !routerReady) return { redirect: null, view: "loading" };
  const redirect = sessionRedirect(pathname, signedIn);
  return { redirect, view: redirect === null ? "page" : "loading" };
}

/**
 * Sigue la redirección de la guardia con `replace` (no `push`): la página de la que se sale no queda en
 * el historial, así que "Atrás" no vuelve a una ruta que redirige otra vez.
 */
export function followSessionRedirect(router: { replace: (url: string) => unknown }, redirect: string | null): void {
  if (redirect !== null) void router.replace(redirect);
}
