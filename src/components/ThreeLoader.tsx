import { useRef } from "react";
import type { Mesh } from "three";

/**
 * In-scene loading indicator shown while the AI analyzes the space.
 * Must be rendered inside a Fiber <Canvas>.
 */
export default function ThreeLoader() {
  const meshRef = useRef<Mesh>(null);

  return <group position={[0, 1.5, 0]}></group>;
}
