/**
 * Escena de la miniatura 3D de una sala: la misma que la vista del proyecto (RenderScene) pero sin
 * controles, rótulos ni selección. Suelo con el polígono real, paredes semitransparentes sin techo,
 * cajas de los objetos y la cámara en la misma diagonal (computeSceneView), con el aspecto 4:3 de la
 * tarjeta. Se construye, se pinta con el renderizador compartido y se libera enseguida.
 */
import * as THREE from "three";

import type { Point2D, RoomItem } from "../lib/api";
import { toSceneBoxes } from "../lib/roomBoxes";
import { CAMERA_FOV_DEG, computeSceneView, wallPlanes } from "../lib/sceneView";
import { thumbnailKey, type ThumbnailCache } from "../lib/thumbnailCache";
import {
  AMBIENT_LIGHT_INTENSITY,
  BOX_OPACITY,
  DEFAULT_POINT_LIGHT,
  DIRECTIONAL_LIGHT_INTENSITY,
  FLOOR_BOX_COLOR,
  FLOOR_COLOR,
  FLOOR_OPACITY,
  RAISED_BOX_COLOR,
  WALL_COLOR,
  WALL_OPACITY,
} from "./sceneColors";
import { sharedThumbnailRenderer, THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH, type ThumbnailRenderer } from "./thumbnailRenderer";

/** Sube este número si cambia el dibujo: las miniaturas guardadas dejan de valer. */
export const THUMBNAIL_STYLE_VERSION = 1;
/** Planos de recorte de la cámara (como el Canvas de la vista del proyecto). */
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;

/** Lo que se dibuja de una sala: su forma, su altura y sus objetos (esquina mínima, metros). */
export interface ThumbnailRoom {
  vertices: Point2D[];
  heightM: number;
  items: RoomItem[];
}

/** Escena lista para pintar; `dispose` libera geometrías y materiales (llamarlo siempre al terminar). */
export interface BuiltThumbnailScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  dispose(): void;
}

/**
 * Lo que cambia el aspecto de la miniatura (y nada más): forma, altura y cajas (tamaño, centro y si
 * están levantadas). Los nombres no se dibujan, así que renombrar un objeto no la invalida.
 */
export function thumbnailLook(room: ThumbnailRoom): unknown {
  return {
    version: THUMBNAIL_STYLE_VERSION,
    vertices: room.vertices.map(({ x, y }) => [x, y]),
    heightM: room.heightM,
    boxes: toSceneBoxes(room.items).map((box) => [box.size, box.center, box.raised]),
  };
}

/** Clave de la miniatura de la sala en la caché. */
export function roomThumbnailKey(roomId: number, room: ThumbnailRoom): string {
  return thumbnailKey(roomId, thumbnailLook(room));
}

function translucent(color: string, opacity: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, transparent: true, opacity, ...extra });
}

/** Arma la escena y la cámara de la miniatura (sin WebGL: se puede probar en Node). */
export function buildThumbnailScene(room: ThumbnailRoom): BuiltThumbnailScene {
  const scene = new THREE.Scene();
  const view = computeSceneView(room.vertices, room.heightM);

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT, CAMERA_NEAR, CAMERA_FAR);
  camera.position.set(...view.position);
  camera.lookAt(...view.target);
  camera.updateProjectionMatrix();

  scene.add(new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY));
  const point = new THREE.PointLight(DEFAULT_POINT_LIGHT.color, DEFAULT_POINT_LIGHT.intensity);
  point.position.set(DEFAULT_POINT_LIGHT.position.x, DEFAULT_POINT_LIGHT.position.y, DEFAULT_POINT_LIGHT.position.z);
  scene.add(point);
  const directional = new THREE.DirectionalLight(0xffffff, DIRECTIONAL_LIGHT_INTENSITY);
  directional.position.set(view.position[0], view.position[1] * 2, view.position[2]);
  scene.add(directional);

  if (room.vertices.length >= 3) {
    const shape = new THREE.Shape(room.vertices.map((v) => new THREE.Vector2(v.x, v.y)));
    const floorGeometry = new THREE.ShapeGeometry(shape);
    // +90° en x lleva la y del plano a +z, como en RenderScene (paredes y cajas usan z = y del plano).
    floorGeometry.rotateX(Math.PI / 2);
    const floor = new THREE.Mesh(
      floorGeometry,
      translucent(FLOOR_COLOR, FLOOR_OPACITY, { side: THREE.DoubleSide, depthWrite: false })
    );
    floor.renderOrder = 0;
    scene.add(floor);
  }

  for (const wall of wallPlanes(room.vertices, room.heightM)) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(wall.width, wall.height),
      translucent(WALL_COLOR, WALL_OPACITY, { side: THREE.DoubleSide, depthWrite: false })
    );
    mesh.position.set(...wall.center);
    mesh.rotation.set(0, wall.rotationY, 0);
    mesh.renderOrder = 1;
    scene.add(mesh);
  }

  for (const box of toSceneBoxes(room.items)) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...box.size),
      translucent(box.raised ? RAISED_BOX_COLOR : FLOOR_BOX_COLOR, BOX_OPACITY)
    );
    mesh.position.set(...box.center);
    scene.add(mesh);
  }

  return {
    scene,
    camera,
    dispose() {
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
      scene.clear();
    },
  };
}

/** Pinta la miniatura de la sala a PNG con el renderizador compartido; la escena se libera siempre. */
export async function renderRoomThumbnail(
  room: ThumbnailRoom,
  renderer: ThumbnailRenderer = sharedThumbnailRenderer()
): Promise<Blob> {
  const built = buildThumbnailScene(room);
  try {
    return await renderer.render(built.scene, built.camera);
  } finally {
    built.dispose();
  }
}

/**
 * URL de la miniatura de una sala: de la caché si ya está, o puesta a la cola para pintarla con el
 * renderizador compartido. Rechaza si no hay WebGL, si falla o si se cancela: entonces la tarjeta
 * sigue con el plano 2D.
 */
export function requestRoomThumbnail(
  cache: ThumbnailCache,
  roomId: number,
  room: ThumbnailRoom,
  signal?: AbortSignal,
  renderer?: ThumbnailRenderer
): Promise<string> {
  return cache.request(roomThumbnailKey(roomId, room), roomId, () => renderRoomThumbnail(room, renderer), signal);
}
