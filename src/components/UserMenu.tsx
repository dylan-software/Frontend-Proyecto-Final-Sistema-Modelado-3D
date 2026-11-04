import { useEffect, useId, useRef, useState } from "react";

import { es } from "../i18n/es";
import { userInitial } from "../lib/projects";

interface UserMenuProps {
  /** Nombre guardado del usuario, o null en sesiones sin él (se muestra "Mi cuenta"). */
  userName: string | null;
  onLogout: () => void;
}

/**
 * Chip con la inicial y el nombre del usuario que abre un menú con "Cerrar sesión". Es el único sitio
 * de la aplicación con ese botón. Se cierra con Escape, con un clic fuera o al elegir una opción.
 */
export function UserMenu({ userName, onLogout }: UserMenuProps) {
  const t = es.shell;
  const label = userName ?? t.myAccount;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Al abrir, el foco pasa a la primera opción para poder usar el menú con el teclado.
  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        ref={toggleRef}
        type="button"
        className="user-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t.userMenu(label)}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="user-chip-initial" aria-hidden="true">
          {userInitial(userName, t.myAccount)}
        </span>
        <span className="user-chip-name">{label}</span>
        <svg className="user-chip-caret" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div id={menuId} className="user-menu-panel glass" role="menu" aria-label={t.userMenu(label)}>
          <p className="user-menu-who">
            <span className="user-menu-who-label">{t.signedInAs}</span>
            <span className="user-menu-who-name">{label}</span>
          </p>
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            className="user-menu-logout"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6M10.5 11 13.5 8l-3-3M13.5 8H6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t.logout}
          </button>
        </div>
      )}
    </div>
  );
}
