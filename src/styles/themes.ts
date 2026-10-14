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
      bg: "#0d1117",
      surface: "#1c2128",
      surfaceAlt: "#161b22",
      inputBg: "#0d1117",
      border: "#30363d",
      borderSoft: "rgba(240, 246, 252, 0.08)",
      text: "#e6edf3",
      textMuted: "#8b949e",
      accent: "#00e5ff",
      accentHover: "#5cf0ff",
      accentContrast: "#0d1117",
      accentSoft: "rgba(0, 229, 255, 0.12)",
      accentGlow: "rgba(0, 229, 255, 0.45)",
      shadow: "0 8px 24px rgba(1, 4, 9, 0.35)",
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
      border: "#1f3a24",
      borderSoft: "rgba(57, 255, 20, 0.1)",
      text: "#e8ffe9",
      textMuted: "#86a889",
      accent: "#39ff14",
      accentHover: "#7dff5c",
      accentContrast: "#041004",
      accentSoft: "rgba(57, 255, 20, 0.12)",
      accentGlow: "rgba(57, 255, 20, 0.45)",
      shadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
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
      border: "#3a2a55",
      borderSoft: "rgba(214, 188, 255, 0.1)",
      text: "#f1e9ff",
      textMuted: "#a796c4",
      accent: "#b57bff",
      accentHover: "#cfa6ff",
      accentContrast: "#140d1f",
      accentSoft: "rgba(181, 123, 255, 0.14)",
      accentGlow: "rgba(181, 123, 255, 0.45)",
      shadow: "0 8px 24px rgba(8, 3, 15, 0.45)",
    },
  },
  light: {
    id: "light",
    label: "Claro",
    description: "Limpio",
    colorScheme: "light",
    colors: {
      bg: "#f6f8fa",
      surface: "#ffffff",
      surfaceAlt: "#f0f2f5",
      inputBg: "#ffffff",
      border: "#d0d7de",
      borderSoft: "rgba(31, 35, 40, 0.1)",
      text: "#1f2328",
      textMuted: "#656d76",
      accent: "#0969da",
      accentHover: "#1f7bef",
      accentContrast: "#ffffff",
      accentSoft: "rgba(9, 105, 218, 0.1)",
      accentGlow: "rgba(9, 105, 218, 0.3)",
      shadow: "0 4px 16px rgba(31, 35, 40, 0.08)",
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
      border: "#b9dcf2",
      borderSoft: "rgba(2, 132, 199, 0.14)",
      text: "#0b2a3f",
      textMuted: "#4d6f86",
      accent: "#0284c7",
      accentHover: "#0ea5e9",
      accentContrast: "#ffffff",
      accentSoft: "rgba(2, 132, 199, 0.1)",
      accentGlow: "rgba(14, 165, 233, 0.35)",
      shadow: "0 4px 16px rgba(11, 42, 63, 0.08)",
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
      border: "#3f4147",
      borderSoft: "rgba(255, 255, 255, 0.07)",
      text: "#e3e5e8",
      textMuted: "#9a9ca3",
      accent: "#c4c9d0",
      accentHover: "#e1e4e8",
      accentContrast: "#1e1f22",
      accentSoft: "rgba(196, 201, 208, 0.12)",
      accentGlow: "rgba(196, 201, 208, 0.3)",
      shadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
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
