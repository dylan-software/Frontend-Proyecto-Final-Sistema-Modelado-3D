import { useEffect, useRef, useState } from "react";

import { useTheme } from "../context/ThemeContext";
import { THEMES, THEME_ORDER } from "../styles/themes";

/**
 * Paint-palette button that opens a menu with the six interface themes.
 * Each option previews the theme's background, surface and accent colors.
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Opening the menu moves focus to the active theme, so keyboard users
  // land on the current choice instead of having to tab into the list.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
  }, [open]);

  // Clicking outside the menu or pressing Escape closes it.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Focus would otherwise fall back to <body> with the menu unmounted.
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
    <div className="theme-selector" ref={containerRef}>
      <button
        ref={toggleRef}
        type="button"
        className="theme-selector-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Cambiar tema (actual: ${theme.label})`}
      >
        <span aria-hidden="true">🎨</span>
        <span className="theme-selector-current">{theme.label}</span>
      </button>

      {open && (
        <div ref={menuRef} className="theme-selector-menu" role="group" aria-label="Temas de la interfaz">
          {THEME_ORDER.map((id) => {
            const option = THEMES[id];
            const { bg, surface, accent } = option.colors;
            return (
              <button
                key={id}
                type="button"
                className="theme-option"
                aria-pressed={id === theme.id}
                onClick={() => {
                  setTheme(id);
                  setOpen(false);
                  toggleRef.current?.focus();
                }}
              >
                <span className="theme-swatch" aria-hidden="true">
                  <span style={{ background: bg }} />
                  <span style={{ background: surface }} />
                  <span style={{ background: accent }} />
                </span>
                <span className="theme-option-text">
                  <span className="theme-option-label">{option.label}</span>
                  <span className="theme-option-description">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
