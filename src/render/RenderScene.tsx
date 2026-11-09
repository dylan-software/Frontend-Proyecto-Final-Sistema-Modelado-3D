import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { es } from "../i18n/es";
import type { Point2D, FurnitureInput, RoomItem } from "../lib/api";
import { spreadLabels, type LabelRect } from "../lib/labelSpread";
import { dragTarget, moveModeOf, samePlace, wallRunsAlongX, type MoveMode } from "../lib/objectMove";
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
  /** Mover a mano (FASE 3). Objeto seleccionado, resaltado en otro color. */
  selectedId?: number | null;
  /** Tocar una caja la selecciona; tocar fuera, null. Sin esta prop, las cajas no responden. */
  onSelect?: (id: number | null) => void;
  /** Si se puede arrastrar ahora (false mientras se guarda otro movimiento). */
  dragEnabled?: boolean;
  /** Vista previa mientras se arrastra; null al cancelar o soltar sin moverlo. */
  onDragPreview?: (item: RoomItem | null) => void;
  /** Se soltó en otro sitio: el objeto como estaba y como se pide dejarlo. */
  onDragEnd?: (original: RoomItem, target: RoomItem) => void;
}

// Colores de las cajas: las del suelo, las que están por encima (cuadros, repisas…) y la seleccionada.
const FLOOR_BOX_COLOR = "#8a6f5c";
const RAISED_BOX_COLOR = "#5c7a8a";
const SELECTED_BOX_COLOR = "#d39a3f";
// Píxeles que hay que mover el puntero para que un toque se convierta en arrastre.
const DRAG_THRESHOLD_PX = 4;
// Suelo y paredes semitransparentes y sin techo, para que no tapen los objetos.
const FLOOR_COLOR = "#d9d2c5";
const FLOOR_OPACITY = 0.6;
const WALL_COLOR = "#b8c4d0";
const WALL_OPACITY = 0.18;

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;

/**
 * Separa en pantalla los rótulos que se pisan: en cada fotograma mide dónde quedó cada rótulo (sin su
 * desplazamiento actual, guardado en el propio elemento como data-lift), calcula con spreadLabels
 * cuánto subir cada uno y lo aplica con un translateY directo (sin volver a renderizar React). Va
 * dentro del Canvas.
 */
function LabelSpreader({ labels }: { labels: MutableRefObject<(HTMLSpanElement | null)[]> }) {
  useFrame(() => {
    const spans = labels.current;
    const lifts = spans.map((span) => Number(span?.dataset.lift ?? 0) || 0);
    const rects: (LabelRect | null)[] = spans.map((span, i) => {
      if (!span) return null;
      const box = span.getBoundingClientRect();
      return { left: box.left, top: box.top + lifts[i], width: box.width, height: box.height };
    });
    const next = spreadLabels(rects);
    spans.forEach((span, i) => {
      if (!span || next[i] === lifts[i]) return;
      span.dataset.lift = String(next[i]);
      span.style.transform = next[i] > 0 ? `translateY(${-next[i]}px)` : "";
    });
  });

  return null;
}

/**
 * Plano sobre el que se arrastra, por el punto donde se agarró la caja: horizontal para los objetos de
 * suelo y los levantados sin pared (el objeto sigue al puntero a esa altura), y vertical, paralelo a su
 * pared, para los de pared (solo cuenta el desplazamiento a lo largo de ella).
 */
function dragPlane(mode: MoveMode, grabbed: THREE.Vector3): THREE.Plane {
  let normal = new THREE.Vector3(0, 1, 0);
  if (mode.kind === "wall") {
    normal = wallRunsAlongX(mode.wall) ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  }
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, grabbed);
}

interface SceneBoxesProps {
  items: RoomItem[];
  vertices: Point2D[];
  showLabels: boolean;
  labelRefs: MutableRefObject<(HTMLSpanElement | null)[]>;
  controlsRef: MutableRefObject<OrbitControlsRef | null>;
  selectedId: number | null;
  onSelect?: (id: number | null) => void;
  dragEnabled: boolean;
  onDragPreview?: (item: RoomItem | null) => void;
  onDragEnd?: (original: RoomItem, target: RoomItem) => void;
}

/**
 * Las cajas de los objetos guardados, con su nombre, y el arrastre para moverlas (va dentro del Canvas).
 *
 * Al pulsar una caja se selecciona y se apaga OrbitControls hasta soltar, para que la cámara no gire.
 * Si el puntero se mueve más de DRAG_THRESHOLD_PX, cada movimiento lanza un rayo desde la cámara contra
 * el plano de arrastre (dragPlane) y lib/objectMove.ts calcula la vista previa: en el suelo, dentro de
 * la sala; en la pared, a lo largo de ella. Se escucha en window para no perder el puntero si sale del
 * lienzo; el lienzo tiene touch-action: none, así que con el dedo la página no se desplaza.
 */
