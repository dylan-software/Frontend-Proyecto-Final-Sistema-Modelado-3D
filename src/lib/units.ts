/**
 * The ONLY place where lengths change unit. The backend stores the
 * catalog in centimeters (what the user types in ObjectForm) and rooms
 * and placed furniture in meters (what three.js and the room polygon
 * use), so every conversion between the two goes through here.
 */

export const CM_PER_M = 100;

/** Centimeters (catalog sizes) to meters (room space). */
export function cmToM(cm: number): number {
  return cm / CM_PER_M;
}

/** Meters (room space, AR distances) to centimeters (catalog sizes). */
export function mToCm(m: number): number {
  return m * CM_PER_M;
}
