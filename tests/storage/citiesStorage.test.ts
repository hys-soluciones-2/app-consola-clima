import { describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  addCity,
  createDefaultConfig,
  findExistingCity,
  getDefaultCity,
  loadConfig,
  normalizeConfig,
  removeCity,
  saveConfig,
} from "../../src/storage/citiesStorage.ts";
import type { City } from "../../src/types/City.ts";
import type { Config } from "../../src/types/Config.ts";
import { withTempDir } from "../utils/testHelpers.ts";

const ottawa: City = { id: "1", name: "Ottawa", admin1: "Ontario", country: "Canadá", latitude: 45.41, longitude: -75.69 };
const lima: City = { id: "2", name: "Lima", country: "Perú", latitude: -12.04, longitude: -77.03 };

describe("createDefaultConfig", () => {
  it("crea una configuración inicial válida", () => {
    expect(createDefaultConfig()).toEqual({ version: 1, unit: "celsius", defaultCityId: null, cities: [] });
  });
});

describe("normalizeConfig", () => {
  it("devuelve default ante valores no objeto", () => {
    expect(normalizeConfig(null)).toEqual(createDefaultConfig());
    expect(normalizeConfig("x")).toEqual(createDefaultConfig());
    expect(normalizeConfig([])).toEqual(createDefaultConfig());
  });

  it("filtra ciudades inválidas, normaliza unidad y default", () => {
    const raw = {
      unit: "fahrenheit",
      defaultCityId: "missing",
      cities: [ottawa, { id: 2, name: "bad" }, lima],
    };
    expect(normalizeConfig(raw)).toEqual({
      version: 1,
      unit: "fahrenheit",
      defaultCityId: "1",
      cities: [ottawa, lima],
    });
  });

  it("conserva default válido y usa celsius por defecto", () => {
    expect(normalizeConfig({ unit: "kelvin", defaultCityId: "2", cities: [ottawa, lima] })).toMatchObject({
      unit: "celsius",
      defaultCityId: "2",
    });
  });

  it("deja default nulo cuando no hay ciudades", () => {
    expect(normalizeConfig({ defaultCityId: "x", cities: [] }).defaultCityId).toBeNull();
  });
});

describe("loadConfig / saveConfig", () => {
  it("devuelve default sin recovered si el archivo no existe", async () => {
    await withTempDir(async (dir) => {
      const result = await loadConfig(join(dir, "missing", "config.json"));
      expect(result).toEqual({ config: createDefaultConfig(), recovered: false });
    });
  });

  it("recupera de JSON corrupto", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "config.json");
      await mkdir(dir, { recursive: true });
      await Bun.write(path, "{nope");
      const result = await loadConfig(path);
      expect(result).toEqual({ config: createDefaultConfig(), recovered: true });
    });
  });

  it("carga y guarda configuración normalizada", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "nested", "config.json");
      const config: Config = { version: 1, unit: "fahrenheit", defaultCityId: "1", cities: [ottawa] };
      await saveConfig(config, path);
      const loaded = await loadConfig(path);
      expect(loaded).toEqual({ config, recovered: false });
      const text = await Bun.file(path).text();
      expect(text.endsWith("\n")).toBe(true);
      expect(JSON.parse(text)).toEqual(config);
    });
  });
});

describe("getDefaultCity / findExistingCity", () => {
  it("obtiene la ciudad default o undefined", () => {
    const config: Config = { version: 1, unit: "celsius", defaultCityId: "2", cities: [ottawa, lima] };
    expect(getDefaultCity(config)).toEqual(lima);
    expect(getDefaultCity({ ...config, defaultCityId: "x" })).toBeUndefined();
  });

  it("detecta duplicados por id o por nombre y coordenadas cercanas", () => {
    const config: Config = { version: 1, unit: "celsius", defaultCityId: "1", cities: [ottawa] };
    expect(findExistingCity(config, { ...ottawa, name: "Otra" })).toEqual(ottawa);
    expect(
      findExistingCity(config, { id: "x", name: "ottawa", latitude: 45.415, longitude: -75.695 }),
    ).toEqual(ottawa);
    expect(findExistingCity(config, lima)).toBeUndefined();
  });
});

describe("addCity / removeCity", () => {
  it("agrega ciudad nueva, asigna default si falta y evita duplicados", () => {
    const empty = createDefaultConfig();
    const withOttawa = addCity(empty, ottawa);
    expect(withOttawa.cities).toEqual([ottawa]);
    expect(withOttawa.defaultCityId).toBe("1");
    const withLima = addCity(withOttawa, lima);
    expect(withLima.defaultCityId).toBe("1");
    expect(addCity(withLima, { ...ottawa, id: "dup" })).toEqual(withLima);
  });

  it("elimina ciudad y reasigna o limpia default", () => {
    const config: Config = { version: 1, unit: "celsius", defaultCityId: "1", cities: [ottawa, lima] };
    const removedDefault = removeCity(config, "1");
    expect(removedDefault.cities).toEqual([lima]);
    expect(removedDefault.defaultCityId).toBe("2");
    expect(removeCity({ ...config, cities: [ottawa], defaultCityId: "1" }, "1").defaultCityId).toBeNull();
    const removedOther = removeCity(config, "2");
    expect(removedOther.defaultCityId).toBe("1");
  });
});
