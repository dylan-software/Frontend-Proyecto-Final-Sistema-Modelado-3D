import { useState } from "react";
import { useRouter } from "next/router";
import { RoomTracer } from "../components/RoomTracer";
import { api, type Point2D } from "../lib/api";
import { checkNewRoom } from "../lib/roomShape";
import { saveCurrentRoomId } from "../lib/session";

export default function ScanPage() {
  const router = useRouter();
  const [name, setName] = useState("Mi sala");
  const [heightM, setHeightM] = useState("2.6");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Creates the room for the logged-in account (POST /api/v1/spaces/rooms,
   * vertices in meters) and goes back to "/" with it as the current room.
   */
  async function handleFinish(vertices: Point2D[]) {
    const check = checkNewRoom(name, heightM, vertices);
    // `in` narrows the union even without strictNullChecks (tsconfig has strict: false).
    if ("error" in check) {
      setError(check.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const room = await api.createRoom(check.room);
      saveCurrentRoomId(room.id);
      await router.push("/");
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
        Nombre de la sala
        <input type="text" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label>
        Ceiling height (m)
        <input type="number" step="0.1" min="0.1" max="20" value={heightM} onChange={(e) => setHeightM(e.target.value)} />
      </label>

      <RoomTracer onFinish={handleFinish} />

      {saving && <p>Guardando la sala…</p>}
      {error && <p className="warning">{error}</p>}
    </div>
  );
}
