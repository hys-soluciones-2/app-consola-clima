import type { Prompter } from "./Prompter.ts";
import type { Config } from "./Config.ts";

/** Estado compartido: el menú y las acciones leen y reemplazan `config` aquí. */
export type AppContext = {
  config: Config;
  prompter: Prompter;
  persist(): Promise<void>;
};
