import { Canvas } from "@react-three/fiber";

/**
 * Interactive 3D viewport where the modeled room is displayed.
 */
export default function Scene3D() {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}></Canvas>
    </div>
  );
}
