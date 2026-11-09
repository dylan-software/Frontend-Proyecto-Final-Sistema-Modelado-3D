/**
 * FASE 8: contraste WCAG 2.1 AA de los seis temas. Texto normal ≥ 4,5:1 (texto, texto secundario,
 * enlaces y botones del acento) y bordes de controles ≥ 3:1 (criterio 1.4.11). Los colores de error
 * y de cota salen de tokens.css (uno por esquema, claro u oscuro) y se comprueban igual.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { THEMES, THEME_ORDER, type ThemeColors } from "../src/styles/themes";

/** Luminancia relativa de un color #rrggbb (WCAG 2.1). */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste entre dos colores sólidos, de 1 a 21. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Valores de una variable en tokens.css: el primero es el del esquema oscuro y el segundo el del claro. */
function tokenValues(name: string): { dark: string; light: string } {
  const css = readFileSync(join(__dirname, "../src/styles/tokens.css"), "utf8");
  const found = [...css.matchAll(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`, "g"))].map((m) => m[1]);
  return { dark: found[0], light: found[1] };
}

type Pair = [label: string, fg: keyof ThemeColors, bg: keyof ThemeColors, min: number];

const PAIRS: Pair[] = [
  ["texto sobre el fondo", "text", "bg", 4.5],
  ["texto sobre las tarjetas", "text", "surface", 4.5],
  ["texto sobre las zonas hundidas", "text", "surfaceAlt", 4.5],
  ["texto en los campos", "text", "inputBg", 4.5],
  ["texto secundario sobre el fondo", "textMuted", "bg", 4.5],
  ["texto secundario sobre las tarjetas", "textMuted", "surface", 4.5],
  ["texto secundario sobre las zonas hundidas", "textMuted", "surfaceAlt", 4.5],
  ["botón principal", "accentContrast", "accent", 4.5],
  ["botón principal al pasar el puntero", "accentContrast", "accentHover", 4.5],
  ["enlaces sobre el fondo", "accent", "bg", 4.5],
  ["enlaces sobre las tarjetas", "accent", "surface", 4.5],
  ["enlaces sobre las zonas hundidas", "accent", "surfaceAlt", 4.5],
  ["borde de los campos", "border", "inputBg", 3],
  ["borde de los controles sobre las tarjetas", "border", "surface", 3],
];

describe("contraste AA de los seis temas", () => {
  for (const id of THEME_ORDER) {
    const { label, colors } = THEMES[id];
    for (const [what, fg, bg, min] of PAIRS) {
      it(`${label}: ${what} ≥ ${min}:1`, () => {
        expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
      });
    }
  }
});

describe("contraste AA de los colores de estado (tokens.css)", () => {
  const danger = tokenValues("--color-danger");
  const measure = tokenValues("--color-measure");

  for (const id of THEME_ORDER) {
    const { label, colorScheme, colors } = THEMES[id];
    it(`${label}: el texto de error se lee sobre el fondo y las tarjetas`, () => {
      expect(contrast(danger[colorScheme], colors.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(danger[colorScheme], colors.surface)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${label}: las cotas (roble) se distinguen de las zonas hundidas`, () => {
      expect(contrast(measure[colorScheme], colors.surfaceAlt)).toBeGreaterThanOrEqual(3);
    });
  }
});
