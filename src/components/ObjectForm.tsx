import { useState, type ChangeEvent, type FormEvent } from "react";

import { es } from "../i18n/es";
import { api, toFurnitureInput, type FurnitureInput } from "../lib/api";
import { categoryLabel } from "../lib/catalog";
import { LaserMeasure } from "./LaserMeasure";

interface ObjectFormProps {
  /** Cuenta en la que se guardan los objetos nuevos del catálogo. */
  userId: string;
  onCreated: (item: FurnitureInput) => void;
}

/** Elegir esta opción deja escribir una categoría propia. Es el valor que espera la API: no se traduce. */
const OTHERS_CATEGORY = "Others";

const CATEGORIES = ["sofa", "table", "chair", "bed", "shelf", "lamp", OTHERS_CATEGORY];

/** True para las categorías escritas por el usuario con "Others" (la antigua "other" cuenta como predefinida). */
export function isCustomCategory(category: string): boolean {
  return category !== "other" && !CATEGORIES.includes(category);
}

/**
 * Creación manual de un objeto. El NOMBRE es obligatorio: el formulario no se envía sin él. Ancho,
 * alto y fondo se escriben a mano o se rellenan con la medición láser (tocar para medir en AR).
 * Elegir "Others" como categoría muestra un campo de texto cuyo valor se envía como nombre de la
 * categoría. Los textos vienen de i18n/es.ts; los valores de las categorías no se traducen.
 */
export function ObjectForm({ userId, onCreated }: ObjectFormProps) {
  const t = es.objectForm;
  const [name, setName] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [depthCm, setDepthCm] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  // True mientras "Others" está elegida, para mostrar el campo de la categoría propia.
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
      setError(t.nameRequired);
      return;
    }
    if (customCategoryMissing) {
      setError(t.newCategoryRequired);
      return;
    }
    const w = Number(widthCm);
    const h = Number(heightCm);
    const d = Number(depthCm);
    if (!(w > 0 && h > 0 && d > 0)) {
      setError(t.sizesRequired);
      return;
    }

    setSubmitting(true);
    try {
      // Con "Others" el backend crea (o reutiliza) la categoría escrita en custom_category.
      const stored = await api.createCatalogFurniture({
        user_id: userId,
        nombre: name.trim(),
        categoria: showCustomCategory ? OTHERS_CATEGORY : category,
        custom_category: showCustomCategory ? customCategoryName.trim() : undefined,
        ancho: w,
        alto: h,
        profundidad: d,
      });
      // El id del servidor es el que DELETE /furniture/{id} espera después.
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
    return <LaserMeasure label={t.measuring(activeMeasurement)} onMeasured={applyMeasurement} />;
  }

  return (
    <form className="object-form" onSubmit={handleSubmit}>
      <h3>{t.title}</h3>

      <label>
        {t.name}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} required />
      </label>

      <div className="dimension-row">
        <label>
          {t.width}
          <input type="number" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
        </label>
        <button type="button" className="link-button" onClick={() => setActiveMeasurement("width")}>
          {t.measureWithCamera}
        </button>
      </div>

      <div className="dimension-row">
        <label>
          {t.height}
          <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
        </label>
        <button type="button" className="link-button" onClick={() => setActiveMeasurement("height")}>
          {t.measureWithCamera}
        </button>
      </div>

      <div className="dimension-row">
        <label>
          {t.depth}
          <input type="number" value={depthCm} onChange={(e) => setDepthCm(e.target.value)} />
        </label>
        <button type="button" className="link-button" onClick={() => setActiveMeasurement("depth")}>
          {t.measureWithCamera}
        </button>
      </div>

      <label>
        {t.category}
        <select value={category} onChange={handleCategoryChange}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c, es.categories.options)}
            </option>
          ))}
        </select>
      </label>

      {showCustomCategory && (
        <div className="custom-category">
          <label>
            {t.newCategory}
            <input
              type="text"
              className="custom-category-input"
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              placeholder={t.newCategoryPlaceholder}
              required
              aria-invalid={error !== null && customCategoryMissing}
              autoFocus
            />
          </label>
        </div>
      )}

      <label>
        {t.material}
        <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder={t.materialPlaceholder} />
      </label>

      <label>
        {t.style}
        <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder={t.stylePlaceholder} />
      </label>

      <label>
        {t.price}
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>

      {error && <p className="warning">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? t.saving : t.save}
      </button>
    </form>
  );
}
