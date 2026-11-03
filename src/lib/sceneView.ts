/**
 * Geometría de la vista 3D de una sala: dónde se pone la cámara, cuánto puede acercarse o alejarse,
 * y las paredes como planos. Funciones puras (sin three.js) para poder probarlas.
 *
 * Coordenadas de three.js: x y z en el suelo (la y de cada vértice del plano es la z), y hacia arriba.
 */
import type { Point2D } from "./api";

export type Vec3 = [number, number, number];

/** Campo de visión vertical de la cámara, en grados. */
export const CAMERA_FOV_DEG = 50;
/** Ángulo de la cámara sobre el horizonte y su giro alrededor de la sala: diagonal y desde arriba. */
export const CAMERA_ELEVATION_DEG = 50;
export const CAMERA_AZIMUTH_DEG = 45;
/** Margen para que la sala entera quepa en el encuadre inicial. */
export const FIT_MARGIN = 1.15;
/** Límites de ángulo de OrbitControls: nunca justo encima (se voltea) ni por debajo del suelo. */
export const MIN_POLAR_ANGLE = 0.15;
export const MAX_POLAR_ANGLE = Math.PI / 2 - 0.05;
/** Distancia mínima absoluta (m) y cuántas veces la inicial se puede alejar. */
export const MIN_DISTANCE_M = 0.5;
export const MAX_DISTANCE_FACTOR = 3;

export interface SceneView {
  /** Centro de la sala: a donde mira la cámara y alrededor de lo que gira. */
  target: Vec3;
  position: Vec3;
  distance: number;
  minDistance: number;
  maxDistance: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Caja delimitadora del suelo; una sala sin vértices se trata como un punto en el origen. */
export function floorBounds(vertices: Point2D[]): Bounds {
  if (vertices.length === 0) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  const xs = vertices.map((v) => v.x);
  const zs = vertices.map((v) => v.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

/**
 * Vista inicial: mira al centro de la sala desde una diagonal elevada, a la distancia a la que la
 * esfera que envuelve la sala (con su altura) cabe en el campo de visión.
 */
export function computeSceneView(vertices: Point2D[], heightM: number): SceneView {
  const b = floorBounds(vertices);
  const height = Number.isFinite(heightM) && heightM > 0 ? heightM : 0;
  const target: Vec3 = [(b.minX + b.maxX) / 2, height / 2, (b.minZ + b.maxZ) / 2];
  const radius = Math.max(Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ, height) / 2, 0.5);
  const halfFov = (CAMERA_FOV_DEG * Math.PI) / 360;
  const distance = (radius / Math.sin(halfFov)) * FIT_MARGIN;

  const elevation = (CAMERA_ELEVATION_DEG * Math.PI) / 180;
  const azimuth = (CAMERA_AZIMUTH_DEG * Math.PI) / 180;
  const position: Vec3 = [
    target[0] + distance * Math.cos(elevation) * Math.sin(azimuth),
    target[1] + distance * Math.sin(elevation),
    target[2] + distance * Math.cos(elevation) * Math.cos(azimuth),
  ];
  return {
    target,
    position,
    distance,
    minDistance: Math.min(MIN_DISTANCE_M, distance),
    maxDistance: distance * MAX_DISTANCE_FACTOR,
  };
}

/** Una pared como plano vertical: centro, ancho (longitud de la arista) y giro alrededor de y. */
export interface WallPlane {
  center: Vec3;
  width: number;
  height: number;
  /** Radianes; lleva el eje x local del plano a lo largo de la arista. */
  rotationY: number;
}

/** Las paredes de la sala, una por arista del polígono (incluida la que cierra); omite las de longitud 0. */
export function wallPlanes(vertices: Point2D[], heightM: number): WallPlane[] {
  if (vertices.length < 2 || !(heightM > 0)) return [];
  const walls: WallPlane[] = [];
  vertices.forEach((from, i) => {
    const to = vertices[(i + 1) % vertices.length]!;
    const dx = to.x - from.x;
    const dz = to.y - from.y;
    const width = Math.hypot(dx, dz);
    if (width === 0) return;
    walls.push({
      center: [(from.x + to.x) / 2, heightM / 2, (from.y + to.y) / 2],
      width,
      height: heightM,
      rotationY: -Math.atan2(dz, dx),
    });
  });
  return walls;
}
