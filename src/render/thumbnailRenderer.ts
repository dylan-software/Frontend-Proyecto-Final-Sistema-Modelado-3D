/**
 * Un ÚNICO renderizador WebGL, fuera de pantalla, para todas las miniaturas 3D de las tarjetas: pinta
 * una escena en un lienzo oculto y la devuelve como PNG. Así no hay un visor por tarjeta (el navegador
 * admite pocos contextos WebGL a la vez y cada uno cuesta memoria).
 *
 * Se crea al pintar la primera miniatura. Si el navegador no tiene WebGL, falla una vez con
 * WebGLUnavailableError y no lo vuelve a intentar: las tarjetas se quedan con el plano 2D. Si el
 * contexto se pierde (la GPU lo recupera para otra cosa), se vuelve a crear en la siguiente miniatura.
 */
import * as THREE from "three";

/** Tamaño de la imagen: el doble del plano 2D de la tarjeta (240 x 180), para pantallas densas. */
export const THUMBNAIL_WIDTH = 480;
export const THUMBNAIL_HEIGHT = 360;

/** Este navegador no puede crear un contexto WebGL: las tarjetas usan el plano 2D. */
export class WebGLUnavailableError extends Error {
  constructor() {
    super("WebGL no está disponible en este navegador");
    this.name = "WebGLUnavailableError";
  }
}

/** Lo mínimo del lienzo que usa el renderizador (HTMLCanvasElement en el navegador). */
export type ThumbnailCanvas = HTMLCanvasElement;

export interface ThumbnailRendererOptions {
  width?: number;
  height?: number;
  /** Crea el lienzo oculto (por defecto, un <canvas> que nunca se añade a la página). */
  createCanvas?: () => ThumbnailCanvas;
  /** Crea el renderizador sobre el lienzo (por defecto, THREE.WebGLRenderer con fondo transparente). */
  createRenderer?: (canvas: ThumbnailCanvas) => Pick<THREE.WebGLRenderer, "render" | "setSize" | "setPixelRatio" | "setClearColor" | "dispose">;
}

export interface ThumbnailRenderer {
  /** Pinta la escena con esa cámara y devuelve la imagen PNG (fondo transparente). */
  render(scene: THREE.Scene, camera: THREE.Camera): Promise<Blob>;
  /** false si ya se sabe que no hay WebGL (no se reintenta). */
  readonly available: boolean;
  /** Libera el contexto WebGL; la siguiente miniatura lo vuelve a crear. */
  dispose(): void;
}

function defaultCanvas(): ThumbnailCanvas {
  return document.createElement("canvas");
}

function defaultRenderer(canvas: ThumbnailCanvas) {
  // preserveDrawingBuffer: la imagen sigue en el lienzo cuando toBlob la lee.
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  // El mismo mapeo de tonos que el Canvas de React Three Fiber de la vista del proyecto (su valor por
  // defecto), para que los colores de la miniatura coincidan con los de la vista.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  return renderer;
}

/** Lee el lienzo como PNG; algunos navegadores devuelven null si el lienzo no se puede leer. */
function canvasToBlob(canvas: ThumbnailCanvas): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo leer la imagen del lienzo"))), "image/png");
  });
}

export function createThumbnailRenderer(options: ThumbnailRendererOptions = {}): ThumbnailRenderer {
  const width = options.width ?? THUMBNAIL_WIDTH;
  const height = options.height ?? THUMBNAIL_HEIGHT;
  const createCanvas = options.createCanvas ?? defaultCanvas;
  const createRenderer = options.createRenderer ?? defaultRenderer;

  let canvas: ThumbnailCanvas | null = null;
  let renderer: ReturnType<typeof createRenderer> | null = null;
  let unavailable = false;

  function release() {
    renderer?.dispose();
    renderer = null;
    canvas = null;
  }

  function ensure() {
    if (unavailable) throw new WebGLUnavailableError();
    if (renderer && canvas) return { renderer, canvas };
    let nextCanvas: ThumbnailCanvas;
    let next: ReturnType<typeof createRenderer>;
    try {
      // Fuera del navegador (sin document) o sin WebGL, cualquiera de los dos falla.
      nextCanvas = createCanvas();
      next = createRenderer(nextCanvas);
    } catch {
      unavailable = true;
      throw new WebGLUnavailableError();
    }
    // Siempre 1: el tamaño en píxeles ya es el doble del que se muestra.
    next.setPixelRatio(1);
    next.setSize(width, height, false);
    next.setClearColor(0x000000, 0);
    // Contexto perdido: se descarta y la próxima miniatura crea otro.
    nextCanvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        if (canvas === nextCanvas) release();
      },
      { once: true }
    );
    canvas = nextCanvas;
    renderer = next;
    return { renderer: next, canvas: nextCanvas };
  }

  return {
    async render(scene, camera) {
      const current = ensure();
      current.renderer.render(scene, camera);
      return canvasToBlob(current.canvas);
    },

    get available() {
      return !unavailable;
    },

    dispose() {
      release();
    },
  };
}

/** Renderizador compartido de la app (uno solo para todas las tarjetas); se crea al primer uso. */
let shared: ThumbnailRenderer | null = null;

export function sharedThumbnailRenderer(): ThumbnailRenderer {
  shared ??= createThumbnailRenderer();
  return shared;
}
