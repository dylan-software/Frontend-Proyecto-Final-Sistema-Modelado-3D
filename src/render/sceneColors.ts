/**
 * Colores y luces de la sala en 3D, compartidos por la vista del proyecto (RenderScene) y las
 * miniaturas de las tarjetas (thumbnailScene), para que las dos se vean igual. No dependen del tema:
 * el fondo es transparente y deja ver el de la página.
 */

// Cajas: las del suelo, las que están por encima (cuadros, repisas…) y la seleccionada.
export const FLOOR_BOX_COLOR = "#8a6f5c";
export const RAISED_BOX_COLOR = "#5c7a8a";
export const SELECTED_BOX_COLOR = "#d39a3f";
/** Opacidad de las cajas (la seleccionada, un poco más opaca). */
export const BOX_OPACITY = 0.85;
export const SELECTED_BOX_OPACITY = 0.95;

// Suelo y paredes semitransparentes y sin techo, para que no tapen los objetos.
export const FLOOR_COLOR = "#d9d2c5";
export const FLOOR_OPACITY = 0.6;
export const WALL_COLOR = "#b8c4d0";
export const WALL_OPACITY = 0.18;

// Luces de la escena: ambiental, puntual neutra (el preset de la vista) y una direccional desde la cámara.
export const AMBIENT_LIGHT_INTENSITY = 0.5;
export const DIRECTIONAL_LIGHT_INTENSITY = 0.6;
export const DEFAULT_POINT_LIGHT = { position: { x: 0, y: 3, z: 0 }, intensity: 0.8, color: "#ffffff" };
