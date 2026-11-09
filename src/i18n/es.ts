/**
 * Textos de la interfaz en español, en un único lugar: cambiar un texto no
 * toca la lógica. Los componentes nuevos o reescritos leen sus textos de aquí.
 */
/** Nombre provisional de la red social; solo se define aquí. */
export const SOCIAL_NETWORK_NAME = "Habita";

export const es = {
  app: {
    title: "Sistema de decoración de espacios en 3D",
  },
  /** Contenedor común de Proyectos y Red Social: barra superior, barra lateral y menú de usuario. */
  shell: {
    homeLink: "Ir a Proyectos",
    skipToContent: "Saltar al contenido",
    searchLabel: "Buscar proyectos por nombre",
    searchPlaceholder: "Buscar proyectos…",
    clearSearch: "Limpiar búsqueda",
    navTitle: "NAVEGACIÓN",
    navLabel: "Navegación principal",
    projects: "Proyectos",
    social: "Red Social",
    myAccount: "Mi cuenta",
    userMenu: (name: string) => `Menú de usuario: ${name}`,
    signedInAs: "Sesión iniciada como",
    logout: "Cerrar sesión",
  },
  /** Pantalla de Proyectos (/proyectos): una tarjeta por sala y la tarjeta para crear una. */
  projects: {
    title: "Proyectos",
    count: (n: number) => (n === 1 ? "1 proyecto" : `${n} proyectos`),
    /**
     * @deprecated Sin uso desde 2fe7107: los proyectos nuevos se llaman "Prueba N" (`groups.testBase` y
     * `nextTestName` de lib/groups.ts). Se conserva sin borrar; los proyectos ya existentes no se renombran.
     */
    newProjectName: "Proyecto nuevo",
    newProject: "Nuevo proyecto",
    newProjectHint: "Sala de 4 × 3 m y 2,5 m de alto",
    creating: "Creando…",
    createFailed: (reason: string) => `No se pudo crear el proyecto. ${reason}`,
    loading: "Cargando tus proyectos…",
    empty: "Aún no tienes proyectos. Crea el primero con «Nuevo proyecto»: es una sala de 4 × 3 m que puedes cambiar después.",
    noMatches: (query: string) => `Ningún proyecto se llama como «${query}».`,
    clearSearch: "Ver todos los proyectos",
    loadFailed: "No se pudieron cargar tus proyectos.",
    retry: "Reintentar",
    open: (name: string, area: string) => `Abrir el proyecto ${name}, ${area}`,
    plan: (name: string, width: string, depth: string) => `Plano de ${name}: ${width} de ancho y ${depth} de fondo`,
    /** Área aproximada (rectángulo ancho × fondo) mientras no llega el plano real. */
    approxArea: (area: string) => `≈ ${area}`,
    planPending: "Plano provisional mientras carga la forma real",
  },
  /** Panel de IA de la pantalla del proyecto (chat, buscador de muebles y creación manual). */
  aiPanel: {
    title: "Asistente de IA",
    minimize: "Minimizar el asistente",
    expand: "Abrir el asistente de IA",
    close: "Cerrar el asistente",
    catalogTitle: (count: number) => `Muebles (${count})`,
    manualTitle: "Crear objeto manualmente",
    manualHint: "Añade al catálogo un mueble con sus medidas, o vacía el catálogo entero.",
  },
  /** Lista "Objetos del proyecto" del panel de IA: los objetos guardados en ESTA sala (GET /items). */
  projectObjects: {
    title: (count: number) => `Objetos del proyecto (${count})`,
    filterLabel: "Filtrar los objetos por nombre",
    filterPlaceholder: "Filtrar por nombre…",
    clearFilter: "Ver todos los objetos",
    loading: "Cargando los objetos…",
    empty: "Este proyecto aún no tiene objetos",
    emptyHint: "Usa «Foto a 3D» para crear la sala y sus objetos a partir de una foto.",
    noMatches: (query: string) => `Ningún objeto coincide con «${query}».`,
    onFloor: "En el suelo",
    aboveFloor: (height: string) => `A ${height} del suelo`,
    /** Ancho × fondo × alto, en metros. */
    size: (width: string, depth: string, height: string) => `${width} × ${depth} × ${height} m`,
    sizeLabel: (width: string, depth: string, height: string) =>
      `${width} m de ancho, ${depth} m de fondo y ${height} m de alto`,
  },
  /** Zona del 3D de la pantalla del proyecto. */
  sceneArea: {
    label: "Vista 3D del proyecto",
    loading: "Cargando la sala…",
    unavailable: "No se pudo abrir esta sala. Vuelve a Proyectos y elige otra.",
    hideOccupancy: "Ocultar la ocupación del espacio",
    showOccupancy: "Mostrar la ocupación del espacio",
  },
  /** Pantalla de un proyecto (/proyecto/[id]): cabecera mínima propia. */
  project: {
    exit: "← Salir del proyecto",
    loadingName: "Cargando el proyecto…",
    editName: (name: string) => `Editar el nombre del proyecto ${name}`,
    editDescription: (name: string) => `Editar la descripción del proyecto ${name}`,
    invalidId: "Esta dirección no corresponde a ningún proyecto.",
  },
  /** Edición en el sitio de nombres y descripciones (InlineEdit). */
  inlineEdit: {
    save: "Guardar",
    saving: "Guardando…",
    cancel: "Cancelar",
    hintName: "Enter para guardar, Escape para cancelar",
    hintDescription: "Ctrl+Enter para guardar, Escape para cancelar",
    count: (used: number, max: number) => `${used}/${max}`,
  },
  /** Grupos de proyectos (carpetas) en /proyectos. */
  groups: {
    /** Base del nombre por defecto de un proyecto: "Prueba 1", "Prueba 2"… dentro de cada grupo. */
    testBase: "Prueba",
    summary: (groups: number, projects: number) =>
      `${groups === 1 ? "1 grupo" : `${groups} grupos`}, ${projects === 1 ? "1 proyecto" : `${projects} proyectos`}`,
    newGroup: "+ Nuevo grupo",
    newGroupLabel: "Nombre del grupo nuevo",
    newGroupPlaceholder: "Por ejemplo: Casa de la abuela",
    createGroup: "Crear grupo",
    creatingGroup: "Creando…",
    cancel: "Cancelar",
    ungroupedTitle: "Proyectos sin grupo",
    projectCount: (n: number) => (n === 1 ? "1 proyecto" : `${n} proyectos`),
    noDescription: "Sin descripción",
    emptyGroup: "Aún no hay pruebas en este grupo.",
    projectHere: "Proyecto aquí",
    editGroupName: (name: string) => `Editar el nombre del grupo ${name}`,
    editGroupDescription: (name: string) => `Editar la descripción del grupo ${name}`,
    collapse: (name: string) => `Plegar ${name}`,
    expand: (name: string) => `Desplegar ${name}`,
    moveLabel: (name: string) => `Mover ${name} a otro grupo`,
    moveTitle: "Mover a grupo",
    noGroupOption: "Sin grupo",
    moving: "Moviendo…",
    moveFailed: (reason: string) => `No se pudo mover el proyecto. ${reason}`,
    createGroupFailed: (reason: string) => `No se pudo crear el grupo. ${reason}`,
    validation: {
      nameRequired: "Escribe un nombre.",
      nameTooLong: (max: number) => `El nombre admite como mucho ${max} caracteres.`,
      nameChars: "El nombre no puede llevar < ni > ni caracteres especiales invisibles.",
      descriptionTooLong: (max: number) => `La descripción admite como mucho ${max} caracteres.`,
      descriptionChars: "La descripción solo admite texto, saltos de línea y tabuladores.",
    },
  },
  /** Red Social (/red): de momento solo el estado "En construcción", sin datos. */
  social: {
    status: "En construcción",
    title: SOCIAL_NETWORK_NAME,
    lead: `${SOCIAL_NETWORK_NAME} será el sitio para enseñar tus espacios y descubrir cómo decoran los suyos otras personas.`,
    ideasTitle: "Lo que podrás hacer",
    ideas: [
      { id: "share", title: "Compartir proyectos", text: "Publica una sala con su plano y sus muebles para que otros la vean." },
      { id: "explore", title: "Explorar ideas", text: "Recorre salas de otras personas y busca por tamaño o por estilo." },
      { id: "copy", title: "Copiar un proyecto", text: "Guarda en tus proyectos una copia de una sala que te guste y cámbiala a tu medida." },
    ],
    note: "Esta sección todavía no guarda ni muestra datos de nadie.",
    backToProjects: "Volver a mis proyectos",
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
    showPassword: "Mostrar la contraseña",
    hidePassword: "Ocultar la contraseña",
    knownEmails: "Cuentas usadas en este navegador",
    knownEmailsPlaceholder: "Elegir un correo…",
  },
  scan: {
    title: "Escanea tu espacio",
    intro: "Traza el contorno real de la sala; no tiene que ser un rectángulo.",
    roomName: "Nombre de la sala",
    defaultRoomName: "Mi sala",
    ceilingHeight: "Altura del techo (m)",
    saving: "Guardando la sala…",
  },
  /** Trazado de la sala (oculto en la interfaz actual, se traduce igualmente). */
  tracer: {
    noArDrawManually: "¿Sin cámara AR? Dibuja la forma de la sala a mano",
    gridHint: (cellM: number) =>
      `Haz clic para colocar cada esquina de la sala, en orden y rodeando la forma; no tiene que ser un rectángulo. Cada celda mide ${cellM} m.`,
    undoLastPoint: "Deshacer el último punto",
    reset: "Reiniciar",
    pointsPlaced: (count: number) => (count === 1 ? "1 punto colocado." : `${count} puntos colocados.`),
    finish: (count: number) =>
      `Terminar la forma (${count < 3 ? "faltan puntos: mínimo 3" : "lista"})`,
  },
  /** Medición láser con AR (oculta en la interfaz actual, se traduce igualmente). */
  laser: {
    noArEnterManually: "¿Sin cámara AR? Escribe la medida a mano",
    distancePlaceholder: "Distancia en cm",
    useValue: "Usar este valor",
  },
  /** Análisis con cámara antiguo (CameraCapture, ya sin uso; se traduce igualmente). */
  camera: {
    uploadPhoto: "Subir foto",
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
    inputLabel: "Mensaje para el asistente",
    send: "Enviar",
    sending: "Enviando…",
    thinking: "Pensando…",
    minimize: "Minimizar el chat",
    open: "Abrir el asistente de IA",
    close: "Cerrar el asistente de IA",
    /** Línea discreta bajo la respuesta que guardó cambios (CONTRATO-FASE2.md, sección 3). */
    changes: {
      label: "Cambios guardados",
      added: (name: string, where: string) => `Añadí: ${name}, ${where}`,
      removed: (name: string) => `Quité: ${name}`,
      moved: (name: string, where: string) => `Moví: ${name}, ${where}`,
    },
  },
  scene: {
    resetView: "Restablecer vista",
    labels: "Nombres",
    hideLabels: "Ocultar los nombres de los objetos",
    showLabels: "Mostrar los nombres de los objetos",
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
    /** Rutas Node viejas (/api/...), ya sin uso salvo el layout oculto. */
    legacyFailed: (path: string, status: number) => `La petición a ${path} falló (HTTP ${status}).`,
  },
  photo: {
    ui: {
      title: "Foto a 3D",
      intro:
        "Haz o sube una foto de la habitación: la IA estima sus medidas y hasta 10 objetos, y los dibuja como cajas.",
      button: "Foto a 3D",
      noRoom: "Abre o traza una sala para poder estimarla con una foto.",
      analyzing: "Analizando la foto con IA… puede tardar hasta un minuto.",
      analyzingShort: "Analizando…",
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
  /** Deshacer único de la sala: foto, chat y objetos (CONTRATO-FASE2.md). */
  undo: {
    button: "Deshacer",
    busy: "Deshaciendo…",
    hint: "Deshace el último cambio de la sala: la foto, el chat o los objetos.",
    done: {
      photo: "Se deshizo la foto.",
      chat: "Se deshizo el último cambio del chat.",
      add: "Se quitó el objeto añadido.",
      update: "Se deshizo el cambio del objeto.",
      delete: "Se recuperó el objeto borrado.",
      layout: "Se deshizo la distribución.",
      vertices: "Se deshizo el cambio de la forma de la sala.",
      other: "Se deshizo el último cambio.",
    },
    more: (remaining: number) => `Puedes deshacer ${remaining} más.`,
    nothing: "No queda ningún cambio que deshacer. El historial se borra si el servidor se reinicia.",
  },
} as const;
