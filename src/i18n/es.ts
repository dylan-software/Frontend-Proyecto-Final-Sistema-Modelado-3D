/**
 * Textos de la interfaz en español, en un único lugar: cambiar un texto no
 * toca la lógica. Los componentes nuevos o reescritos leen sus textos de aquí.
 */
export const es = {
  chat: {
    title: "Asistente de IA",
    greeting: "¡Hola! Pregúntame cómo organizar tu espacio: conozco su forma y los muebles que ya tiene.",
    dataHint: "Responde con los datos reales de tu sala (forma y muebles colocados); no ve fotos ni el modelo 3D.",
    privacyNotice: "Tus mensajes se envían a un servicio de IA externo; no escribas datos personales.",
    noRoom: "Guarda o abre una sala para poder usar el chat.",
    placeholder: "Por ejemplo: ¿cómo distribuyo mis muebles?",
    send: "Enviar",
    sending: "Enviando…",
    thinking: "Pensando…",
    minimize: "Minimizar el chat",
    open: "Abrir el asistente de IA",
    close: "Cerrar el asistente de IA",
  },
} as const;
