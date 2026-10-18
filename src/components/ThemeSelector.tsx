import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

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

  /**
   * Arrow keys move between the six options (wrapping around at the ends);
   * Home and End jump to the first and last one.
   */
  function handleMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const options = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>(".theme-option"));
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    switch (e.key) {
      case "ArrowDown":
        next = (current + 1) % options.length;
        break;
      case "ArrowUp":
        next = (current - 1 + options.length) % options.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = options.length - 1;
        break;
      default:
        return;
    }
    // Keeps the page from scrolling along with the focus.
    e.preventDefault();
    options[next]?.focus();
  }

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
        <div
          ref={menuRef}
          className="theme-selector-menu"
          role="group"
          aria-label="Temas de la interfaz"
          onKeyDown={handleMenuKeyDown}
        >
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
