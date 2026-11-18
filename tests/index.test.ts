import { describe, expect, it } from "bun:test";
import { spawn } from "bun";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function runCli(input: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const home = await mkdtemp(join(tmpdir(), "weather-cli-home-"));
  try {
    const proc = spawn({
      cmd: ["bun", "run", "src/index.ts"],
      cwd: process.cwd(),
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        NO_COLOR: "1",
        FORCE_COLOR: "0",
      },
    });

    proc.stdin.write(input);
    proc.stdin.end();

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    return { exitCode, stdout, stderr };
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

describe("CLI (integración)", () => {
  it("muestra el menú y permite salir con la opción 9", async () => {
    const result = await runCli("9\n");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("WEATHER CLI");
    expect(result.stdout).toContain("  9. Salir");
    expect(result.stdout).toContain("Selecciona una opci");
  });

  it("maneja opciones sin ciudades y cierra con entrada EOF", async () => {
    const result = await runCli("1\n2\n");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No hay ciudad default");
    expect(result.stdout).toContain("Todav"); // tolera variaciones de encoding en salida redirigida
  });
});
