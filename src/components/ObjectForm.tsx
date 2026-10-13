import { useState } from "react";
import { LaserMeasure } from "./LaserMeasure";
import { api, type FurnitureInput } from "../lib/api";

interface ObjectFormProps {
  onCreated: (item: FurnitureInput) => void;
}

/** Selecting this option lets the user type their own category name. */
const OTHERS_CATEGORY = "Others";

const CATEGORIES = ["sofa", "table", "chair", "bed", "shelf", "lamp", OTHERS_CATEGORY];

/**
 * Manual object creation. The object's NAME is required — the form
 * will not submit without it. Width/height/depth can be typed directly
 * or filled from the laser measurement tool (tap-to-measure in AR).
 */
export function ObjectForm({ onCreated }: ObjectFormProps) {
  const [name, setName] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [depthCm, setDepthCm] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  // True while "Others" is selected, so the custom category field is shown.
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [material, setMaterial] = useState("");
  const [price, setPrice] = useState("");
  const [style, setStyle] = useState("");
  const [activeMeasurement, setActiveMeasurement] = useState<"width" | "height" | "depth" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyMeasurement(cm: number) {
    if (activeMeasurement === "width") setWidthCm(String(cm));
    if (activeMeasurement === "height") setHeightCm(String(cm));
    if (activeMeasurement === "depth") setDepthCm(String(cm));
    setActiveMeasurement(null);
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setCategory(value);
    setShowCustomCategory(value === OTHERS_CATEGORY);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("The object name is required.");
      return;
    }
    const w = Number(widthCm);
    const h = Number(heightCm);
    const d = Number(depthCm);
    if (!(w > 0 && h > 0 && d > 0)) {
      setError("Width, height and depth must all be greater than 0.");
      return;
    }

    const item: FurnitureInput = {
      id: crypto.randomUUID(),
      name: name.trim(),
      widthCm: w,
      heightCm: h,
      depthCm: d,
      category,
      material: material || "unspecified",
      price: Number(price) || 0,
      style: style || "unspecified",
      createdManually: true,
    };

    setSubmitting(true);
    try {
      await api.createFurniture(item);
      onCreated(item);
      setName("");
      setWidthCm("");
      setHeightCm("");
      setDepthCm("");
      setMaterial("");
      setPrice("");
      setStyle("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (activeMeasurement) {
    return (
      <LaserMeasure
        label={`Measuring: ${activeMeasurement}`}
        onMeasured={applyMeasurement}
      />
    );
  }

  return (
    <form className="object-form" onSubmit={handleSubmit}>
      <h3>Add a new object</h3>

      <label>
        Name *
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My reading chair" required />
      </label>

      <div className="dimension-row">
        <label>
          Width (cm)
          <input type="number" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
        </label>
        <button type="button" className="link-button" onClick={() => setActiveMeasurement("width")}>
          Measure with camera
        </button>
      </div>

      <div className="dimension-row">
        <label>
          Height (cm)
          <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
        </label>
        <button type="button" className="link-button" onClick={() => setActiveMeasurement("height")}>
          Measure with camera
        </button>
      </div>

      <div className="dimension-row">
        <label>
          Depth (cm)
          <input type="number" value={depthCm} onChange={(e) => setDepthCm(e.target.value)} />
        </label>
        <button type="button" className="link-button" onClick={() => setActiveMeasurement("depth")}>
          Measure with camera
        </button>
      </div>

      <label>
        Category
        <select value={category} onChange={handleCategoryChange}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {showCustomCategory && (
        <div className="custom-category">
          <label>New category name *</label>
        </div>
      )}

      <label>
        Material
        <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g. wood" />
      </label>

      <label>
        Style
        <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="e.g. scandinavian" />
      </label>

      <label>
        Price
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>

      {error && <p className="warning">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Save object to catalog"}
      </button>
    </form>
  );
}
