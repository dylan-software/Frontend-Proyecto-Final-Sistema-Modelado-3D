/**
 * Escena de la miniatura 3D (src/render/thumbnailScene.ts): mismas piezas, cámara y colores que la
 * vista del proyecto; se libera tras pintar; clave que solo cambia con lo que se ve. Sin WebGL: la
 * escena de three.js se arma en Node y el renderizador es falso.
 */
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { summaryRoomItems, type RoomItem, type SpaceFurniture } from "../src/lib/api";
import { rectangleVertices } from "../src/lib/projects";
import { CAMERA_FOV_DEG, computeSceneView } from "../src/lib/sceneView";
import { createThumbnailCache } from "../src/lib/thumbnailCache";
import { FLOOR_BOX_COLOR, FLOOR_COLOR, RAISED_BOX_COLOR, WALL_COLOR } from "../src/render/sceneColors";
import type { ThumbnailRenderer } from "../src/render/thumbnailRenderer";
import {
  buildThumbnailScene,
  renderRoomThumbnail,
  requestRoomThumbnail,
  roomThumbnailKey,
  type ThumbnailRoom,
} from "../src/render/thumbnailScene";

function item(overrides: Partial<RoomItem> = {}): RoomItem {
  return { id: 1, name: "Cama", x: 0, y: 0, rotation: 0, widthM: 2, depthM: 1.5, heightM: 0.5, elevationM: 0, ...overrides };
}

function room(overrides: Partial<ThumbnailRoom> = {}): ThumbnailRoom {
  return {
    vertices: rectangleVertices(4, 3),
    heightM: 2.5,
    items: [item(), item({ id: 2, name: "Cuadro", x: 1, widthM: 0.8, depthM: 0.05, heightM: 0.6, elevationM: 1.4 })],
    ...overrides,
  };
}

function meshes(scene: THREE.Scene): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) found.push(object);
  });
  return found;
}

const colorOf = (mesh: THREE.Mesh) => `#${(mesh.material as THREE.MeshStandardMaterial).color.getHexString()}`;

/** Renderizador falso: cuenta las llamadas y devuelve un PNG (o falla). */
function fakeRenderer(fail = false): ThumbnailRenderer & { calls: number } {
  return {
    calls: 0,
    available: true,
    async render() {
      this.calls += 1;
      if (fail) throw new Error("contexto perdido");
      return new Blob(["png"], { type: "image/png" });
    },
    dispose() {},
  };
}

describe("buildThumbnailScene", () => {
  it("dibuja suelo, una pared por arista y una caja por objeto válido", () => {
    const built = buildThumbnailScene(room({ items: [...room().items, item({ id: 3, widthM: 0 })] }));
    const all = meshes(built.scene);

    expect(all).toHaveLength(1 + 4 + 2);
    expect(all.map(colorOf)).toEqual([FLOOR_COLOR, WALL_COLOR, WALL_COLOR, WALL_COLOR, WALL_COLOR, FLOOR_BOX_COLOR, RAISED_BOX_COLOR]);
    expect(built.scene.background).toBeNull();
  });

  it("coloca la cámara como la vista del proyecto, con el aspecto 4:3 de la tarjeta", () => {
    const { camera } = buildThumbnailScene(room());
    const view = computeSceneView(rectangleVertices(4, 3), 2.5);

    expect(camera.fov).toBe(CAMERA_FOV_DEG);
    expect(camera.aspect).toBeCloseTo(4 / 3);
    expect(camera.position.toArray()).toEqual(view.position);
    // Mira al centro de la sala.
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const toTarget = new THREE.Vector3(...view.target).sub(camera.position).normalize();
    expect(forward.distanceTo(toTarget)).toBeLessThan(1e-6);
  });

  it("pone las cajas a su altura y el suelo en el plano y = 0 con z = y del plano", () => {
    const all = meshes(buildThumbnailScene(room()).scene);
    const raised = all.at(-1)!;
    expect(raised.position.toArray()).toEqual([1.4, 1.4 + 0.3, 0.025]);

    const floor = all[0]!;
    floor.geometry.computeBoundingBox();
    const box = floor.geometry.boundingBox!;
    // El giro de 90° deja restos de coma flotante (~1e-16): se compara redondeado a la décima de milímetro.
    const rounded = (values: number[]) => values.map((n) => Math.round(n * 10000) / 10000 + 0);
    expect(rounded([box.min.y, box.max.y])).toEqual([0, 0]);
    expect(rounded([box.min.x, box.max.x, box.min.z, box.max.z])).toEqual([0, 4, 0, 3]);
  });

  it("sin forma no dibuja suelo ni paredes (solo las luces)", () => {
    const all = meshes(buildThumbnailScene(room({ vertices: [], items: [] })).scene);
    expect(all).toHaveLength(0);
  });

  it("dispose libera todas las geometrías y materiales", () => {
    const built = buildThumbnailScene(room());
    let disposed = 0;
    for (const mesh of meshes(built.scene)) {
      mesh.geometry.addEventListener("dispose", () => (disposed += 1));
      (mesh.material as THREE.Material).addEventListener("dispose", () => (disposed += 1));
    }

    built.dispose();
    expect(disposed).toBe(2 * (1 + 4 + 2));
    expect(built.scene.children).toHaveLength(0);
  });
});

