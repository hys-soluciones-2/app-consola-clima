#!/usr/bin/env bun
import { stdout } from "node:process";
import { paint } from "./src/color.ts";
import {
  addCity,
  findExistingCity,
  getDefaultCity,
  loadConfig,
  removeCity,
  saveConfig,
  setDefaultCity,
  toggleUnit,
} from "./src/config.ts";
import type { City, Config } from "./src/config.ts";
import {
  formatCity,
  formatCityList,
  formatCurrentWeather,
  formatDailyForecast,
  formatUnitLabel,
} from "./src/format.ts";
import { createPrompter, renderMenu } from "./src/menu.ts";
import {
  fetchCurrentWeather,
  fetchWeeklyForecast,
  searchCities,
  WeatherError,
} from "./src/openmeteo.ts";

let config: Config;

const prompter = createPrompter(() => {
  stdout.write("\n  ¡Hasta luego!\n");
  process.exit(130);
});

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function success(message: string): void {
  stdout.write(`  ${paint(message, "green")}\n`);
}

function fail(message: string): void {
  stdout.write(`  ${paint(message, "red")}\n`);
}

async function persist(): Promise<void> {
  try {
    await saveConfig(config);
  } catch (error) {
    fail(`No se pudo guardar la configuración: ${messageOf(error)}`);
  }
}

function reportError(error: unknown): void {
  if (error instanceof WeatherError) {
    fail(error.message);
  } else {
    fail(`Error inesperado: ${messageOf(error)}`);
  }
}

async function showWeather(city: City): Promise<void> {
  stdout.write(`\n${formatCity(city)}\n`);
  try {
    const weather = await fetchCurrentWeather(city, config.unit);
    stdout.write(`${formatCurrentWeather(weather)}\n`);
  } catch (error) {
    reportError(error);
  }
}

async function showForecast(city: City): Promise<void> {
  stdout.write(`\n${formatCity(city)}\n`);
  try {
    const forecast = await fetchWeeklyForecast(city, config.unit);
    stdout.write(`${formatDailyForecast(forecast)}\n`);
  } catch (error) {
    reportError(error);
  }
}

async function showDefaultCityWeather(): Promise<void> {
  const city = getDefaultCity(config);
  if (!city) {
    fail("No hay ciudad default. Agrega una con la opción 3.");
    return;
  }
  await showWeather(city);
}

async function showAllCitiesWeather(): Promise<void> {
  if (config.cities.length === 0) {
    fail("Todavía no tienes ciudades guardadas. Usa la opción 3.");
    return;
  }
  for (const city of config.cities) {
    await showWeather(city);
  }
}

async function showAllForecasts(): Promise<void> {
  if (config.cities.length === 0) {
    fail("Todavía no tienes ciudades guardadas. Usa la opción 3.");
    return;
  }
  for (const city of config.cities) {
    await showForecast(city);
  }
}

async function addCityFlow(): Promise<void> {
  const query = await prompter.ask("  Nombre de la ciudad: ");
  if (query === null) return;
  if (query.length === 0) {
    fail("No escribiste ningún nombre.");
    return;
  }

  let results: City[];
  try {
    results = await searchCities(query);
  } catch (error) {
    reportError(error);
    return;
  }

  if (results.length === 0) {
    fail(`No se encontró ninguna ciudad llamada "${query}".`);
    return;
  }

  stdout.write("\n");
  results.forEach((city, index) => {
    stdout.write(`  ${index + 1}. ${formatCity(city)}\n`);
  });

  const pick = await prompter.ask("  Elige un número (Enter para cancelar): ");
  if (pick === null || pick.length === 0) return;

  const index = Number(pick);
  if (!Number.isInteger(index) || index < 1 || index > results.length) {
    fail("Opción inválida.");
    return;
  }

  const chosen = results[index - 1];
  if (!chosen) {
    fail("Opción inválida.");
    return;
  }

  const existing = findExistingCity(config, chosen);
  if (existing) {
    fail(`${formatCity(existing)} ya está en tu lista.`);
    return;
  }

  const wasDefault = config.defaultCityId;
  config = addCity(config, chosen);
  await persist();
  success(`Agregada: ${formatCity(chosen)}`);
  if (wasDefault === null) success("Quedó como tu ciudad default.");
}

async function removeCityFlow(): Promise<void> {
  if (config.cities.length === 0) {
    fail("Todavía no tienes ciudades guardadas.");
    return;
  }

  stdout.write(`\n${formatCityList(config.cities, config.defaultCityId)}\n`);
  const pick = await prompter.ask("  Número de la ciudad a eliminar (Enter para cancelar): ");
  if (pick === null || pick.length === 0) return;

  const index = Number(pick);
  if (!Number.isInteger(index) || index < 1 || index > config.cities.length) {
    fail("Opción inválida.");
    return;
  }

  const target = config.cities[index - 1];
  if (!target) {
    fail("Opción inválida.");
    return;
  }

  config = removeCity(config, target.id);
  await persist();
  success(`Eliminada: ${formatCity(target)}`);
  if (config.defaultCityId === null) {
    success("Ya no tienes ciudad default.");
  }
}

async function setDefaultCityFlow(): Promise<void> {
  if (config.cities.length === 0) {
    fail("Todavía no tienes ciudades guardadas.");
    return;
  }

  stdout.write(`\n${formatCityList(config.cities, config.defaultCityId)}\n`);
  const pick = await prompter.ask("  Número de la nueva ciudad default (Enter para cancelar): ");
  if (pick === null || pick.length === 0) return;

  const index = Number(pick);
  if (!Number.isInteger(index) || index < 1 || index > config.cities.length) {
    fail("Opción inválida.");
    return;
  }

  const target = config.cities[index - 1];
  if (!target) {
    fail("Opción inválida.");
    return;
  }

  config = setDefaultCity(config, target.id);
  await persist();
  success(`Ciudad default: ${formatCity(target)}`);
}

async function toggleUnitFlow(): Promise<void> {
  config = toggleUnit(config);
  await persist();
  success(`Unidad establecida en ${formatUnitLabel(config.unit)}.`);
}

async function main(): Promise<void> {
  const loaded = await loadConfig();
  config = loaded.config;
  if (loaded.recovered) {
    fail("No se pudo leer la configuración anterior; se creó una nueva.");
  }

  for (;;) {
    stdout.write(`\n${paint(renderMenu(config), "cyan")}\n`);
    const choice = await prompter.ask("  Selecciona una opción: ");

    if (choice === null) break;
    if (choice.length === 0) continue;

    if (choice === "9") {
      stdout.write("  ¡Hasta luego!\n");
      break;
    }

    switch (choice) {
      case "1":
        await showDefaultCityWeather();
        break;
      case "2":
        await showAllCitiesWeather();
        break;
      case "3":
        await addCityFlow();
        break;
      case "4":
        await removeCityFlow();
        break;
      case "5":
        await setDefaultCityFlow();
        break;
      case "6":
        await showAllForecasts();
        break;
      case "8":
        await toggleUnitFlow();
        break;
      default:
        fail("Opción no válida.");
    }
  }
}

main()
  .catch((error: unknown) => {
    stdout.write(`\n${paint(`Error inesperado: ${messageOf(error)}`, "red")}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    prompter.close();
  });
