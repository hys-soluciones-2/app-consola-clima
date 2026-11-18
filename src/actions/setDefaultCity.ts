import { askForIndex } from "../presentation/input.ts";
import { fail, success } from "../presentation/output.ts";
import { setDefaultCity } from "../storage/settingsStorage.ts";
import type { AppContext } from "../types/AppContext.ts";
import { formatCity } from "../utils/format.ts";
import { runListCities } from "./listCities.ts";

/** Marca una de las ciudades guardadas como predeterminada. */
export async function runSetDefaultCity(ctx: AppContext): Promise<void> {
  if (ctx.config.cities.length === 0) {
    fail("Todavía no tienes ciudades guardadas.");
    return;
  }

  runListCities(ctx);
  const answer = await askForIndex(
    ctx.prompter,
    "  Número de la nueva ciudad default (Enter para cancelar): ",
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

  ctx.config = setDefaultCity(ctx.config, target.id);
  await ctx.persist();
  success(`Ciudad default: ${formatCity(target)}`);
}
