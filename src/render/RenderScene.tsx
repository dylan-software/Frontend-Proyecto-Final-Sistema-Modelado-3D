import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { es } from "../i18n/es";
import type { Point2D, FurnitureInput, RoomItem } from "../lib/api";
import { toSceneBoxes } from "../lib/roomBoxes";
import { cmToM } from "../lib/units";

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
  /** Objetos guardados en la sala (p. ej. los estimados por la foto), dibujados como cajas con su nombre. */
  boxes?: RoomItem[];
  /** Muestra la etiqueta "Estimado" sobre la escena (medidas aproximadas de una foto). */
  estimated?: boolean;
}

// Colores de las cajas: las del suelo y las que están por encima (cuadros, repisas…).
const FLOOR_BOX_COLOR = "#8a6f5c";
const RAISED_BOX_COLOR = "#5c7a8a";

/**
 * Renders the room as its real IRREGULAR polygon (not a rectangle):
 * the floor is a THREE.Shape built straight from the scanned/edited
 * vertices, extruded into a flat mesh, so an L-shaped or cut-corner
 * room renders with its real outline.
 */
export function RenderScene({ vertices, heightM, placedItems, lighting, boxes = [], estimated = false }: RenderSceneProps) {
  const sceneBoxes = useMemo(() => toSceneBoxes(boxes), [boxes]);

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
    <div className="render-scene">
      {estimated && (
        <span className="estimated-badge" title={es.photo.scene.estimatedHint}>
          {es.photo.scene.estimated}
        </span>
      )}
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
              position={[p.x + cmToM(widthCm) / 2, cmToM(heightCm) / 2, p.y + cmToM(depthCm) / 2]}
              rotation={[0, (p.rotation * Math.PI) / 180, 0]}
            >
              <boxGeometry args={[cmToM(widthCm), cmToM(heightCm), cmToM(depthCm)]} />
              <meshStandardMaterial color="#8a6f5c" />
            </mesh>
          );
        })}

        {/* Objetos guardados en la sala: cajas con su nombre, a su altura sobre el suelo. */}
        {sceneBoxes.map((box) => (
          <group key={box.id}>
            <mesh position={box.center}>
              <boxGeometry args={box.size} />
              <meshStandardMaterial
                color={box.raised ? RAISED_BOX_COLOR : FLOOR_BOX_COLOR}
                transparent
                opacity={0.85}
              />
            </mesh>
            <Html position={box.labelAt} center>
              <span className="box-label">{box.label}</span>
            </Html>
          </group>
        ))}
      </Canvas>
    </div>
  );
}
