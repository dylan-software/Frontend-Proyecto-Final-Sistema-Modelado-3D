import { useState, type ChangeEvent, type FormEvent } from "react";

import { api, toFurnitureInput, type FurnitureInput } from "../lib/api";
import { LaserMeasure } from "./LaserMeasure";

interface ObjectFormProps {
  /** Account the new catalog entries are stored under. */
  userId: string;
  onCreated: (item: FurnitureInput) => void;
}

/** Selecting this option lets the user type their own category name. */
const OTHERS_CATEGORY = "Others";

const CATEGORIES = ["sofa", "table", "chair", "bed", "shelf", "lamp", OTHERS_CATEGORY];

/** True for categories the user typed in via "Others" (legacy "other" counts as predefined). */
export function isCustomCategory(category: string): boolean {
  return category !== "other" && !CATEGORIES.includes(category);
}

/**
 * Manual object creation. The object's NAME is required — the form
 * will not submit without it. Width/height/depth can be typed directly
 * or filled from the laser measurement tool (tap-to-measure in AR).
 * Choosing "Others" as the category reveals a text field whose value is
 * sent to the backend as the category name.
 */
export function ObjectForm({ userId, onCreated }: ObjectFormProps) {
  const [name, setName] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [depthCm, setDepthCm] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  // True while "Others" is selected, so the custom category field is shown.
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
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

  const customCategoryMissing = showCustomCategory && !customCategoryName.trim();

  function handleCategoryChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setCategory(value);
    setShowCustomCategory(value === OTHERS_CATEGORY);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("The object name is required.");
      return;
    }
    if (customCategoryMissing) {
      setError('Type a name for the new category, or pick one other than "Others".');
      return;
    }
    const w = Number(widthCm);
    const h = Number(heightCm);
    const d = Number(depthCm);
    if (!(w > 0 && h > 0 && d > 0)) {
      setError("Width, height and depth must all be greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      // With "Others" the backend creates (or reuses) the category typed in custom_category.
      const stored = await api.createCatalogFurniture({
        user_id: userId,
        nombre: name.trim(),
        categoria: showCustomCategory ? OTHERS_CATEGORY : category,
        custom_category: showCustomCategory ? customCategoryName.trim() : undefined,
        ancho: w,
        alto: h,
        profundidad: d,
      });
      // The server id is what DELETE /furniture/{id} expects later on.
      onCreated({
        ...toFurnitureInput(stored),
        material: material || "unspecified",
        price: Number(price) || 0,
        style: style || "unspecified",
        createdManually: true,
      });
      setName("");
      setWidthCm("");
      setHeightCm("");
      setDepthCm("");
      setMaterial("");
      setPrice("");
      setStyle("");
      setCustomCategoryName("");
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
          <label>
            New category name *
            <input
              type="text"
              className="custom-category-input"
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              placeholder="e.g. desk, rug, plant"
              required
              aria-invalid={error !== null && customCategoryMissing}
              autoFocus
            />
          </label>
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
