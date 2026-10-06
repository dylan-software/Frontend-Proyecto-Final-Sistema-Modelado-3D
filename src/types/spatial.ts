/**
 * Shared 3D types used by the viewer and the backend's spatial analysis.
 * All distances are in meters, matching three.js world units.
 */

/** A point in 3D space (y is the vertical axis, as in three.js). */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/** Width (x), height (y) and depth (z) of an object's bounding box. */
export interface Dimensions3D {
  width: number;
  height: number;
  depth: number;
}

/** A piece of furniture placed in the room, as validated by the backend. */
export interface FurnitureObject {
  id: string;
  name: string;
  position: Vector3D;
  /** Rotation around the vertical axis, in degrees. */
  rotation: number;
  dimensions?: Dimensions3D;
}

/**
 * Envelope shared by every JSON response of the FastAPI backend.
 * `detail` is what FastAPI returns on validation or HTTP errors.
 */
export interface ApiResponseInterface {
  success: boolean;
  detail?: string;
}

/** Response of POST /api/v1/spaces/analyze on the FastAPI backend. */
export interface SpaceAnalysisResponse extends ApiResponseInterface {
  recommendations: string;
  suggested_coordinates: Vector3D;
}

/** True when `value` is an {x, y, z} object whose three fields are finite numbers. */
export function isValidVector3D(value: unknown): value is Vector3D {
  if (typeof value !== "object" || value === null) return false;
  const { x, y, z } = value as Record<string, unknown>;
  return [x, y, z].every((n) => typeof n === "number" && Number.isFinite(n));
}
