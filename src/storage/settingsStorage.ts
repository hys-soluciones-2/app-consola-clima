import type { Config } from "../types/Config.ts";

/** Helper puro: cambia la preferencia sin tocar el disco. */
export function setDefaultCity(config: Config, id: string): Config {
  if (!config.cities.some((city) => city.id === id)) return config;
  return { ...config, defaultCityId: id };
}

/** Helper puro: invierte la unidad sin tocar el disco. */
export function toggleUnit(config: Config): Config {
  return { ...config, unit: config.unit === "celsius" ? "fahrenheit" : "celsius" };
}
