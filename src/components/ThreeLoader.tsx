import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

/**
 * In-scene loading indicator shown while the AI analyzes the space.
 * Must be rendered inside a Fiber <Canvas>.
 */
export default function ThreeLoader() {
  const meshRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += delta * 1.2;
    meshRef.current.rotation.y += delta * 1.8;
    // The canvas uses frameloop="demand": keep requesting frames while visible.
    state.invalidate();
  });

  return (
    <group position={[0, 1.5, 0]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#2f6f4f" emissive="#2f6f4f" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
