import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import ThreeLoader from "./ThreeLoader";
import type { Dimensions3D, FurnitureObject } from "../types/spatial";

/** Fallback size (meters) when the backend only reports a position. */
const DEFAULT_DIMENSIONS: Dimensions3D = { width: 0.5, height: 0.5, depth: 0.5 };

interface Scene3DProps {
  furniture: FurnitureObject[];
  /** Shows the spinning loader while the backend is analyzing. */
  loading?: boolean;
}

/**
 * Interactive 3D viewport where the modeled room is displayed.
 */
export default function Scene3D({ furniture, loading = false }: Scene3DProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <hemisphereLight args={["#ffffff", "#8d8d8d", 0.35]} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        {/* Invisible floor that only shows the shadows cast on it. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <shadowMaterial opacity={0.25} />
        </mesh>
        <Grid args={[20, 20]} cellSize={0.5} sectionSize={1} infiniteGrid fadeDistance={30} />
        <OrbitControls makeDefault />

        {furniture.map((f) => {
          const { width, height, depth } = f.dimensions ?? DEFAULT_DIMENSIONS;
          return (
            <mesh
              key={f.id}
              // Lift the box so it rests on the floor instead of being half-buried.
              position={[f.position.x, f.position.y + height / 2, f.position.z]}
              rotation={[0, (f.rotation * Math.PI) / 180, 0]}
              castShadow
            >
              <boxGeometry args={[width, height, depth]} />
              <meshStandardMaterial color="#8a6f5c" />
            </mesh>
          );
        })}

        {loading && <ThreeLoader />}
      </Canvas>
    </div>
  );
}
