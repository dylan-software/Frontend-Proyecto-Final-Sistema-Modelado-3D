import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_THEME_ID, THEMES, cssVarName, type Theme, type ThemeColors, type ThemeId } from "../styles/themes";

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
  const theme = THEMES[themeId];

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme: setThemeId }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The active theme and its setter. Must be used under <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return context;
}