describe("renderRoomThumbnail y la clave", () => {
  it("pinta con el renderizador dado y devuelve el PNG", async () => {
    const renderer = fakeRenderer();
    const blob = await renderRoomThumbnail(room(), renderer);
    expect(blob.type).toBe("image/png");
    expect(renderer.calls).toBe(1);
  });

  it("si falla al pintar, el error sube (la tarjeta se queda con el 2D)", async () => {
    await expect(renderRoomThumbnail(room(), fakeRenderer(true))).rejects.toThrow("contexto perdido");
  });

  it("la clave cambia con la forma, la altura y los objetos, pero no con sus nombres", () => {
    const base = roomThumbnailKey(5, room());
    expect(roomThumbnailKey(5, room())).toBe(base);
    expect(roomThumbnailKey(5, room({ vertices: rectangleVertices(4, 3.5) }))).not.toBe(base);
    expect(roomThumbnailKey(5, room({ heightM: 2.6 }))).not.toBe(base);
    expect(roomThumbnailKey(5, room({ items: [item({ elevationM: 0.4 })] }))).not.toBe(base);
    expect(roomThumbnailKey(5, room({ items: room().items.map((i) => ({ ...i, name: "Otro" })) }))).toBe(base);
    expect(roomThumbnailKey(6, room())).not.toBe(base);
  });

  it("requestRoomThumbnail pinta una vez por clave y guarda la URL", async () => {
    let urls = 0;
    const cache = createThumbnailCache({ createUrl: () => `blob:${++urls}`, revokeUrl: () => undefined });
    const renderer = fakeRenderer();

    expect(await requestRoomThumbnail(cache, 5, room(), undefined, renderer)).toBe("blob:1");
    expect(await requestRoomThumbnail(cache, 5, room(), undefined, renderer)).toBe("blob:1");
    expect(renderer.calls).toBe(1);
  });
});

describe("summaryRoomItems", () => {
  it("pasa los muebles de GET /spaces a RoomItem (centro -> esquina, rotación 0)", () => {
    const piece: SpaceFurniture = {
      id: 4,
      nombre: "Mesa",
      ancho: 1.2,
      alto: 0.75,
      profundidad: 0.8,
      posicion_x: 2,
      posicion_y: 0,
      posicion_z: 1.5,
    };
    expect(summaryRoomItems({ muebles: [piece] })).toEqual([
      { id: 4, name: "Mesa", x: 1.4, y: 1.1, rotation: 0, widthM: 1.2, depthM: 0.8, heightM: 0.75, elevationM: 0 },
    ]);
    expect(summaryRoomItems({})).toEqual([]);
  });
});
