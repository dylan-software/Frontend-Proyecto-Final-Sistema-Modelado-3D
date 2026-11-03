/**
 * Textos de la interfaz en español, en un único lugar: cambiar un texto no
 * toca la lógica. Los componentes nuevos o reescritos leen sus textos de aquí.
 */
export const es = {
  app: {
    title: "Sistema de decoración de espacios en 3D",
  },
  auth: {
    loginSubtitle: "Inicia sesión para continuar",
    registerSubtitle: "Crea tu cuenta",
    username: "Nombre de usuario",
    usernamePlaceholder: "ej. dylan3d",
    email: "Correo electrónico",
    emailPlaceholder: "tu@correo.com",
    password: "Contraseña",
    passwordPlaceholder: (min: number) => `Mínimo ${min} caracteres`,
    confirmPassword: "Confirmar contraseña",
    confirmPasswordPlaceholder: "Repite la contraseña",
    verifying: "Verificando…",
    loginButton: "Iniciar Sesión",
    registerButton: "Crear cuenta",
    noAccount: "¿No tienes cuenta?",
    haveAccount: "¿Ya tienes cuenta?",
    switchToRegister: "Registrarse",
    switchToLogin: "Iniciar sesión",
    usernameRequired: "El nombre de usuario es obligatorio.",
    invalidEmail: "Introduce un correo electrónico válido.",
    passwordTooShort: (min: number) => `La contraseña debe tener al menos ${min} caracteres.`,
    passwordsDiffer: "Las contraseñas no coinciden.",
  },
  scan: {
    title: "Escanea tu espacio",
    intro: "Traza el contorno real de la sala; no tiene que ser un rectángulo.",
    roomName: "Nombre de la sala",
    defaultRoomName: "Mi sala",
    ceilingHeight: "Altura del techo (m)",
    saving: "Guardando la sala…",
  },
  home: {
    sessionActive: "Sesión activa",
    logout: "Cerrar Sesión",
    catalogTitle: (count: number) => `Catálogo (${count})`,
    clearCatalog: "Vaciar el catálogo",
    clearing: "Vaciando…",
    confirmClear: (count: number) => `Se eliminarán del servidor los ${count} muebles del catálogo. ¿Continuar?`,
    clearFailed: (count: number, reasons: string) => `No se pudieron eliminar ${count} muebles: ${reasons}`,
    currentRoom: "Sala actual",
    loading: "Cargando…",
    noRooms: "Aún no tienes ninguna sala. Traza la forma de tu habitación para empezar.",
    traceRoom: "Trazar una sala",
    rescan: "Volver a escanear desde cero",
    layoutTitle: "Distribución",
    generateLayout: "Generar distribución",
    generating: "Generando…",
    layoutNeedsItems: "Primero añade al menos un objeto desde el panel lateral.",
    layoutNotReady: "La distribución no quedó lista para mostrarse; prueba con menos muebles o más pequeños.",
  },
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
  scene: {
    resetView: "Restablecer vista",
  },
  objectForm: {
    title: "Añadir un objeto nuevo",
    name: "Nombre *",
    namePlaceholder: "p. ej. Mi sillón de lectura",
    width: "Ancho (cm)",
    height: "Alto (cm)",
    depth: "Fondo (cm)",
    measureWithCamera: "Medir con la cámara",
    measuring: (dimension: "width" | "height" | "depth") =>
      `Midiendo: ${{ width: "ancho", height: "alto", depth: "fondo" }[dimension]}`,
    category: "Categoría",
    newCategory: "Nombre de la nueva categoría *",
    newCategoryPlaceholder: "p. ej. escritorio, alfombra, planta",
    material: "Material",
    materialPlaceholder: "p. ej. madera",
    style: "Estilo",
    stylePlaceholder: "p. ej. escandinavo",
    price: "Precio",
    save: "Guardar en el catálogo",
    saving: "Guardando…",
    nameRequired: "El nombre del objeto es obligatorio.",
    newCategoryRequired: "Escribe el nombre de la nueva categoría o elige otra que no sea «Otra».",
    sizesRequired: "El ancho, el alto y el fondo deben ser mayores que 0.",
  },
  catalog: {
    searchPlaceholder: "🔍 Buscar mueble…",
    searchLabel: "Buscar en el catálogo",
    clearSearch: "Limpiar búsqueda",
    expandAll: "▼ Expandir todo",
    collapseAll: "▲ Contraer todo",
    delete: "Eliminar",
    deleteItem: (name: string) => `Eliminar ${name}`,
    noMatches: (query: string) => `Ningún mueble coincide con “${query}”.`,
  },
  /**
   * Etiquetas de las categorías que guarda la base (sofa, chair…). Solo se traduce lo que se MUESTRA:
   * los valores enviados a la API no cambian. Las categorías propias del usuario se muestran tal cual.
   */
  categories: {
    /** Títulos de los grupos del catálogo (plural). */
    groups: {
      bed: "Camas",
      chair: "Sillas",
      table: "Mesas",
      sofa: "Sofás",
      shelf: "Estanterías",
      lamp: "Lámparas",
      other: "Otros",
      Others: "Otros",
    } as Record<string, string>,
    /** Opciones del selector del formulario (singular). "Others" deja escribir una categoría nueva. */
    options: {
      sofa: "Sofá",
      table: "Mesa",
      chair: "Silla",
      bed: "Cama",
      shelf: "Estantería",
      lamp: "Lámpara",
      Others: "Otra (escribir…)",
    } as Record<string, string>,
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
    ui: {
      title: "Foto a 3D",
      intro:
        "Haz o sube una foto de la habitación: la IA estima sus medidas y hasta 10 objetos, y los dibuja como cajas.",
      button: "Foto a 3D",
      noRoom: "Abre o traza una sala para poder estimarla con una foto.",
      analyzing: "Analizando la foto con IA… puede tardar hasta un minuto.",
      done: (count: number) =>
        count === 1 ? "Se dibujó 1 objeto estimado." : `Se dibujaron ${count} objetos estimados.`,
      discardedTitle: "Objetos descartados",
    },
    dialog: {
      title: "Antes de enviar la foto",
      privacy:
        "La imagen se envía a un servicio de IA externo para analizarla; no incluyas personas ni datos personales. La foto no se guarda.",
      replace: (savedItems: number) => {
        if (savedItems === 0) return "Se perderá la forma actual de la sala: se reemplazará por la que estime la foto.";
        const items = savedItems === 1 ? "su mueble guardado" : `sus ${savedItems} muebles guardados`;
        return `Se perderán la forma actual de la sala y ${items}: se reemplazarán por lo que estime la foto.`;
      },
      instructionsLabel: "Indicaciones para la IA (opcional)",
      instructionsPlaceholder: "Por ejemplo: ignora los objetos pequeños.",
      cancel: "Cancelar",
      confirm: "Enviar la foto y reemplazar",
    },
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
