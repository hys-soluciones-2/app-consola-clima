import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { City } from "../types/City.ts";
import type { Config, LoadResult } from "../types/Config.ts";
import { CONFIG_PATH } from "../utils/constants.ts";

export function createDefaultConfig(): Config {
  return { version: 1, unit: "celsius", defaultCityId: null, cities: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCity(value: unknown): value is City {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    (value.admin1 === undefined || typeof value.admin1 === "string") &&
    (value.country === undefined || typeof value.country === "string")
  );
}

/** Acepta JSON arbitrario y devuelve una configuración válida. */
export function normalizeConfig(raw: unknown): Config {
  if (!isRecord(raw)) return createDefaultConfig();

  const cities = Array.isArray(raw.cities) ? raw.cities.filter(isCity) : [];
  const unit = raw.unit === "fahrenheit" ? "fahrenheit" : "celsius";
  const requested = typeof raw.defaultCityId === "string" ? raw.defaultCityId : null;
  const defaultCityId =
    requested !== null && cities.some((city) => city.id === requested)
      ? requested
      : (cities[0]?.id ?? null);

  return { version: 1, unit, defaultCityId, cities };
}

export async function loadConfig(path: string = CONFIG_PATH): Promise<LoadResult> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch {
    return { config: createDefaultConfig(), recovered: false };
  }

  try {
    return { config: normalizeConfig(JSON.parse(contents)), recovered: false };
  } catch {
    return { config: createDefaultConfig(), recovered: true };
  }
}

export async function saveConfig(config: Config, path: string = CONFIG_PATH): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function getDefaultCity(config: Config): City | undefined {
  return config.cities.find((city) => city.id === config.defaultCityId);
}

/** Misma ciudad si comparte id, o mismo nombre en coordenadas casi idénticas. */
export function findExistingCity(config: Config, city: City): City | undefined {
  const name = city.name.toLocaleLowerCase();
  return config.cities.find(
    (saved) =>
      saved.id === city.id ||
      (saved.name.toLocaleLowerCase() === name &&
        Math.abs(saved.latitude - city.latitude) < 0.01 &&
        Math.abs(saved.longitude - city.longitude) < 0.01),
  );
}

export function addCity(config: Config, city: City): Config {
  if (findExistingCity(config, city)) return config;
  return {
    ...config,
    cities: [...config.cities, city],
    defaultCityId: config.defaultCityId ?? city.id,
  };
}

export function removeCity(config: Config, id: string): Config {
  const cities = config.cities.filter((city) => city.id !== id);
  const defaultCityId =
    config.defaultCityId === id ? (cities[0]?.id ?? null) : config.defaultCityId;
  return { ...config, cities, defaultCityId };
}
