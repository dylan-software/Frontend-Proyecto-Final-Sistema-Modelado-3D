import type { ReactNode } from "react";

/**
 * Iconos SVG de la app (sistema «Plano de obra»): rejilla de 20 × 20, trazo de 1,5, puntas y uniones
 * redondeadas y color `currentColor`, así que toman el color del texto que los rodea. Son decorativos
 * (`aria-hidden`): el botón o el enlace que los lleva tiene su propio texto o `aria-label`.
 */
interface IconProps {
  /** Lado en píxeles; por defecto 20 (la rejilla). */
  size?: number;
  className?: string;
}

function Icon({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </Icon>
  );
}

/** Tres puntos: "Más acciones" de una tarjeta. */
export function IconMore(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="4.5" cy="10" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10" r="1.25" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconArrowUp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 16V4M5 9l5-5 5 5" />
    </Icon>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4v12M5 11l5 5 5-5" />
    </Icon>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 10H4M9 5l-5 5 5 5" />
    </Icon>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10h12M11 5l5 5-5 5" />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 7.75 10 12.25l4.5-4.5" />
    </Icon>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.25 5.5 7.75 10l4.5 4.5" />
    </Icon>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.75 5.5 12.25 10l-4.5 4.5" />
    </Icon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="9" r="5.25" />
      <path d="m13 13 3.5 3.5" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4.5v11M4.5 10h11" />
    </Icon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </Icon>
  );
}

/** Proyectos: la planta de una sala en L. */
export function IconProjects(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3h14v8h-6v6H3z" />
      <path d="M3 9h5M8 3v3" />
    </Icon>
  );
}

/** Red Social: tres nodos conectados. */
export function IconSocial(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="10" r="2.25" />
      <circle cx="15" cy="4.5" r="2.25" />
      <circle cx="15" cy="15.5" r="2.25" />
      <path d="m7 9 6-3.4M7 11l6 3.4" />
    </Icon>
  );
}

/** Asistente de IA: un bocadillo con tres puntos. */
export function IconAssistant(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9.25L5.5 16.5v-3a2 2 0 0 1-2-2z" />
      <circle cx="7.25" cy="8.5" r="0.4" strokeWidth={1.6} />
      <circle cx="10" cy="8.5" r="0.4" strokeWidth={1.6} />
      <circle cx="12.75" cy="8.5" r="0.4" strokeWidth={1.6} />
    </Icon>
  );
}

export function IconEye({ off = false, ...props }: IconProps & { off?: boolean }) {
  return (
    <Icon {...props}>
      <path d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10z" />
      <circle cx="10" cy="10" r="2.5" />
      {off && <path d="M3.5 3.5l13 13" />}
    </Icon>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h3M13 13.5l3.5-3.5L13 6.5M16.5 10H8" />
    </Icon>
  );
}

/** Ocupación: dos barras de medidor. */
export function IconMeter(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="14" height="3" rx="1.5" />
      <rect x="3" y="12" width="14" height="3" rx="1.5" />
      <path d="M4.5 6.5h6M4.5 13.5h3" />
    </Icon>
  );
}

/** Tema: un círculo mitad claro, mitad oscuro. */
export function IconTheme(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5a6.5 6.5 0 0 0 0 13z" fill="currentColor" />
    </Icon>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m13.25 3.75 3 3-8.75 8.75-3.75.75.75-3.75z" />
    </Icon>
  );
}

export function IconMicrophone(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="7.5" y="2.75" width="5" height="9" rx="2.5" />
      <path d="M4.75 9.5a5.25 5.25 0 0 0 10.5 0M10 14.75v2.5M7.25 17.25h5.5" />
    </Icon>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h2l1.25-1.75h4.5L13.5 5h2A1.5 1.5 0 0 1 17 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" />
      <circle cx="10" cy="10.25" r="3" />
    </Icon>
  );
}

export function IconUndo(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 5 4 8.5 7.5 12M4.5 8.5h7a4 4 0 0 1 0 8H9" />
    </Icon>
  );
}

/** Exportar: flecha hacia la bandeja. */
export function IconDownload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3.5v9M6 9l4 4 4-4M4 16.5h12" />
    </Icon>
  );
}

/** Importar: flecha que sale de la bandeja. */
export function IconUpload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 13V4M6 7.5l4-4 4 4M4 16.5h12" />
    </Icon>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="7" y="7" width="9.5" height="9.5" rx="1.5" />
      <path d="M13 7V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v6.5A1.5 1.5 0 0 0 5 13h2" />
    </Icon>
  );
}

/** Publicar: compartir hacia fuera de la caja. */
export function IconShare(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 12.5V3.5M6.5 7 10 3.5 13.5 7M5 10.5v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5" />
    </Icon>
  );
}

/** Nuevo grupo: una carpeta con un signo más. */
export function IconFolderPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 14.5v-9A1.5 1.5 0 0 1 4.5 4h3l1.5 2h6.5A1.5 1.5 0 0 1 17 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" />
      <path d="M10 8.75v4.5M7.75 11h4.5" />
    </Icon>
  );
}
