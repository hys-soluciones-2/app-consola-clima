import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import type { Prompter } from "../types/Prompter.ts";

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

export type IndexAnswer =
  | { kind: "cancel" }
  | { kind: "invalid" }
  | { kind: "selected"; index: number };

/** Valida una selección numerada (base 1) y devuelve un índice base 0. */
export async function askForIndex(
  prompter: Prompter,
  question: string,
  count: number,
): Promise<IndexAnswer> {
  const answer = await prompter.ask(question);
  if (answer === null || answer.length === 0) return { kind: "cancel" };

  const index = Number(answer);
  if (!Number.isInteger(index) || index < 1 || index > count) return { kind: "invalid" };

  return { kind: "selected", index: index - 1 };
}
