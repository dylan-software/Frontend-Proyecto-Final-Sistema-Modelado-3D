import { useState } from "react";
import { useRouter } from "next/router";
import { RoomTracer } from "../components/RoomTracer";
import { es } from "../i18n/es";
import { api, type Point2D } from "../lib/api";
import { checkNewRoom } from "../lib/roomShape";
import { ROUTES } from "../lib/routes";
import { saveCurrentRoomId } from "../lib/session";

export default function ScanPage() {
  const t = es.scan;
  const router = useRouter();
  const [name, setName] = useState<string>(t.defaultRoomName);
  const [heightM, setHeightM] = useState("2.6");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Crea la sala de la cuenta con sesión (POST /api/v1/spaces/rooms, vértices en metros) y abre su
   * proyecto ("/" ya solo es el inicio de sesión).
   */
  async function handleFinish(vertices: Point2D[]) {
    const check = checkNewRoom(name, heightM, vertices);
    // `in` estrecha la unión aunque no haya strictNullChecks (tsconfig tiene strict: false).
    if ("error" in check) {
      setError(check.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const room = await api.createRoom(check.room);
      saveCurrentRoomId(room.id);
      await router.push(ROUTES.project(room.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <h1>{t.title}</h1>
      <p>{t.intro}</p>

      <label>
        {t.roomName}
        <input type="text" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label>
        {t.ceilingHeight}
        <input type="number" step="0.1" min="0.1" max="20" value={heightM} onChange={(e) => setHeightM(e.target.value)} />
      </label>

      <RoomTracer onFinish={handleFinish} />

      {saving && <p>{t.saving}</p>}
      {error && <p className="warning">{error}</p>}
    </div>
  );
}
