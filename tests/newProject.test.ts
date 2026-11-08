/**
 * TAREA-RENOMBRAR.md, punto 4: un proyecto recién creado nace vacío. No tiene objetos y su
 * conversación del chat empieza vacía, sin estado guardado entre proyectos ni en el almacenamiento
 * del navegador. Se renderiza en el servidor (react-dom/server), sin DOM ni efectos.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChatDock } from "../src/components/ChatDock";
import { RoomItemList } from "../src/components/RoomItemList";
import { es } from "../src/i18n/es";
import { newProjectRoom } from "../src/lib/projects";

/** Un almacenamiento que anota cada acceso, para comprobar que el chat no lo toca. */
function spyStorage(log: string[], name: string) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        log.push(`${name}.${String(prop)}`);
        return () => null;
      },
    }
  );
}

function bubbles(html: string): number {
  return html.match(/class="chat-bubble /g)?.length ?? 0;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("un proyecto nuevo nace vacío", () => {
  it("la sala que se crea solo lleva nombre, forma y alto: ningún objeto", () => {
    const body = newProjectRoom("Prueba 1");
    expect(Object.keys(body).sort()).toEqual(["heightM", "name", "vertices"]);
  });

  it("la lista de objetos de una sala sin objetos muestra el estado vacío", () => {
    const html = renderToStaticMarkup(createElement(RoomItemList, { items: [] }));
    expect(html).toContain(es.projectObjects.title(0));
    expect(html).toContain(es.projectObjects.empty);
    expect(html).not.toContain("room-objects-list");
  });

  it("el chat de un proyecto nuevo empieza solo con el saludo local", () => {
    const html = renderToStaticMarkup(createElement(ChatDock, { roomId: 41 }));
    expect(bubbles(html)).toBe(1);
    expect(html).toContain("chat-bubble-assistant");
    expect(html).not.toContain("chat-bubble-user");
  });

  it("el chat no lee ni escribe localStorage ni sessionStorage", () => {
    const log: string[] = [];
    vi.stubGlobal("localStorage", spyStorage(log, "localStorage"));
    vi.stubGlobal("sessionStorage", spyStorage(log, "sessionStorage"));

    renderToStaticMarkup(createElement(ChatDock, { roomId: 41 }));
    renderToStaticMarkup(createElement(ChatDock, { roomId: 42 }));

    expect(log).toEqual([]);
  });

  it("dos proyectos no comparten conversación: cada chat empieza igual", () => {
    const first = renderToStaticMarkup(createElement(ChatDock, { roomId: 41 }));
    const second = renderToStaticMarkup(createElement(ChatDock, { roomId: 42 }));
    expect(bubbles(first)).toBe(1);
    expect(bubbles(second)).toBe(1);
  });
});
