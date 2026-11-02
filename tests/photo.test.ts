import { describe, it, expect } from "vitest";

import {
  needsManualRotation,
  orientationTransform,
  orientedSize,
  readJpegInfo,
  scaledSize,
  type CanvasTransform,
} from "../src/lib/photo";

const u16 = (value: number, little: boolean) => (little ? [value & 0xff, value >> 8] : [value >> 8, value & 0xff]);
const u32 = (value: number, little: boolean) => {
  const big = [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
  return little ? big.reverse() : big;
};

/** Segmento APP1 con un EXIF mínimo: IFD0 con una sola entrada, Orientation. */
function exifSegment(orientation: number, little = true): number[] {
  const tiff = [
    ...(little ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42, little),
    ...u32(8, little), // IFD0 justo después de la cabecera
    ...u16(1, little), // una entrada
    ...u16(0x0112, little),
    ...u16(3, little), // SHORT
    ...u32(1, little),
    ...u16(orientation, little),
    0,
    0,
    ...u32(0, little), // sin más IFD
  ];
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]; // "Exif\0\0"
  return [0xff, 0xe1, ...u16(payload.length + 2, false), ...payload];
}

/** SOF0 con alto y ancho (big endian, como en todo JPEG). */
function sofSegment(width: number, height: number): number[] {
  const body = [8, ...u16(height, false), ...u16(width, false), 1, 1, 0x11, 0];
  return [0xff, 0xc0, ...u16(body.length + 2, false), ...body];
}

function jpeg(...segments: number[][]): Uint8Array {
  return new Uint8Array([0xff, 0xd8, ...segments.flat(), 0xff, 0xda, 0, 2, 0xff, 0xd9]);
}

/** Aplica la matriz de canvas a un punto, como hace el navegador. */
function apply([a, b, c, d, e, f]: CanvasTransform, x: number, y: number): [number, number] {
  return [a * x + c * y + e, b * x + d * y + f];
}

describe("scaledSize", () => {
  it("reduces the longest side to 1600 px keeping the proportion", () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it("never enlarges a small photo", () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaledSize(1600, 900)).toEqual({ width: 1600, height: 900 });
  });

  it("keeps at least one pixel on a very thin photo", () => {
    expect(scaledSize(10000, 2)).toEqual({ width: 1600, height: 1 });
  });
});

describe("readJpegInfo", () => {
  it.each([1, 3, 6, 8])("reads orientation %i from a little-endian EXIF and the size from SOF", (orientation) => {
    expect(readJpegInfo(jpeg(exifSegment(orientation), sofSegment(4032, 3024)))).toEqual({
      orientation,
      width: 4032,
      height: 3024,
    });
  });

  it("reads a big-endian (Motorola) EXIF too", () => {
    expect(readJpegInfo(jpeg(exifSegment(6, false), sofSegment(640, 480)))?.orientation).toBe(6);
  });

  it("defaults to orientation 1 without EXIF or with an invalid value", () => {
    expect(readJpegInfo(jpeg(sofSegment(640, 480)))).toEqual({ orientation: 1, width: 640, height: 480 });
    expect(readJpegInfo(jpeg(exifSegment(9), sofSegment(640, 480)))?.orientation).toBe(1);
  });

  it("returns null for a PNG, a truncated file or a JPEG without SOF, without throwing", () => {
    expect(readJpegInfo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull();
    expect(readJpegInfo(jpeg(exifSegment(6)).subarray(0, 12))).toBeNull();
    expect(readJpegInfo(jpeg(exifSegment(6)))).toBeNull();
    expect(readJpegInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]))).toBeNull();
  });
});

describe("orientation", () => {
  it("swaps width and height only for orientations 5 to 8", () => {
    const size = { width: 4032, height: 3024 };
    expect(orientedSize(size, 1)).toEqual(size);
    expect(orientedSize(size, 3)).toEqual(size);
    expect(orientedSize(size, 6)).toEqual({ width: 3024, height: 4032 });
    expect(orientedSize(size, 8)).toEqual({ width: 3024, height: 4032 });
  });

  // Un móvil en vertical guarda la foto apaisada con orientación 6: su esquina superior izquierda
  // debe acabar arriba a la derecha de la imagen derecha.
  it.each([
    [1, [0, 0], [0, 0]],
    [2, [0, 0], [160, 0]],
    [3, [0, 0], [160, 90]],
    [4, [0, 0], [0, 90]],
    [5, [0, 0], [0, 0]],
    [6, [0, 0], [90, 0]],
    [7, [0, 0], [90, 160]],
    [8, [0, 0], [0, 160]],
  ])("orientation %i sends the stored top-left corner to the right place", (orientation, from, to) => {
    expect(apply(orientationTransform(orientation, 160, 90), from[0]!, from[1]!)).toEqual(to);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])("orientation %i keeps the whole picture inside the canvas", (orientation) => {
    const target = orientedSize({ width: 160, height: 90 }, orientation);
    const transform = orientationTransform(orientation, 160, 90);
    for (const [x, y] of [
      [0, 0],
      [160, 0],
      [0, 90],
      [160, 90],
    ]) {
      const [tx, ty] = apply(transform, x!, y!);
      expect(tx).toBeGreaterThanOrEqual(0);
      expect(ty).toBeGreaterThanOrEqual(0);
      expect(tx).toBeLessThanOrEqual(target.width);
      expect(ty).toBeLessThanOrEqual(target.height);
    }
  });

  it("rotates by hand only when the browser returned the stored, unrotated size", () => {
    const portrait = { orientation: 6, width: 4032, height: 3024 };
    expect(needsManualRotation(portrait, { width: 4032, height: 3024 })).toBe(true);
    expect(needsManualRotation(portrait, { width: 3024, height: 4032 })).toBe(false); // ya girada
    expect(needsManualRotation({ ...portrait, orientation: 3 }, { width: 4032, height: 3024 })).toBe(false);
    expect(needsManualRotation({ ...portrait, width: 100, height: 100 }, { width: 100, height: 100 })).toBe(false);
    expect(needsManualRotation(null, { width: 4032, height: 3024 })).toBe(false);
  });
});
