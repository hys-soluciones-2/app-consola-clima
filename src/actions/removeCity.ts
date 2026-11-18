import { askForIndex } from "../presentation/input.ts";
import { fail, success } from "../presentation/output.ts";
import { removeCity } from "../storage/citiesStorage.ts";
import type { AppContext } from "../types/AppContext.ts";
import { formatCity } from "../utils/format.ts";
import { runListCities } from "./listCities.ts";

/** Quita una ciudad guardada y reasigna la default si hacía falta. */
export async function runRemoveCity(ctx: AppContext): Promise<void> {
  if (ctx.config.cities.length === 0) {
    fail("Todavía no tienes ciudades guardadas.");
    return;
  }

  runListCities(ctx);
  const answer = await askForIndex(
    ctx.prompter,
    "  Número de la ciudad a eliminar (Enter para cancelar): ",
    ctx.config.cities.length,
  );
  if (answer.kind !== "selected") {
    if (answer.kind === "invalid") fail("Opción inválida.");
    return;
  }

  const target = ctx.config.cities[answer.index];
  if (!target) {
    fail("Opción inválida.");
    return;
  }

  ctx.config = removeCity(ctx.config, target.id);
  await ctx.persist();
  success(`Eliminada: ${formatCity(target)}`);
  if (ctx.config.defaultCityId === null) {
    success("Ya no tienes ciudad default.");
  }
}
