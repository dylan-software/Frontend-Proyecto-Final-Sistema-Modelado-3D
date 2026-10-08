import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { Point2D, FurnitureInput } from "../lib/api";

interface PlacedItem {
  x: number;
  y: number;
  rotation: number;
  item: FurnitureInput;
}

interface LightingParameters {
  position: { x: number; y: number; z: number };
  intensity: number;
  color: string;
}

interface RenderSceneProps {
  vertices: Point2D[];
  heightM: number;
  placedItems: PlacedItem[];
  lighting: LightingParameters;
}

/**
 * Renders the room as its real IRREGULAR polygon (not a rectangle):
 * the floor is a THREE.Shape built straight from the scanned/edited
 * vertices, extruded into a flat mesh, so an L-shaped or cut-corner
 * room renders with its real outline.
 */
export function RenderScene({ vertices, heightM, placedItems, lighting }: RenderSceneProps) {
  const floorGeometry = useMemo(() => {
    const shape = new THREE.Shape(vertices.map((v) => new THREE.Vector2(v.x, v.y)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, [vertices]);

  const center = useMemo(() => {
    const xs = vertices.map((v) => v.x);
    const ys = vertices.map((v) => v.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }, [vertices]);

  const span = Math.max(
    Math.max(...vertices.map((v) => v.x)) - Math.min(...vertices.map((v) => v.x)),
    Math.max(...vertices.map((v) => v.y)) - Math.min(...vertices.map((v) => v.y))
  );

  return (
    <Canvas camera={{ position: [center.x + span, span, center.y + span], fov: 50 }}>
      <ambientLight intensity={0.3} />
      <pointLight
        position={[lighting.position.x, lighting.position.y, lighting.position.z]}
        intensity={lighting.intensity}
        color={lighting.color}
      />

      <mesh geometry={floorGeometry} position={[0, 0, 0]}>
        <meshStandardMaterial color="#d9d2c5" side={THREE.DoubleSide} />
      </mesh>

      {placedItems.map((p, i) => {
        const { widthCm, heightCm, depthCm } = p.item;
        return (
          <mesh
            key={i}
            position={[p.x + widthCm / 200, heightCm / 200, p.y + depthCm / 200]}
            rotation={[0, (p.rotation * Math.PI) / 180, 0]}
          >
            <boxGeometry args={[widthCm / 100, heightCm / 100, depthCm / 100]} />
            <meshStandardMaterial color="#8a6f5c" />
          </mesh>
        );
      })}
    </Canvas>
  );
}
