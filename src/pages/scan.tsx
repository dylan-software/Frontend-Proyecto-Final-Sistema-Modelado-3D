import { useState } from "react";
import { useRouter } from "next/router";
import { RoomTracer } from "../components/RoomTracer";
import { api, type Point2D } from "../lib/api";

const DEMO_PROJECT_ID = "demo-project"; // single-project demo; replace with real project selection later
const DEMO_USER_ID = "demo-user";

export default function ScanPage() {
  const router = useRouter();
  const [heightM, setHeightM] = useState("2.6");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish(vertices: Point2D[]) {
    setSaving(true);
    setError(null);
    try {
      await api.createSpace(DEMO_PROJECT_ID, {
        userId: DEMO_USER_ID,
        name: "My space",
        vertices,
        heightM: Number(heightM),
      });
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <h1>Scan your space</h1>
      <p>Trace the real outline of the room — it does not have to be a rectangle.</p>

      <label>
        Ceiling height (m)
        <input type="number" step="0.1" value={heightM} onChange={(e) => setHeightM(e.target.value)} />
      </label>

      <RoomTracer onFinish={handleFinish} />

      {saving && <p>Saving space…</p>}
      {error && <p className="warning">{error}</p>}
    </div>
  );
}
