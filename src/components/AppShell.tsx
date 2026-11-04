import { useRouter } from "next/router";
import type { ReactNode } from "react";

import { es } from "../i18n/es";
import { ROUTES } from "../lib/routes";
import { SideNav, type NavSection } from "./SideNav";
import { TopBar } from "./TopBar";

interface AppShellProps {
  active: NavSection;
  userName: string | null;
  onLogout: () => void;
  /** Búsqueda actual; solo Proyectos la usa para filtrar. */
  searchQuery?: string;
  /** Sin este callback (p. ej. en Red Social), escribir en el buscador lleva a Proyectos con la búsqueda. */
  onSearchChange?: (query: string) => void;
  children: ReactNode;
}

/**
 * Contenedor común de Proyectos y Red Social: barra superior, barra lateral y el contenido. El fondo
 * es una retícula de plano muy tenue, lo que se ve a través del vidrio de las barras y las tarjetas.
 */
export function AppShell({ active, userName, onLogout, searchQuery = "", onSearchChange, children }: AppShellProps) {
  const router = useRouter();

  function handleSearchChange(query: string) {
    if (onSearchChange) onSearchChange(query);
    else void router.push({ pathname: ROUTES.projects, query: query ? { q: query } : {} });
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {es.shell.skipToContent}
      </a>
      <TopBar searchQuery={searchQuery} onSearchChange={handleSearchChange} userName={userName} onLogout={onLogout} />
      <div className="app-shell-body">
        <SideNav active={active} />
        <main id="main-content" className="app-shell-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
