/** Contrato de entrada de usuario, compartido por presentación y acciones. */
export type Prompter = {
  /** Devuelve null cuando la entrada se cerró (Ctrl+D o pipe agotado). */
  ask(question: string): Promise<string | null>;
  close(): void;
};
