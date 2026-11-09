import Link from "next/link";

import { es } from "../i18n/es";
import { ROUTES } from "../lib/routes";
import { IconClose, IconSearch } from "./icons";
import { ThemeSelector } from "./ThemeSelector";
import { UserMenu } from "./UserMenu";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userName: string | null;
  onLogout: () => void;
}

/** Marca de la aplicación: la esquina de un plano con su cota. */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="7" fill="var(--color-accent-soft)" stroke="var(--color-accent-glow)" />
      <path d="M8 20V8h12" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12h8v8h-8z" fill="none" stroke="var(--color-accent)" strokeWidth="1.2" strokeDasharray="2 2" />
    </svg>
  );
}

/**
 * Barra superior del contenedor: marca a la izquierda, buscador de proyectos al centro (filtra en el
 * navegador) y, a la derecha, el selector de tema y el menú de usuario.
 */
export function TopBar({ searchQuery, onSearchChange, userName, onLogout }: TopBarProps) {
  const t = es.shell;
  return (
    <header className="top-bar glass">
      <Link href={ROUTES.projects} className="top-bar-brand" aria-label={t.homeLink}>
        <BrandMark />
        <span className="top-bar-title">{es.app.title}</span>
      </Link>

      <form className="top-bar-search" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="visually-hidden" htmlFor="project-search">
          {t.searchLabel}
        </label>
        <IconSearch className="top-bar-search-icon" size={18} />
        <input
          id="project-search"
          type="search"
          className="top-bar-search-input"
          placeholder={t.searchPlaceholder}
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button type="button" className="top-bar-search-clear" aria-label={t.clearSearch} onClick={() => onSearchChange("")}>
            <IconClose size={16} />
          </button>
        )}
      </form>

      <div className="top-bar-actions">
        <ThemeSelector />
        <UserMenu userName={userName} onLogout={onLogout} />
      </div>
    </header>
  );
}
