import { Grid, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import ThreeLoader from "./ThreeLoader";
import { useTheme } from "../context/ThemeContext";
import { DEFAULT_DIMENSIONS, type FurnitureObject } from "../types/spatial";

interface Scene3DProps {
  furniture: FurnitureObject[];
  /** Shows the spinning loader while the backend is analyzing. */
  loading?: boolean;
  /** Called with the clicked piece's id, or null when clicking empty space. */
  onSelect?: (id: string | null) => void;
}

/**
 * Interactive 3D viewport where the modeled room is displayed.
 */
export default function Scene3D({ furniture, loading = false, onSelect }: Scene3DProps) {
  // The selected piece glows with the active theme's accent color.
  const { accent } = useTheme().theme.colors;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {/* "demand" only redraws when something changes (orbit, new furniture),
          instead of 60 times per second, so the GPU stays idle otherwise. */}
      <Canvas
        shadows
        frameloop="demand"
        camera={{ position: [5, 5, 5], fov: 50 }}
        // A click that hits no mesh clears the selection.
        onPointerMissed={() => onSelect?.(null)}
      >
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
              // R3F raycasts the pointer against the scene; only the nearest hit
              // should be selected, so the event stops at this mesh.
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(f.id);
              }}
            >
              <boxGeometry args={[width, height, depth]} />
              <meshStandardMaterial
                color={f.selected ? accent : "#8a6f5c"}
                emissive={f.selected ? accent : "#000000"}
                emissiveIntensity={f.selected ? 0.35 : 0}
              />
            </mesh>
          );
        })}

        {loading && <ThreeLoader />}
      </Canvas>
    </div>
  );
}
