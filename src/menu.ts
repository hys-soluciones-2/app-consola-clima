import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import type { Config } from "./config.ts";
import { formatUnitLabel } from "./format.ts";

const WIDTH = 40;
const LINE = "═".repeat(WIDTH);

function center(text: string): string {
  const padding = Math.max(0, Math.floor((WIDTH - text.length) / 2));
  return `${" ".repeat(padding)}${text}`;
}

export function renderMenu(config: Config): string {
  return [
    LINE,
    center("WEATHER CLI"),
    LINE,
    "  1. Clima de ciudad default",
    `  2. Clima de todas las ciudades (${config.cities.length})`,
    "  3. Buscar y agregar ciudad",
    "  4. Eliminar ciudad",
    "  5. Establecer ciudad default",
    `  8. Ajustes (${formatUnitLabel(config.unit)})`,
    "  9. Salir",
    LINE,
  ].join("\n");
}

export type Prompter = {
  /** Devuelve null cuando la entrada se cerró (Ctrl+D o pipe agotado). */
  ask(question: string): Promise<string | null>;
  close(): void;
};

export function createPrompter(onInterrupt: () => void): Prompter {
  const rl = createInterface({ input: stdin, output: stdout });
  let lines: AsyncIterator<string> | undefined;

  rl.on("SIGINT", () => {
    onInterrupt();
    rl.close();
  });

  return {
    async ask(question) {
      if (stdin.isTTY) {
        try {
          return (await rl.question(question)).trim();
        } catch {
          return null;
        }
      }

      // Entrada por pipe/redirección: question() descarta las líneas ya
      // bufferizadas cuando llega el EOF, así que usamos el iterador.
      lines ??= rl[Symbol.asyncIterator]();
      stdout.write(question);
      const next = await lines.next();
      if (next.done) return null;
      return next.value.trim();
    },
    close() {
      rl.close();
    },
  };
}
