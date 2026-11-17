import type { City, Unit } from "./config.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 10_000;

/** Error previsto (red, HTTP, datos faltantes) que se muestra al usuario. */
export class WeatherError extends Error {
  override name = "WeatherError";
}

export type CurrentWeather = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  temperatureUnit: string;
  windUnit: string;
  humidityUnit: string;
  observedAt: string;
};

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

type ForecastResponse = {
  current_units?: Record<string, string>;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function requestJson<T>(url: URL): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw new WeatherError(`No se pudo conectar con Open-Meteo: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    throw new WeatherError(`Open-Meteo respondió ${response.status} ${response.statusText}`.trim());
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new WeatherError("La respuesta de Open-Meteo no es un JSON válido");
  }
}

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

/** Paso 2: clima actual en las coordenadas de la ciudad. */
export async function fetchCurrentWeather(city: City, unit: Unit): Promise<CurrentWeather> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
  );
  url.searchParams.set("timezone", "auto");
  if (unit === "fahrenheit") {
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
  }

  const data = await requestJson<ForecastResponse>(url);
  const current = data.current;
  if (!current || typeof current.temperature_2m !== "number") {
    throw new WeatherError("Open-Meteo no devolvió la temperatura actual");
  }

  const units = data.current_units ?? {};
  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature ?? current.temperature_2m,
    humidity: current.relative_humidity_2m ?? 0,
    weatherCode: current.weather_code ?? 0,
    windSpeed: current.wind_speed_10m ?? 0,
    temperatureUnit: units.temperature_2m ?? (unit === "fahrenheit" ? "°F" : "°C"),
    windUnit: units.wind_speed_10m ?? (unit === "fahrenheit" ? "mp/h" : "km/h"),
    humidityUnit: units.relative_humidity_2m ?? "%",
    observedAt: current.time ?? "",
  };
}
