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

export type ForecastDay = {
  date: string;
  maxTemperature: number;
  minTemperature: number;
  weatherCode: number;
  precipitationProbability: number | null;
};

export type WeeklyForecast = {
  days: ForecastDay[];
  temperatureUnit: string;
  precipitationUnit: string;
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

type DailyForecastResponse = {
  daily_units?: Record<string, string>;
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
    precipitation_probability_max?: number[];
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

/** Paso 2 (variante): pronóstico diario para los próximos 7 días. */
export async function fetchWeeklyForecast(city: City, unit: Unit): Promise<WeeklyForecast> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
  );
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");
  if (unit === "fahrenheit") {
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
  }

  const data = await requestJson<DailyForecastResponse>(url);
  const daily = data.daily;
  if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) {
    throw new WeatherError("Open-Meteo no devolvió el pronóstico diario");
  }

  const days: ForecastDay[] = [];
  for (const [index, date] of daily.time.slice(0, 7).entries()) {
    const maxTemperature = daily.temperature_2m_max?.[index];
    const minTemperature = daily.temperature_2m_min?.[index];
    if (typeof maxTemperature !== "number" || typeof minTemperature !== "number") continue;

    days.push({
      date,
      maxTemperature,
      minTemperature,
      weatherCode: daily.weather_code?.[index] ?? 0,
      precipitationProbability: daily.precipitation_probability_max?.[index] ?? null,
    });
  }

  if (days.length === 0) {
    throw new WeatherError("Open-Meteo no devolvió temperaturas para el pronóstico");
  }

  const units = data.daily_units ?? {};
  return {
    days,
    temperatureUnit: units.temperature_2m_max ?? (unit === "fahrenheit" ? "°F" : "°C"),
    precipitationUnit: units.precipitation_probability_max ?? "%",
  };
}
