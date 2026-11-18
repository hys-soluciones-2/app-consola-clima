import type { City } from "./City.ts";

export type Unit = "celsius" | "fahrenheit";

export type Config = {
  version: 1;
  unit: Unit;
  defaultCityId: string | null;
  cities: City[];
};

export type LoadResult = {
  config: Config;
  /** true si el archivo existía pero no se pudo interpretar */
  recovered: boolean;
};
