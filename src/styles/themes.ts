/** Identifiers of the six selectable interface themes. */
export type ThemeId = "dark" | "neon" | "purple" | "light" | "lightBlue" | "gray";

/**
 * Color tokens of one theme. Each key becomes a CSS custom property
 * (`surfaceAlt` → `--color-surface-alt`) that globals.css reads.
 */
export interface ThemeColors {
  /** Page background. */
  bg: string;
  /** Cards and panels (sections, chat window, auth card). */
  surface: string;
  /** Recessed areas inside a card: 3D viewers, previews, secondary buttons. */
  surfaceAlt: string;
  /** Background of text inputs and selects. */
  inputBg: string;
  /** Solid borders (inputs, tags, tracks). */
  border: string;
  /** Hairline borders and dividers. */
  borderSoft: string;
  text: string;
  textMuted: string;
  /** Call-to-action color (buttons, focus rings, highlights). */
  accent: string;
  accentHover: string;
  /** Text drawn on top of the accent color. */
  accentContrast: string;
  /** Translucent accent for tinted backgrounds. */
  accentSoft: string;
  /** Translucent accent for glows and focus halos. */
  accentGlow: string;
  /** Card drop shadow. */
  shadow: string;
}

export interface Theme {
  id: ThemeId;
  /** Name shown in the selector. */
  label: string;
  /** Short mood descriptor shown under the name. */
  description: string;
  /** Native form controls and scrollbars follow this scheme. */
  colorScheme: "dark" | "light";
  colors: ThemeColors;
}

export const THEMES: Record<ThemeId, Theme> = {
  dark: {
    id: "dark",
    label: "Oscuro",
    description: "Profesional",
    colorScheme: "dark",
    colors: {
      // «Plano de obra», grafito: acento salvia claro; el roble de las cotas vive en tokens.css.
      bg: "#16191c",
      surface: "#1f2327",
      surfaceAlt: "#1a1d21",
      inputBg: "#16191c",
      border: "#687079",
      borderSoft: "rgba(231, 233, 230, 0.09)",
      text: "#e7e9e6",
      textMuted: "#a1a8ae",
      accent: "#7fc2a8",
      accentHover: "#9ad3bc",
      accentContrast: "#10231c",
      accentSoft: "rgba(127, 194, 168, 0.14)",
      accentGlow: "rgba(127, 194, 168, 0.4)",
      shadow: "0 1px 2px rgba(8, 10, 12, 0.4), 0 12px 32px rgba(8, 10, 12, 0.38)",
    },
  },
  neon: {
    id: "neon",
    label: "Verde Neón",
    description: "Dinámico",
    colorScheme: "dark",
    colors: {
      bg: "#050a06",
      surface: "#0f1a11",
      surfaceAlt: "#0a140c",
      inputBg: "#050a06",
      border: "#3f7148",
      borderSoft: "rgba(57, 255, 20, 0.1)",
      text: "#e8ffe9",
      textMuted: "#86a889",
      accent: "#39ff14",
      accentHover: "#7dff5c",
      accentContrast: "#041004",
      accentSoft: "rgba(57, 255, 20, 0.12)",
      accentGlow: "rgba(57, 255, 20, 0.4)",
      shadow: "0 1px 2px rgba(0, 0, 0, 0.5), 0 12px 32px rgba(0, 0, 0, 0.5)",
    },
  },
  purple: {
    id: "purple",
    label: "Morado",
    description: "Creativo",
    colorScheme: "dark",
    colors: {
      bg: "#140d1f",
      surface: "#1f1530",
      surfaceAlt: "#1a1128",
      inputBg: "#120b1c",
      border: "#76629f",
      borderSoft: "rgba(214, 188, 255, 0.1)",
      text: "#f1e9ff",
      textMuted: "#a796c4",
      accent: "#b57bff",
      accentHover: "#cfa6ff",
      accentContrast: "#140d1f",
      accentSoft: "rgba(181, 123, 255, 0.14)",
      accentGlow: "rgba(181, 123, 255, 0.4)",
      shadow: "0 1px 2px rgba(8, 3, 15, 0.45), 0 12px 32px rgba(8, 3, 15, 0.45)",
    },
  },
  light: {
    id: "light",
    label: "Claro",
    description: "Limpio",
    colorScheme: "light",
    colors: {
      // «Plano de obra», papel técnico frío: acento salvia profundo.
      bg: "#f3f4f1",
      surface: "#ffffff",
      surfaceAlt: "#f7f8f5",
      inputBg: "#ffffff",
      border: "#858c92",
      borderSoft: "rgba(30, 34, 38, 0.1)",
      text: "#1e2226",
      textMuted: "#5d646b",
      accent: "#2e6b58",
      accentHover: "#245747",
      accentContrast: "#ffffff",
      accentSoft: "rgba(46, 107, 88, 0.09)",
      accentGlow: "rgba(46, 107, 88, 0.32)",
      shadow: "0 1px 2px rgba(30, 34, 38, 0.06), 0 12px 32px rgba(30, 34, 38, 0.1)",
    },
  },
  lightBlue: {
    id: "lightBlue",
    label: "Azul Claro",
    description: "Fresco",
    colorScheme: "light",
    colors: {
      bg: "#eaf6fd",
      surface: "#ffffff",
      surfaceAlt: "#f2f9fe",
      inputBg: "#ffffff",
      border: "#6c97b3",
      borderSoft: "rgba(3, 105, 161, 0.14)",
      text: "#0b2a3f",
      textMuted: "#4a6b82",
      accent: "#0369a1",
      accentHover: "#075985",
      accentContrast: "#ffffff",
      accentSoft: "rgba(3, 105, 161, 0.09)",
      accentGlow: "rgba(3, 105, 161, 0.32)",
      shadow: "0 1px 2px rgba(11, 42, 63, 0.06), 0 12px 32px rgba(11, 42, 63, 0.1)",
    },
  },
  gray: {
    id: "gray",
    label: "Gris",
    description: "Minimalista",
    colorScheme: "dark",
    colors: {
      bg: "#1e1f22",
      surface: "#2b2d31",
      surfaceAlt: "#26282c",
      inputBg: "#1e1f22",
      border: "#7a7d85",
      borderSoft: "rgba(255, 255, 255, 0.07)",
      text: "#e3e5e8",
      textMuted: "#a3a6ad",
      accent: "#c4c9d0",
      accentHover: "#e1e4e8",
      accentContrast: "#1e1f22",
      accentSoft: "rgba(196, 201, 208, 0.12)",
      accentGlow: "rgba(196, 201, 208, 0.3)",
      shadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 12px 32px rgba(0, 0, 0, 0.38)",
    },
  },
};

/** Display order in the selector. */
export const THEME_ORDER: ThemeId[] = ["dark", "neon", "purple", "light", "lightBlue", "gray"];

export const DEFAULT_THEME_ID: ThemeId = "dark";

/** True when `value` names one of the six themes. */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && Object.hasOwn(THEMES, value);
}

/** `surfaceAlt` → `--color-surface-alt`. */
export function cssVarName(token: keyof ThemeColors): string {
  return `--color-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}
