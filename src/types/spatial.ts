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
