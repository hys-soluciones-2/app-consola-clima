import { describe, expect, it } from "bun:test";
import { askForIndex } from "../../src/presentation/input.ts";
import { createPrompterStub } from "../utils/testHelpers.ts";

describe("askForIndex", () => {
  it("devuelve cancel al recibir null o cadena vacía", async () => {
    const p1 = createPrompterStub([null]);
    expect(await askForIndex(p1, "?", 3)).toEqual({ kind: "cancel" });
    const p2 = createPrompterStub([""]);
    expect(await askForIndex(p2, "?", 3)).toEqual({ kind: "cancel" });
  });

  it("devuelve invalid para valores fuera de rango o no enteros", async () => {
    for (const answer of ["0", "4", "-1", "1.5", "abc", "1 2"]) {
      const prompter = createPrompterStub([answer]);
      expect(await askForIndex(prompter, "?", 3)).toEqual({ kind: "invalid" });
    }
  });

  it("devuelve el índice base 0 para selecciones válidas", async () => {
    const prompter = createPrompterStub(["1", "3"]);
    expect(await askForIndex(prompter, "elige: ", 3)).toEqual({ kind: "selected", index: 0 });
    expect(await askForIndex(prompter, "elige: ", 3)).toEqual({ kind: "selected", index: 2 });
    expect(prompter.questions).toEqual(["elige: ", "elige: "]);
  });
});
