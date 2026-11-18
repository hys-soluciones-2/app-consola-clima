import { searchCities } from "../api/geocoding.ts";
import { askForIndex } from "../presentation/input.ts";
import { blank, fail, line, reportError, success } from "../presentation/output.ts";
import { addCity, findExistingCity } from "../storage/citiesStorage.ts";
import type { AppContext } from "../types/AppContext.ts";
import type { City } from "../types/City.ts";
import { formatCity } from "../utils/format.ts";

/** Busca ciudades por nombre y guarda la que elija el usuario. */
export async function runAddCity(ctx: AppContext): Promise<void> {
  const query = await ctx.prompter.ask("  Nombre de la ciudad: ");
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

  blank();
  results.forEach((city, index) => {
    line(`  ${index + 1}. ${formatCity(city)}`);
  });

  const answer = await askForIndex(
    ctx.prompter,
    "  Elige un número (Enter para cancelar): ",
    results.length,
  );
  if (answer.kind !== "selected") {
    if (answer.kind === "invalid") fail("Opción inválida.");
    return;
  }

  const chosen = results[answer.index];
  if (!chosen) {
    fail("Opción inválida.");
    return;
  }

  const existing = findExistingCity(ctx.config, chosen);
  if (existing) {
    fail(`${formatCity(existing)} ya está en tu lista.`);
    return;
  }

  const wasDefault = ctx.config.defaultCityId;
  ctx.config = addCity(ctx.config, chosen);
  await ctx.persist();
  success(`Agregada: ${formatCity(chosen)}`);
  if (wasDefault === null) success("Quedó como tu ciudad default.");
}
