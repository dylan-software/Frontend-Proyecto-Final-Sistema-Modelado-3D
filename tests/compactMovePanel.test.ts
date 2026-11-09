/**
 * Panel "Mover" compacto: más pequeño y pegado a un borde (en el móvil, una franja baja abajo) y el
 * mensaje "Posición guardada…" que se oculta solo. El aspecto real necesita un navegador: aquí se
 * comprueban la regla de ocultar y las reglas de CSS.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MOVE_STATUS_HIDE_MS, statusHideDelay } from "../src/lib/objectMove";

const projectCss = readFileSync(join(__dirname, "../src/styles/project.css"), "utf8");

/** Cuerpo de la primera regla cuyo selector (o lista de selectores) es exactamente `selector`. */
function ruleBody(css: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`).exec(css);
  return match ? match[1] : "";
}

describe("mensaje del panel Mover", () => {
  it("un movimiento correcto se avisa unos segundos y se oculta solo", () => {
    expect(statusHideDelay("info")).toBe(MOVE_STATUS_HIDE_MS);
    expect(MOVE_STATUS_HIDE_MS).toBeGreaterThanOrEqual(2000);
    expect(MOVE_STATUS_HIDE_MS).toBeLessThanOrEqual(6000);
  });

  it("un error no se oculta solo", () => {
    expect(statusHideDelay("error")).toBeNull();
  });
});

describe("panel Mover compacto (CSS)", () => {
  it("en escritorio, compacto es más estrecho que con la ayuda y va pegado al borde derecho", () => {
    const compact = ruleBody(projectCss, '.object-move-panel[data-help="closed"]');
    expect(compact).toMatch(/right:\s*8px/);
    const width = /width:\s*min\((\d+)px/.exec(compact)?.[1];
    expect(Number(width)).toBeLessThan(240);
    expect(ruleBody(projectCss, '.object-move-panel[data-help="closed"] .object-move-arrows')).toMatch(
      /repeat\(3,\s*32px\)/
    );
  });

  it("en el móvil, el panel va abajo, sin tapar el botón del asistente, con las flechas en una fila", () => {
    const mobile = ruleBody(
      projectCss,
      '.project-layout-mobile .object-move-panel,\n.project-layout-mobile .object-move-panel[data-help="closed"]'
    );
    expect(mobile).toMatch(/top:\s*auto/);
    expect(mobile).toMatch(/bottom:/);
    expect(mobile).toMatch(/right:\s*80px/);
    expect(ruleBody(projectCss, ".project-layout-mobile .object-move-panel .object-move-arrows")).toMatch(
      /grid-template-rows:\s*36px/
    );
  });

  it("en el móvil, la tarjeta de ocupación se aparta mientras se mueve un objeto", () => {
    const body = ruleBody(
      projectCss,
      ".project-layout-mobile .scene-area-moving .occupancy-card,\n.project-layout-mobile .scene-area-moving .occupancy-show"
    );
    expect(body).toMatch(/display:\s*none/);
  });
});
