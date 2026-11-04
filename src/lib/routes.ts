/**
 * Rutas de la aplicación y la única regla de redirección según haya sesión o no.
 */
export const ROUTES = {
  login: "/",
  projects: "/proyectos",
  social: "/red",
  project: (id: number) => `/proyecto/${encodeURIComponent(id)}`,
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