function SceneBoxes({
  items,
  vertices,
  showLabels,
  labelRefs,
  controlsRef,
  selectedId,
  onSelect,
  dragEnabled,
  onDragPreview,
  onDragEnd,
}: SceneBoxesProps) {
  const sceneBoxes = useMemo(() => toSceneBoxes(items), [items]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  // Termina el arrastre en curso (quita los oyentes y vuelve a encender la cámara), o null.
  const finishDrag = useRef<(() => void) | null>(null);
  // Siempre las props más recientes: los oyentes de window viven más que un render.
  const latest = useRef({ vertices, onDragPreview, onDragEnd });
  latest.current = { vertices, onDragPreview, onDragEnd };

  // Al desmontar (otra sala, salir del proyecto) no quedan oyentes ni la cámara apagada.
  useEffect(() => () => finishDrag.current?.(), []);

  function startDrag(event: ThreeEvent<PointerEvent>, id: number) {
    if (!onSelect) return;
    // La caja más cercana se queda el toque; las de detrás no lo reciben.
    event.stopPropagation();
    onSelect(id);
    const item = byId.get(id);
    if (!item || !dragEnabled || finishDrag.current) return;

    const mode = moveModeOf(item, latest.current.vertices);
    const plane = dragPlane(mode, event.point);
    const pointer = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const startX = event.nativeEvent.clientX;
    const startY = event.nativeEvent.clientY;
    // Lo que separa la esquina del objeto del punto agarrado: el objeto no salta bajo el puntero.
    const offsetX = item.x - event.point.x;
    const offsetZ = item.y - event.point.z;
    let moved = false;
    let last = item;

    const controls = controlsRef.current;
    if (controls) controls.enabled = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      if (!moved) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD_PX) return;
        moved = true;
        gl.domElement.style.cursor = "grabbing";
      }
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const corner = { x: hit.x + offsetX, y: hit.z + offsetZ };
      const next = dragTarget(mode, item, corner, latest.current.vertices, last);
      if (next === last) return;
      last = next;
      latest.current.onDragPreview?.(next);
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      finishDrag.current?.();
      if (!moved) return;
      if (e.type === "pointerup" && !samePlace(last, item)) latest.current.onDragEnd?.(item, last);
      else latest.current.onDragPreview?.(null);
    };

    finishDrag.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (controls) controls.enabled = true;
      gl.domElement.style.cursor = "";
      finishDrag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  const interactive = Boolean(onSelect);

  return (
    <>
      {sceneBoxes.map((box, i) => {
        const selected = box.id === selectedId;
        return (
          <group key={box.id}>
            <mesh
              position={box.center}
              onPointerDown={interactive ? (event) => startDrag(event, box.id) : undefined}
              onPointerOver={
                interactive && dragEnabled
                  ? () => {
                      if (!finishDrag.current) gl.domElement.style.cursor = "grab";
                    }
                  : undefined
              }
              onPointerOut={
                interactive
                  ? () => {
                      if (!finishDrag.current) gl.domElement.style.cursor = "";
                    }
                  : undefined
              }
            >
              <boxGeometry args={box.size} />
              <meshStandardMaterial
                color={selected ? SELECTED_BOX_COLOR : box.raised ? RAISED_BOX_COLOR : FLOOR_BOX_COLOR}
                transparent
                opacity={selected ? 0.95 : 0.85}
              />
            </mesh>
            {showLabels && (
              <Html position={box.labelAt} center>
                <span
                  className="box-label"
                  ref={(span) => {
                    labelRefs.current[i] = span;
                  }}
                >
                  {box.label}
                </span>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}

/**
 * Sala en 3D con su polígono REAL (no un rectángulo): el suelo es un THREE.Shape hecho con los
 * vértices, y cada arista levanta una pared semitransparente; no hay techo. La cámara empieza en
 * diagonal y desde arriba, mirando al centro de la sala; OrbitControls permite girar y acercar o
 * alejar con el ratón y con gestos táctiles, con amortiguación y límites de distancia y de ángulo.
 */
export function RenderScene({
  vertices,
  heightM,
  placedItems,
  lighting,
  boxes = [],
  estimated = false,
  selectedId = null,
  onSelect,
  dragEnabled = true,
  onDragPreview,
  onDragEnd,
}: RenderSceneProps) {
  const sceneBoxes = useMemo(() => toSceneBoxes(boxes), [boxes]);
  const view = useMemo(() => computeSceneView(vertices, heightM), [vertices, heightM]);
  const walls = useMemo(() => wallPlanes(vertices, heightM), [vertices, heightM]);
  const controlsRef = useRef<OrbitControlsRef | null>(null);
  // Botón "Nombres": muestra u oculta los rótulos de las cajas.
  const [showLabels, setShowLabels] = useState(true);
  // Un elemento por caja, en el orden de sceneBoxes (los sobrantes se recortan en cada render).
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  labelRefs.current.length = showLabels ? sceneBoxes.length : 0;

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
      <div className="scene-tools">
        {sceneBoxes.length > 0 && (
          <button
            type="button"
            className="labels-toggle-button"
            aria-pressed={showLabels}
            title={showLabels ? es.scene.hideLabels : es.scene.showLabels}
            onClick={() => setShowLabels((shown) => !shown)}
          >
            {es.scene.labels}
          </button>
        )}
        <button type="button" className="reset-view-button" onClick={resetView}>
          {es.scene.resetView}
        </button>
      </div>
      <Canvas
        // Los rótulos (Html de drei) se añaden a este contenedor con z-index enormes; la clase lo
        // convierte en su propio contexto de apilamiento (ver .scene-canvas en globals.css).
        className="scene-canvas"
        camera={{ position: view.position, fov: CAMERA_FOV_DEG }}
        // Un toque (sin arrastrar) fuera de las cajas quita la selección.
        onPointerMissed={onSelect ? () => onSelect(null) : undefined}
      >
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

        {/* Objetos guardados en la sala: cajas con su nombre, a su altura sobre el suelo; se arrastran. */}
        <SceneBoxes
          items={boxes}
          vertices={vertices}
          showLabels={showLabels}
          labelRefs={labelRefs}
          controlsRef={controlsRef}
          selectedId={selectedId}
          onSelect={onSelect}
          dragEnabled={dragEnabled}
          onDragPreview={onDragPreview}
          onDragEnd={onDragEnd}
        />
        {showLabels && sceneBoxes.length > 1 && <LabelSpreader labels={labelRefs} />}
      </Canvas>
    </div>
  );
}
