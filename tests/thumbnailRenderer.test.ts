/**
 * Renderizador compartido de las miniaturas (src/render/thumbnailRenderer.ts). vitest no tiene WebGL:
 * se prueba con un lienzo y un renderizador falsos, y que sin WebGL falla una sola vez y de forma clara.
 */
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  createThumbnailRenderer,
  sharedThumbnailRenderer,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WIDTH,
  WebGLUnavailableError,
  type ThumbnailCanvas,
} from "../src/render/thumbnailRenderer";

/** Lienzo falso: devuelve una imagen (o null) y permite disparar "webglcontextlost". */
function fakeCanvas(blob: Blob | null = new Blob(["png"], { type: "image/png" })) {
  const listeners = new Map<string, (event: Event) => void>();
  const canvas = {
    toBlob: (callback: (value: Blob | null) => void) => callback(blob),
    addEventListener: (type: string, listener: (event: Event) => void) => void listeners.set(type, listener),
  };
  let prevented = false;
  const loseContext = () => listeners.get("webglcontextlost")?.({ preventDefault: () => (prevented = true) } as unknown as Event);
  return { canvas: canvas as unknown as ThumbnailCanvas, loseContext, prevented: () => prevented };
}

/** Renderizador falso que anota cada llamada. */
function fakeRenderer(log: string[]) {
  return {
    render: () => void log.push("render"),
    setSize: (w: number, h: number, style?: boolean) => void log.push(`size ${w}x${h} ${style}`),
    setPixelRatio: (ratio: number) => void log.push(`ratio ${ratio}`),
    setClearColor: (_color: unknown, alpha?: number) => void log.push(`clear alpha ${alpha}`),
    dispose: () => void log.push("dispose"),
  } as unknown as THREE.WebGLRenderer;
}

const scene = () => new THREE.Scene();
const camera = () => new THREE.PerspectiveCamera();

describe("createThumbnailRenderer", () => {
  it("crea un solo renderizador de 480 x 360, fondo transparente, y devuelve el PNG", async () => {
    const log: string[] = [];
    let created = 0;
    const { canvas } = fakeCanvas();
    const thumbnails = createThumbnailRenderer({
      createCanvas: () => canvas,
      createRenderer: () => {
        created += 1;
        return fakeRenderer(log);
      },
    });

    const first = await thumbnails.render(scene(), camera());
    await thumbnails.render(scene(), camera());

    expect(first.type).toBe("image/png");
    expect(created).toBe(1);
    expect(log).toEqual(["ratio 1", `size ${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT} false`, "clear alpha 0", "render", "render"]);
    expect(thumbnails.available).toBe(true);
  });

  it("sin WebGL falla con WebGLUnavailableError y no lo vuelve a intentar", async () => {
    let attempts = 0;
    const thumbnails = createThumbnailRenderer({
      createCanvas: () => fakeCanvas().canvas,
      createRenderer: () => {
        attempts += 1;
        throw new Error("Error creating WebGL context.");
      },
    });

    await expect(thumbnails.render(scene(), camera())).rejects.toBeInstanceOf(WebGLUnavailableError);
    await expect(thumbnails.render(scene(), camera())).rejects.toBeInstanceOf(WebGLUnavailableError);
    expect(attempts).toBe(1);
    expect(thumbnails.available).toBe(false);
  });

  it("fuera del navegador (sin document) también da WebGLUnavailableError", async () => {
    await expect(createThumbnailRenderer().render(scene(), camera())).rejects.toBeInstanceOf(WebGLUnavailableError);
  });

  it("si se pierde el contexto, lo libera y la siguiente miniatura crea otro", async () => {
    const log: string[] = [];
    const lost = fakeCanvas();
    const canvases = [lost.canvas, fakeCanvas().canvas];
    let created = 0;
    const thumbnails = createThumbnailRenderer({
      createCanvas: () => canvases.shift()!,
      createRenderer: () => {
        created += 1;
        return fakeRenderer(log);
      },
    });

    await thumbnails.render(scene(), camera());
    lost.loseContext();
    await thumbnails.render(scene(), camera());

    expect(lost.prevented()).toBe(true);
    expect(log).toContain("dispose");
    expect(created).toBe(2);
  });

  it("rechaza si el lienzo no se puede leer", async () => {
    const thumbnails = createThumbnailRenderer({
      createCanvas: () => fakeCanvas(null).canvas,
      createRenderer: () => fakeRenderer([]),
    });
    await expect(thumbnails.render(scene(), camera())).rejects.toThrow("No se pudo leer la imagen del lienzo");
  });

  it("la app comparte un único renderizador", () => {
    expect(sharedThumbnailRenderer()).toBe(sharedThumbnailRenderer());
  });
});
