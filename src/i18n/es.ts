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
  /** Mensajes de error de las rutas /api/v1, por código HTTP (los usa describeApiError). */
  errors: {
    sessionExpired: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
    notFound: "No se encontró lo que buscabas; puede que ya no exista.",
    conflict: "La operación choca con lo que ya está guardado.",
    photoTooLarge: "La foto es demasiado grande: el máximo es 5 MB.",
    photoType: "Formato de foto no admitido: usa una imagen JPEG o PNG.",
    invalidData: "Los datos enviados no son válidos.",
    tooManyRequests: "Has hecho demasiadas peticiones.",
    retryIn: (seconds: number) => `Podrás volver a intentarlo en ${seconds} segundos.`,
    retrySoon: "Espera un momento antes de volver a intentarlo.",
    aiUnavailable: "El asistente de IA no está disponible ahora.",
    databaseUnavailable: "La base de datos no está disponible ahora. Inténtalo más tarde.",
    timeout: "El servidor tardó demasiado en responder. Inténtalo de nuevo en un momento.",
    failed: (status: number) => `La petición falló (HTTP ${status}).`,
  },
  photo: {
    scene: {
      estimated: "Estimado",
      estimatedHint: "Medidas aproximadas, estimadas a partir de una foto.",
      elevation: (meters: number) => `a ${meters.toFixed(2).replace(".", ",")} m del suelo`,
    },
    errors: {
      notFound: "Esta sala ya no existe o no es de tu cuenta. Recarga la página.",
      conflict: "Hay que confirmar que se reemplazan la forma y los muebles de la sala.",
      badEstimate:
        "La IA no pudo estimar la sala con esta foto. Prueba con otra más clara, con el suelo y las paredes a la vista.",
      timeout: "El análisis de la foto tardó demasiado. Inténtalo de nuevo en un momento o con una foto más pequeña.",
      unreadable: "No se pudo leer la foto en el navegador. Prueba con otra imagen JPEG o PNG.",
    },
  },
} as const;
