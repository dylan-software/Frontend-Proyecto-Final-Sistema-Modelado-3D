import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RoomEditor } from "../components/RoomEditor";
import { ObjectForm, isCustomCategory } from "../components/ObjectForm";
import { ChatPanel } from "../components/ChatPanel";
import CameraCapture from "../components/CameraCapture";
import { AuthScreen, AUTH_TOKEN_KEY } from "../components/AuthScreen";
import { SpatialAnalytics } from "../components/SpatialAnalytics";
import { api, type Point2D, type FurnitureInput } from "../lib/api";
import { DEFAULT_DIMENSIONS, type Dimensions3D, type FurnitureObject, type SpaceAnalysisResponse } from "../types/spatial";

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
  // Text typed in the catalog search box.
  const [searchQuery, setSearchQuery] = useState("");

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

  function handleLogout() {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // Storage blocked: there is no stored token to remove anyway.
    }
    setIsAuthenticated(false);
  }

  /** Marks the piece with `id` as inspected (and unmarks the rest); null clears it. */
  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter((c) => c.name.toLowerCase().includes(query));
  }, [catalog, searchQuery]);

  const selectedFurniture = placedFurniture.find((f) => f.selected) ?? null;

  // Bounding boxes in meters of everything in the room: the generated layout
  // (sizes in cm) plus the pieces suggested by the camera analysis.
  const occupyingItems = useMemo<Dimensions3D[]>(
    () => [
      ...placedItems.map(({ item }) => ({
        width: item.widthCm / 100,
        height: item.heightCm / 100,
        depth: item.depthCm / 100,
      })),
      ...placedFurniture.map((f) => f.dimensions ?? DEFAULT_DIMENSIONS),
    ],
    [placedItems, placedFurniture]
  );

  function handleSelectFurniture(id: string | null) {
    setPlacedFurniture((prev) => prev.map((f) => ({ ...f, selected: f.id === id })));
  }

  /** Removes the selected piece from the viewer; it only exists in local state. */
  function deleteFurnitureItem() {
    setPlacedFurniture((prev) => prev.filter((f) => !f.selected));
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
        <div className="sidebar-header">
          <span className="session-status">Sesión activa</span>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>

        <SpatialAnalytics roomAreaM2={typeof space === "object" && space ? space.areaM2 : null} items={occupyingItems} />

        <section>
          <ObjectForm onCreated={(item) => setCatalog((prev) => [...prev, item])} />
        </section>

        <section className="catalog">
          <div className="catalog-header">
            <h3>Catalog ({catalog.length})</h3>
            <input
              type="text"
              className="catalog-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Buscar mueble…"
              aria-label="Buscar en el catálogo"
            />
          </div>
          <ul className="catalog-list">
            {filteredCatalog.map((c) => (
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
          {catalog.length > 0 && filteredCatalog.length === 0 && (
            <p className="hint">Ningún mueble coincide con “{searchQuery.trim()}”.</p>
          )}
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
            <Scene3D furniture={placedFurniture} loading={analyzingSpace} onSelect={handleSelectFurniture} />
            {selectedFurniture && (
              <button type="button" className="delete-selected-button" onClick={deleteFurnitureItem}>
                Delete Selected <span className="delete-selected-name">({selectedFurniture.name})</span>
              </button>
            )}
          </div>
        </section>

        {error && <p className="warning">{error}</p>}
      </main>

      {/* Floating AI organization assistant (phase 3), bottom-right corner. */}
      <ChatPanel projectId={DEMO_PROJECT_ID} />
    </div>
  );
}
