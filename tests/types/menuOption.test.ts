import { describe, expect, it } from "bun:test";
import { isMenuOption } from "../../src/types/MenuOption.ts";

describe("isMenuOption", () => {
  it("acepta las opciones válidas del menú", () => {
    for (const key of ["1", "2", "3", "4", "5", "6", "8", "9"]) {
      expect(isMenuOption(key)).toBe(true);
    }
  });

  it("rechaza opciones inválidas o fuera de rango", () => {
    for (const key of ["0", "7", "10", "", "a", " 1", "1 "]) {
      expect(isMenuOption(key)).toBe(false);
    }
  });
});
