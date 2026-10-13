import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RoomEditor } from "../components/RoomEditor";
import { ObjectForm, isCustomCategory } from "../components/ObjectForm";
import { ChatPanel } from "../components/ChatPanel";
import CameraCapture from "../components/CameraCapture";
import { AuthScreen, AUTH_TOKEN_KEY } from "../components/AuthScreen";
import { api, type Point2D, type FurnitureInput } from "../lib/api";
import type { FurnitureObject, SpaceAnalysisResponse } from "../types/spatial";

// three.js can't be evaluated during server prerendering, so the 3D
// viewers are only loaded in the browser.
const RenderScene = dynamic(() => import("../render/RenderScene").then((m) => m.RenderScene), { ssr: false });
const Scene3D = dynamic(() => import("../components/Scene3D"), { ssr: false });

const DEMO_PROJECT_ID = "demo-project";

interface SpaceState {
  vertices: Point2D[];
  heightM: number;
  areaM2: number;
}

interface PlacedItemState {
  x: number;
  y: number;
  rotation: number;
  item: FurnitureInput;
}

const DEFAULT_LIGHTING = { position: { x: 0, y: 3, z: 0 }, intensity: 0.8, color: "#ffffff" };

/** True when a session token is stored; false if there is none or storage is blocked. */
function hasStoredSession(): boolean {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) !== null;
  } catch {
    return false;
  }
}

export default function Home() {
  // null until the browser has been checked — localStorage doesn't exist
  // during server prerendering, so it's read after mounting.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [space, setSpace] = useState<SpaceState | null | "loading" | "none">("loading");
  const [catalog, setCatalog] = useState<FurnitureInput[]>([]);
  const [placedItems, setPlacedItems] = useState<PlacedItemState[]>([]);
  // Furniture whose coordinates were validated by the backend's Octree.
  const [placedFurniture, setPlacedFurniture] = useState<FurnitureObject[]>([]);
  const [analyzingSpace, setAnalyzingSpace] = useState(false);
  const [lighting, setLighting] = useState(DEFAULT_LIGHTING);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSpace() {
    try {
      const res = await api.getSpace(DEMO_PROJECT_ID);
      setSpace(res);
    } catch {
      setSpace("none");
    }
  }

  async function loadCatalog() {
    try {
      const res = await api.listFurniture();
      setCatalog(res.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    setIsAuthenticated(hasStoredSession());
  }, []);

  // The workspace data is only fetched once there is a session.
  useEffect(() => {
    if (!isAuthenticated) return;
    loadSpace();
    loadCatalog();
  }, [isAuthenticated]);

  async function handleVertexMoved(index: number, point: Point2D) {
    const res = await api.updateVertex(DEMO_PROJECT_ID, index, point);
    setSpace((prev) => (prev && prev !== "loading" && prev !== "none" ? { ...prev, vertices: res.vertices, areaM2: res.areaM2 } : prev));
  }

  function handleSpaceAnalyzed(result: SpaceAnalysisResponse) {
    setPlacedFurniture((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        name: "Sugerencia IA",
        position: result.suggested_coordinates,
        rotation: 0,
      },
    ]);
  }

  function handleResetSpace() {
    setPlacedFurniture([]);
    setPlacedItems([]);
  }

  async function handleGenerateLayout() {
    if (!space || space === "loading" || space === "none" || catalog.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateLayout({
        projectId: DEMO_PROJECT_ID,
        room: { vertices: space.vertices, heightM: space.heightM },
        items: catalog,
        constraints: { minDistanceBetweenItemsCm: 15, minClearPathCm: 60 },
      });

      if (!result.readyToRender) {
        setError(
          result.layout.warnings.join(" ") ||
            result.errors.join(" ") ||
            "The layout did not end up ready to render — try with fewer or smaller items."
        );
        return;
      }

      setPlacedItems(
        result.layout.positions.map((pos) => ({
          x: pos.x,
          y: pos.y,
          rotation: pos.rotation,
          item: catalog.find((c) => c.id === pos.itemId)!,
        }))
      );
      setLighting(result.lighting);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  // Still checking localStorage: render nothing rather than flash the lock screen.
  if (isAuthenticated === null) return null;

  // No session: only the lock screen is rendered, so the 3D viewers, the
  // camera and the chat aren't even mounted.
  if (!isAuthenticated) return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;

  return (
    <div className="dashboard">
      {/* Left column: control sidebar. */}
      <aside className="sidebar">
        <section>
          <ObjectForm onCreated={(item) => setCatalog((prev) => [...prev, item])} />
        </section>

        <section className="catalog">
          <h3>Catalog ({catalog.length})</h3>
          <ul className="catalog-list">
            {catalog.map((c) => (
              <li key={c.id}>
                <span className="catalog-item-name">{c.name}</span>
                <span className={`category-tag${isCustomCategory(c.category) ? " category-tag-custom" : ""}`}>
                  {c.category}
                </span>
                <span className="catalog-item-size">
                  {c.widthCm}×{c.heightCm}×{c.depthCm}cm
                </span>
              </li>
            ))}
          </ul>
          <button
            className="reset-button"
            onClick={handleResetSpace}
            disabled={placedFurniture.length === 0 && placedItems.length === 0}
          >
            Clear all furniture
          </button>
        </section>
      </aside>

      <main className="main-panel">
        <h1>3D Space Decoration System</h1>

        {space === "loading" && <p>Loading…</p>}

        {space === "none" && (
          <div>
            <p>No space scanned yet.</p>
            <Link href="/scan">
              <button>Scan a space</button>
            </Link>
          </div>
        )}

        {space && space !== "loading" && space !== "none" && (
          <div className="viewport-grid">
            <section>
              <h2>Room shape ({space.areaM2} m²)</h2>
              <RoomEditor vertices={space.vertices} areaM2={space.areaM2} onVertexMoved={handleVertexMoved} />
              <Link href="/scan">
                <button className="link-button">Re-scan from scratch</button>
              </Link>
            </section>

            <section>
              <h2>Layout</h2>
              <button onClick={handleGenerateLayout} disabled={generating || catalog.length === 0}>
                {generating ? "Generating…" : "Generate layout"}
              </button>
              {catalog.length === 0 && <p className="hint">Add at least one object from the sidebar first.</p>}

              {placedItems.length > 0 && (
                <div className="canvas-wrapper">
                  <RenderScene
                    vertices={space.vertices}
                    heightM={space.heightM}
                    placedItems={placedItems}
                    lighting={lighting}
                  />
                </div>
              )}
            </section>
          </div>
        )}

        <section>
          <h2>Análisis con cámara</h2>
          <CameraCapture onAnalyzed={handleSpaceAnalyzed} onAnalyzingChange={setAnalyzingSpace} />
          <div className="canvas-wrapper">
            <Scene3D furniture={placedFurniture} loading={analyzingSpace} />
          </div>
        </section>

        {error && <p className="warning">{error}</p>}
      </main>

      {/* Floating AI organization assistant (phase 3), bottom-right corner. */}
      <ChatPanel projectId={DEMO_PROJECT_ID} />
    </div>
  );
}
