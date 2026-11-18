import type { City } from "../types/City.ts";
import type { Unit } from "../types/Config.ts";
import type { CurrentWeather, ForecastDay, WeeklyForecast } from "../types/Weather.ts";
import { requestJson, WeatherError } from "./client.ts";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

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
