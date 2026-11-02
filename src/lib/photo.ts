/**
 * Reducción de la foto en el navegador antes de enviarla a POST /rooms/{id}/analyze-photo:
 * ~1600 px de lado mayor, JPEG de calidad 0,85, con la orientación EXIF del móvil aplicada.
 *
 * Todo lo que se puede probar sin navegador son funciones puras (tamaño destino, lectura del
 * JPEG, transformación por orientación); `downscalePhoto` solo las combina con el canvas.
 */

export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_JPEG_QUALITY = 0.85;
/** Máximo que acepta el backend (413 por encima). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

export interface Size {
  width: number;
  height: number;
}

/** Tamaño que cabe en maxSide × maxSide conservando la proporción; nunca agranda. */
export function scaledSize(width: number, height: number, maxSide: number = PHOTO_MAX_SIDE): Size {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Las orientaciones EXIF 5 a 8 giran 90°: el ancho y el alto se intercambian. */
export function swapsSides(orientation: number): boolean {
  return orientation >= 5 && orientation <= 8;
}

/** Tamaño con el que se ve la foto una vez aplicada su orientación. */
export function orientedSize(size: Size, orientation: number): Size {
  return swapsSides(orientation) ? { width: size.height, height: size.width } : size;
}

/** Orientación EXIF y tamaño en píxeles tal como están guardados en el JPEG (sin girar). */
export interface JpegInfo extends Size {
  orientation: number;
}

/** Orientación (1-8) de un bloque EXIF que empieza en `start` (justo tras "Exif\0\0"); 1 si no hay. */
function exifOrientation(bytes: Uint8Array, start: number, end: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const little = bytes[start] === 0x49 && bytes[start + 1] === 0x49; // "II" = little endian
  if (!little && !(bytes[start] === 0x4d && bytes[start + 1] === 0x4d)) return 1; // ni "II" ni "MM"
  const ifd = start + view.getUint32(start + 4, little);
  if (ifd + 2 > end) return 1;
  const entries = view.getUint16(ifd, little);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return 1;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/**
 * Lee la orientación EXIF y el tamaño (marcador SOF) de un JPEG.
 *
 * @returns null si no es un JPEG o no se encuentra el tamaño; nunca lanza con datos corruptos.
 */
export function readJpegInfo(bytes: Uint8Array): JpegInfo | null {
  try {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let orientation = 1;
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset += 1; // relleno entre marcadores
        continue;
      }
      if (marker === 0xda || marker === 0xd9) return null; // datos de imagen sin haber visto un SOF
      const length = view.getUint16(offset + 2);
      const end = offset + 2 + length;
      if (length < 2 || end > bytes.length) return null;
      const isExif =
        marker === 0xe1 &&
        length >= 16 &&
        String.fromCharCode(...bytes.subarray(offset + 4, offset + 8)) === "Exif" &&
        bytes[offset + 8] === 0 &&
        bytes[offset + 9] === 0;
      if (isExif) orientation = exifOrientation(bytes, offset + 10, end);
      // SOF0-SOF15 salvo DHT (C4), JPG (C8) y DAC (CC): alto y ancho de la imagen.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        if (offset + 9 > bytes.length) return null;
        return { orientation, height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      offset = end;
    }
    return null;
  } catch {
    return null;
  }
}

/** Matriz de canvas [a, b, c, d, e, f] (setTransform) que endereza una imagen dibujada en width × height. */
export type CanvasTransform = [number, number, number, number, number, number];

/**
 * Transformación para dibujar con drawImage(img, 0, 0, width, height) una imagen guardada SIN
 * girar, de modo que quede derecha. width/height son los del dibujo antes de girar.
 */
export function orientationTransform(orientation: number, width: number, height: number): CanvasTransform {
  switch (orientation) {
    case 2:
      return [-1, 0, 0, 1, width, 0];
    case 3:
      return [-1, 0, 0, -1, width, height];
    case 4:
      return [1, 0, 0, -1, 0, height];
    case 5:
      return [0, 1, 1, 0, 0, 0];
    case 6:
      return [0, 1, -1, 0, height, 0];
    case 7:
      return [0, -1, -1, 0, height, width];
    case 8:
      return [0, -1, 1, 0, 0, width];
    default:
      return [1, 0, 0, 1, 0, 0];
  }
}

/**
 * ¿Hay que girar a mano? Solo si la orientación intercambia lados y el navegador devolvió la
 * imagen con el tamaño guardado (sin girar). Las orientaciones 2-4 no cambian el tamaño, así que
 * no se pueden detectar: en ellas se confía en el navegador (todos los actuales aplican EXIF).
 */
export function needsManualRotation(info: JpegInfo | null, decoded: Size): boolean {
  if (!info || !swapsSides(info.orientation) || info.width === info.height) return false;
  return decoded.width === info.width && decoded.height === info.height;
}

/** Decodifica pidiendo al navegador que aplique EXIF; si no entiende la opción, usa su valor por defecto. */
async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return await createImageBitmap(file);
  }
}

/**
 * Reduce la foto a PHOTO_MAX_SIDE px de lado mayor y la codifica como JPEG PHOTO_JPEG_QUALITY,
 * derecha según su orientación EXIF. Solo en el navegador (usa createImageBitmap y canvas).
 *
 * @throws Error si la imagen no se puede leer o codificar.
 */
export async function downscalePhoto(file: Blob): Promise<Blob> {
  const info = file.type === "image/jpeg" ? readJpegInfo(new Uint8Array(await file.arrayBuffer())) : null;
  const bitmap = await decodeImage(file);
  try {
    const manual = needsManualRotation(info, bitmap);
    const upright = manual ? orientedSize(bitmap, info!.orientation) : { width: bitmap.width, height: bitmap.height };
    const target = scaledSize(upright.width, upright.height);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas sin contexto 2d");
    if (manual) {
      // Se dibuja con el tamaño guardado (lados intercambiados respecto al destino) y se gira.
      const drawn = orientedSize(target, info!.orientation);
      context.setTransform(...orientationTransform(info!.orientation, drawn.width, drawn.height));
      context.drawImage(bitmap, 0, 0, drawn.width, drawn.height);
    } else {
      context.drawImage(bitmap, 0, 0, target.width, target.height);
    }
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("no se pudo codificar la foto"))),
        "image/jpeg",
        PHOTO_JPEG_QUALITY
      )
    );
  } finally {
    bitmap.close();
  }
}
