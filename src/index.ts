#!/usr/bin/env bun
import { stdout } from "node:process";
import { blank, fail, line, messageOf } from "./presentation/output.ts";
import { createPrompter } from "./presentation/input.ts";
import { runMenu } from "./presentation/menu.ts";
import { loadConfig, saveConfig } from "./storage/citiesStorage.ts";
import type { AppContext } from "./types/AppContext.ts";
import { paint } from "./utils/colors.ts";

const prompter = createPrompter(() => {
  blank();
  line("  ¡Hasta luego!");
  process.exit(130);
});

async function main(): Promise<void> {
  const loaded = await loadConfig();
  if (loaded.recovered) {
    fail("No se pudo leer la configuración anterior; se creó una nueva.");
  }

  const ctx: AppContext = {
    config: loaded.config,
    prompter,
    async persist() {
      try {
        await saveConfig(ctx.config);
      } catch (error) {
        fail(`No se pudo guardar la configuración: ${messageOf(error)}`);
      }
    },
  };

  await runMenu(ctx);
}

main()
  .catch((error: unknown) => {
    stdout.write(`\n${paint(`Error inesperado: ${messageOf(error)}`, "red")}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    prompter.close();
  });
