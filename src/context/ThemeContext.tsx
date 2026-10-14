import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_THEME_ID, THEMES, cssVarName, isThemeId, type Theme, type ThemeColors, type ThemeId } from "../styles/themes";

/** localStorage key holding the id of the last theme the user picked. */
export const THEME_STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Writes the theme's tokens as CSS custom properties on <html>. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [token, value] of Object.entries(theme.colors)) {
    root.style.setProperty(cssVarName(token as keyof ThemeColors), value);
  }
  root.style.colorScheme = theme.colorScheme;
  root.dataset.theme = theme.id;
}

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
