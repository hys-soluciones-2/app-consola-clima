import { WEATHER_CODES, WEEKDAYS } from "./constants.ts";
import { paint } from "./colors.ts";
import type { City } from "../types/City.ts";
import type { Unit } from "../types/Config.ts";
import type { CurrentWeather, WeeklyForecast } from "../types/Weather.ts";

export function describeWeather(code: number): string {
  return WEATHER_CODES[code] ?? "Condición desconocida";
}

export function formatUnitLabel(unit: Unit): string {
  return unit === "fahrenheit" ? "°F" : "°C";
}

export function formatNumber(value: number): string {
  const text = value.toFixed(1);
  return text === "-0.0" ? "0.0" : text;
}

export function formatCity(city: City): string {
  const parts = [city.name];
  if (city.admin1 && city.admin1 !== city.name) parts.push(city.admin1);
  if (city.country) parts.push(city.country);
  return parts.join(", ");
}

/** "2026-11-14T23:00" -> "14/11 23:00" */
export function formatObservedAt(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return "";
  const [, , month, day, hour, minute] = match;
  return `${day}/${month} ${hour}:${minute}`;
}

export function formatCurrentWeather(weather: CurrentWeather): string {
  const temperature = paint(
    `${formatNumber(weather.temperature)} ${weather.temperatureUnit}`,
    "yellow",
  );
  const feels = paint(
    `${formatNumber(weather.apparentTemperature)} ${weather.temperatureUnit}`,
    "yellow",
  );
  const details = [
    `Humedad ${Math.round(weather.humidity)}${weather.humidityUnit}`,
    `Viento ${formatNumber(weather.windSpeed)} ${weather.windUnit}`,
  ];
  const observed = formatObservedAt(weather.observedAt);
  if (observed) details.push(`Actualizado ${observed}`);

  return [
    `  ${temperature} (sensación ${feels}) · ${describeWeather(weather.weatherCode)}`,
    `  ${details.join(" · ")}`,
  ].join("\n");
}

/** "2026-11-18" -> "mié 18/11" (se parsea como fecha local para no correr el día). */
export function formatForecastDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  if (!year || !month || !day) return iso;

  const weekday = WEEKDAYS[new Date(Number(year), Number(month) - 1, Number(day)).getDay()];
  return `${weekday ? `${weekday} ` : ""}${day}/${month}`;
}

export function formatDailyForecast(forecast: WeeklyForecast): string {
  if (forecast.days.length === 0) {
    return `  ${paint("No hay pronóstico disponible.", "red")}`;
  }

  const lines = forecast.days.map((day) => {
    const temperature = `${formatNumber(day.maxTemperature)} / ${formatNumber(day.minTemperature)} ${forecast.temperatureUnit}`;
    const details = [describeWeather(day.weatherCode)];
    if (day.precipitationProbability !== null) {
      details.push(
        `lluvia ${Math.round(day.precipitationProbability)}${forecast.precipitationUnit}`,
      );
    }
    return `  ${formatForecastDate(day.date).padEnd(10)}${paint(temperature.padEnd(18), "yellow")}${details.join(" · ")}`;
  });

  return [`  ${paint("Pronóstico 7 días", "cyan")}`, ...lines].join("\n");
}

export function formatCityList(cities: City[], defaultCityId: string | null): string {
  return cities
    .map((city, index) => {
      const suffix = city.id === defaultCityId ? "  (default)" : "";
      return `  ${index + 1}. ${formatCity(city)}${suffix}`;
    })
    .join("\n");
}
