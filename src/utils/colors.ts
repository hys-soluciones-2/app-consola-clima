import { stdout } from "node:process";

const ANSI = {
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
} as const;

export type Color = Exclude<keyof typeof ANSI, "reset">;

/** Colores solo en terminal interactiva, salvo override explícito. */
export function colorsEnabled(): boolean {
  const force = process.env.FORCE_COLOR;
  if (force === "0") return false;
  if (force !== undefined) return true;
  if (process.env.NO_COLOR) return false;
  if (process.env.TERM === "dumb") return false;
  return stdout.isTTY === true;
}

/** Sin color, devuelve el texto tal cual (salida por pipe/limpia). */
export function paint(text: string, color: Color): string {
  if (!colorsEnabled()) return text;
  return `${ANSI[color]}${text}${ANSI.reset}`;
}
