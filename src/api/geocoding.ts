import type { City } from "../types/City.ts";
import { requestJson, WeatherError } from "./client.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

type GeocodingResult = {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
};

function buildCityId(result: GeocodingResult): string {
  if (typeof result.id === "number") return String(result.id);
  return `${result.name}-${result.latitude}-${result.longitude}`
    .toLocaleLowerCase()
    .replace(/\s+/g, "-");
}

/** Paso 1: convierte un nombre de ciudad en coordenadas. */
export async function searchCities(query: string, count: number = 5): Promise<City[]> {
  const name = query.trim();
  if (name.length === 0) throw new WeatherError("Escribe el nombre de una ciudad");

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", name);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const data = await requestJson<GeocodingResponse>(url);
  return (data.results ?? []).map((result) => ({
    id: buildCityId(result),
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    ...(result.admin1 ? { admin1: result.admin1 } : {}),
    ...(result.country ? { country: result.country } : {}),
  }));
}
