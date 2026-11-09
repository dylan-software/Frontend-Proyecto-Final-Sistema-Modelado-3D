/**
 * Rótulos del 3D (Html de drei): llevan z-index de hasta 16 777 271. Para que nunca queden por encima
 * del panel del asistente, de los menús o de los diálogos, ni fuera del área del 3D, la escena tiene que
 * ser un contexto de apilamiento cerrado. WebGL no corre en las pruebas: se comprueban las reglas.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(join(__dirname, "../src/styles/globals.css"), "utf8");
const renderScene = readFileSync(join(__dirname, "../src/render/RenderScene.tsx"), "utf8");

/** Cuerpo de la primera regla cuyo selector es exactamente `selector`. */
function ruleBody(css: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`).exec(css);
  return match ? match[1] : "";
}

describe("capa de los rótulos del 3D", () => {
  it(".render-scene aísla su apilamiento y recorta lo que se sale", () => {
    const body = ruleBody(globalsCss, ".render-scene");

    expect(body).toMatch(/isolation:\s*isolate/);
    expect(body).toMatch(/overflow:\s*hidden/);
    expect(body).toMatch(/position:\s*relative/);
  });

  it("el contenedor del Canvas es su propio contexto (z-index 0), debajo de los botones de la escena", () => {
    expect(ruleBody(globalsCss, ".scene-canvas")).toMatch(/z-index:\s*0\b/);
    expect(ruleBody(globalsCss, ".scene-tools")).toMatch(/z-index:\s*1\b/);
    expect(ruleBody(globalsCss, ".estimated-badge")).toMatch(/z-index:\s*1\b/);
  });

  it("RenderScene da esa clase al Canvas", () => {
    expect(renderScene).toMatch(/<Canvas[\s\S]*?className="scene-canvas"/);
  });
});
