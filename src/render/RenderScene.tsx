import { useCallback, useEffect, useMemo, useRef, type ComponentRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { es } from "../i18n/es";
import type { Point2D, FurnitureInput, RoomItem } from "../lib/api";
import { toSceneBoxes } from "../lib/roomBoxes";
import {
  CAMERA_FOV_DEG,
  computeSceneView,
  MAX_POLAR_ANGLE,
  MIN_POLAR_ANGLE,
  wallPlanes,
} from "../lib/sceneView";
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
// Suelo y paredes semitransparentes y sin techo, para que no tapen los objetos.
const FLOOR_COLOR = "#d9d2c5";
const FLOOR_OPACITY = 0.6;
const WALL_COLOR = "#b8c4d0";
const WALL_OPACITY = 0.18;

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;

/**
 * Sala en 3D con su polígono REAL (no un rectángulo): el suelo es un THREE.Shape hecho con los
 * vértices, y cada arista levanta una pared semitransparente; no hay techo. La cámara empieza en
 * diagonal y desde arriba, mirando al centro de la sala; OrbitControls permite girar y acercar o
 * alejar con el ratón y con gestos táctiles, con amortiguación y límites de distancia y de ángulo.
 */
export function RenderScene({ vertices, heightM, placedItems, lighting, boxes = [], estimated = false }: RenderSceneProps) {
  const sceneBoxes = useMemo(() => toSceneBoxes(boxes), [boxes]);
  const view = useMemo(() => computeSceneView(vertices, heightM), [vertices, heightM]);
  const walls = useMemo(() => wallPlanes(vertices, heightM), [vertices, heightM]);
  const controlsRef = useRef<OrbitControlsRef | null>(null);

  const floorGeometry = useMemo(() => {
    const shape = new THREE.Shape(vertices.map((v) => new THREE.Vector2(v.x, v.y)));
    const geometry = new THREE.ShapeGeometry(shape);
    // +90° en x lleva la y del plano a +z, como las paredes y las cajas. Con -90° el suelo quedaba
    // reflejado en -z y no coincidía con los objetos.
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, [vertices]);

  /** Devuelve la cámara a la vista inicial de esta sala. */
  const resetView = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.object.position.set(...view.position);
    controls.target.set(...view.target);
    controls.update();
  }, [view]);

  // Al abrir otra sala o cambiar su forma, la cámara vuelve a encuadrarla.
  useEffect(resetView, [resetView]);

  return (
    <div className="render-scene">
      {estimated && (
        <span className="estimated-badge" title={es.photo.scene.estimatedHint}>
          {es.photo.scene.estimated}
        </span>
      )}
      <button type="button" className="reset-view-button" onClick={resetView}>
        {es.scene.resetView}
      </button>
      <Canvas camera={{ position: view.position, fov: CAMERA_FOV_DEG }}>
        <ambientLight intensity={0.5} />
        <pointLight
          position={[lighting.position.x, lighting.position.y, lighting.position.z]}
          intensity={lighting.intensity}
          color={lighting.color}
        />
        <directionalLight position={[view.position[0], view.position[1] * 2, view.position[2]]} intensity={0.6} />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={view.target}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={view.minDistance}
          maxDistance={view.maxDistance}
          minPolarAngle={MIN_POLAR_ANGLE}
          maxPolarAngle={MAX_POLAR_ANGLE}
        />

        <mesh geometry={floorGeometry} renderOrder={0}>
          <meshStandardMaterial
            color={FLOOR_COLOR}
            side={THREE.DoubleSide}
            transparent
            opacity={FLOOR_OPACITY}
            depthWrite={false}
          />
        </mesh>

        {walls.map((wall, i) => (
          <mesh key={i} position={wall.center} rotation={[0, wall.rotationY, 0]} renderOrder={1}>
            <planeGeometry args={[wall.width, wall.height]} />
            <meshStandardMaterial
              color={WALL_COLOR}
              side={THREE.DoubleSide}
              transparent
              opacity={WALL_OPACITY}
              depthWrite={false}
            />
          </mesh>
        ))}

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
