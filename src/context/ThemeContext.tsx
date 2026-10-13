/**
 * Global theme dispatcher for the six interface themes (src/styles/themes.ts).
 *
 * How a theme reaches the UI:
 *   1. `setTheme(id)` updates one piece of state in <ThemeProvider>.
 *   2. An effect writes that theme's tokens as CSS custom properties on
 *      <html> (`--color-bg`, `--color-accent`, …) and sets `data-theme`.
 *   3. globals.css reads only those variables, so the browser restyles the
 *      whole page in a single style recalculation.
 *
 * Rendering cost: components style themselves through CSS, not through the
 * context, so switching themes re-renders only the components that call
 * `useTheme()` (the selector and the 3D viewer's highlight color) — not the
 * dashboard tree. The context value is memoized for the same reason: an
 * unrelated re-render of the provider doesn't hand consumers a new object.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_THEME_ID, THEMES, cssVarName, isThemeId, type Theme, type ThemeColors, type ThemeId } from "../styles/themes";

/** localStorage key holding the id of the last theme the user picked. */
export const THEME_STORAGE_KEY = "theme";

interface ThemeContextValue {
  /** The active theme, with its full color palette. */
  theme: Theme;
  /** Switches the whole interface to another theme and remembers the choice. */
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Writes the theme's tokens as CSS custom properties on <html>.
 * O(k) for k tokens (14); inline styles on the root win over the
 * `:root` fallbacks in globals.css.
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [token, value] of Object.entries(theme.colors)) {
    root.style.setProperty(cssVarName(token as keyof ThemeColors), value);
  }
  root.style.colorScheme = theme.colorScheme;
  root.dataset.theme = theme.id;
}

/**
 * Holds the selected theme for the whole app (mounted in _app.tsx).
 * Starts on the default theme so the server and the first client render
 * match, then restores the user's saved choice from localStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
  // False until the stored preference has been read, so the default theme
  // doesn't overwrite it on the first render.
  const [hydrated, setHydrated] = useState(false);
  const theme = THEMES[themeId];

  // localStorage doesn't exist during server prerendering, so the saved
  // theme is restored after mounting.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeId(stored)) setThemeId(stored);
    } catch {
      // Storage blocked: keep the default theme.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (!hydrated) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    } catch {
      // Storage blocked or full: the theme still applies for this visit.
    }
  }, [theme, hydrated]);

  const value = useMemo(() => ({ theme, setTheme: setThemeId }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The active theme and its setter. Must be used under <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return context;
}
