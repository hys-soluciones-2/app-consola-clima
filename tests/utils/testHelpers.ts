import { mock } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stdout } from "node:process";
import type { Prompter } from "../../src/types/Prompter.ts";

export function createPrompterStub(answers: Array<string | null>): Prompter & { questions: string[] } {
  const queue = [...answers];
  const questions: string[] = [];
  return {
    questions,
    async ask(question: string): Promise<string | null> {
      questions.push(question);
      if (queue.length === 0) return null;
      return queue.shift() ?? null;
    },
    close: mock(() => {}),
  };
}

export function captureStdout(): { output: () => string; restore: () => void } {
  const realWrite = stdout.write.bind(stdout);
  let buffer = "";
  stdout.write = ((chunk: string | Uint8Array) => {
    buffer += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  }) as typeof stdout.write;
  return {
    output: () => buffer,
    restore: () => {
      stdout.write = realWrite;
    },
  };
}

export function withNoColor<T>(fn: () => T): T {
  const prevNo = process.env.NO_COLOR;
  const prevForce = process.env.FORCE_COLOR;
  delete process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  try {
    return fn();
  } finally {
    if (prevNo === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = prevNo;
    if (prevForce === undefined) delete process.env.FORCE_COLOR;
    else process.env.FORCE_COLOR = prevForce;
  }
}

export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "weather-cli-test-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
