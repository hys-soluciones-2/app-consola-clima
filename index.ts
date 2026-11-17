#!/usr/bin/env bun
import { stdout } from "node:process";
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
import { formatCity, formatCityList, formatCurrentWeather, formatUnitLabel } from "./src/format.ts";
import { createPrompter, renderMenu } from "./src/menu.ts";
import { fetchCurrentWeather, searchCities, WeatherError } from "./src/openmeteo.ts";

let config: Config;

const prompter = createPrompter(() => {
  stdout.write("\n  ¡Hasta luego!\n");
  process.exit(130);
});

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function persist(): Promise<void> {
  try {
    await saveConfig(config);
  } catch (error) {
    stdout.write(`  No se pudo guardar la configuración: ${messageOf(error)}\n`);
  }
}

function reportError(error: unknown): void {
  if (error instanceof WeatherError) {
    stdout.write(`  ${error.message}\n`);
  } else {
    stdout.write(`  Error inesperado: ${messageOf(error)}\n`);
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

async function showDefaultCityWeather(): Promise<void> {
  const city = getDefaultCity(config);
  if (!city) {
    stdout.write("  No hay ciudad default. Agrega una con la opción 3.\n");
    return;
  }
  await showWeather(city);
}

async function showAllCitiesWeather(): Promise<void> {
  if (config.cities.length === 0) {
    stdout.write("  Todavía no tienes ciudades guardadas. Usa la opción 3.\n");
    return;
  }
  for (const city of config.cities) {
    await showWeather(city);
  }
}

async function addCityFlow(): Promise<void> {
  const query = await prompter.ask("  Nombre de la ciudad: ");
  if (query === null) return;
  if (query.length === 0) {
    stdout.write("  No escribiste ningún nombre.\n");
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
    stdout.write(`  No se encontró ninguna ciudad llamada "${query}".\n`);
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
    stdout.write("  Opción inválida.\n");
    return;
  }

  const chosen = results[index - 1];
  if (!chosen) {
    stdout.write("  Opción inválida.\n");
    return;
  }

  const existing = findExistingCity(config, chosen);
  if (existing) {
    stdout.write(`  ${formatCity(existing)} ya está en tu lista.\n`);
    return;
  }

  const wasDefault = config.defaultCityId;
  config = addCity(config, chosen);
  await persist();
  stdout.write(`  Agregada: ${formatCity(chosen)}\n`);
  if (wasDefault === null) stdout.write("  Quedó como tu ciudad default.\n");
}

async function removeCityFlow(): Promise<void> {
  if (config.cities.length === 0) {
    stdout.write("  Todavía no tienes ciudades guardadas.\n");
    return;
  }

  stdout.write(`\n${formatCityList(config.cities, config.defaultCityId)}\n`);
  const pick = await prompter.ask("  Número de la ciudad a eliminar (Enter para cancelar): ");
  if (pick === null || pick.length === 0) return;

  const index = Number(pick);
  if (!Number.isInteger(index) || index < 1 || index > config.cities.length) {
    stdout.write("  Opción inválida.\n");
    return;
  }

  const target = config.cities[index - 1];
  if (!target) {
    stdout.write("  Opción inválida.\n");
    return;
  }

  config = removeCity(config, target.id);
  await persist();
  stdout.write(`  Eliminada: ${formatCity(target)}\n`);
  if (config.defaultCityId === null) {
    stdout.write("  Ya no tienes ciudad default.\n");
  }
}

async function setDefaultCityFlow(): Promise<void> {
  if (config.cities.length === 0) {
    stdout.write("  Todavía no tienes ciudades guardadas.\n");
    return;
  }

  stdout.write(`\n${formatCityList(config.cities, config.defaultCityId)}\n`);
  const pick = await prompter.ask("  Número de la nueva ciudad default (Enter para cancelar): ");
  if (pick === null || pick.length === 0) return;

  const index = Number(pick);
  if (!Number.isInteger(index) || index < 1 || index > config.cities.length) {
    stdout.write("  Opción inválida.\n");
    return;
  }

  const target = config.cities[index - 1];
  if (!target) {
    stdout.write("  Opción inválida.\n");
    return;
  }

  config = setDefaultCity(config, target.id);
  await persist();
  stdout.write(`  Ciudad default: ${formatCity(target)}\n`);
}

async function toggleUnitFlow(): Promise<void> {
  config = toggleUnit(config);
  await persist();
  stdout.write(`  Unidad establecida en ${formatUnitLabel(config.unit)}.\n`);
}

async function main(): Promise<void> {
  const loaded = await loadConfig();
  config = loaded.config;
  if (loaded.recovered) {
    stdout.write("  No se pudo leer la configuración anterior; se creó una nueva.\n");
  }

  for (;;) {
    stdout.write(`\n${renderMenu(config)}\n`);
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
      case "8":
        await toggleUnitFlow();
        break;
      default:
        stdout.write("  Opción no válida.\n");
    }
  }
}

main()
  .catch((error: unknown) => {
    stdout.write(`\nError inesperado: ${messageOf(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    prompter.close();
  });
