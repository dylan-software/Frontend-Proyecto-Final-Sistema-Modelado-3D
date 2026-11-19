import { useRouter } from "next/router";
import { useState } from "react";

import { api } from "../lib/api";
import { ROUTES } from "../lib/routes";
import { copyErrorMessage } from "../lib/social";

/**
 * "Copiar a mis proyectos" de la red social (/red y la página de un perfil): una copia a la vez; al
 * terminar abre el proyecto nuevo; si falla, guarda el error junto al código de la tarjeta.
 */
export function usePublicationCopy() {
  const router = useRouter();
  const [copyingCode, setCopyingCode] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<{ code: string; message: string } | null>(null);

  async function copy(code: string) {
    if (copyingCode) return;
    setCopyingCode(code);
    setCopyError(null);
    try {
      const copied = await api.copyPublication(code);
      await router.push(ROUTES.project(copied.room.id));
    } catch (err) {
      setCopyError({ code, message: copyErrorMessage(err) });
      setCopyingCode(null);
    }
  }

  return { copyingCode, copyError, copy };
}
