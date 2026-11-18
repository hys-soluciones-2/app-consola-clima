import { describe, expect, it } from "bun:test";
import { setDefaultCity, toggleUnit } from "../../src/storage/settingsStorage.ts";
import type { Config } from "../../src/types/Config.ts";

const base: Config = {
  version: 1,
  unit: "celsius",
  defaultCityId: "1",
  cities: [
    { id: "1", name: "Ottawa", latitude: 1, longitude: 2 },
    { id: "2", name: "Lima", latitude: 3, longitude: 4 },
  ],
};

describe("setDefaultCity", () => {
  it("cambia la ciudad default cuando el id existe", () => {
    expect(setDefaultCity(base, "2").defaultCityId).toBe("2");
  });

  it("no modifica la configuración si el id no existe", () => {
    expect(setDefaultCity(base, "missing")).toEqual(base);
  });
});

describe("toggleUnit", () => {
  it("alterna entre celsius y fahrenheit sin mutar el original", () => {
    const toggled = toggleUnit(base);
    expect(toggled.unit).toBe("fahrenheit");
    expect(toggleUnit(toggled).unit).toBe("celsius");
    expect(base.unit).toBe("celsius");
  });
});
