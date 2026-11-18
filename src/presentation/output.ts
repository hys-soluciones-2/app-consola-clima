import { stdout } from "node:process";
import { WeatherError } from "../api/client.ts";
import { paint } from "../utils/colors.ts";

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function blank(): void {
  stdout.write("\n");
}

export function line(text: string = ""): void {
  stdout.write(`${text}\n`);
}

export function success(message: string): void {
  line(`  ${paint(message, "green")}`);
}

export function fail(message: string): void {
  line(`  ${paint(message, "red")}`);
}

export function reportError(error: unknown): void {
  if (error instanceof WeatherError) {
    fail(error.message);
  } else {
    fail(`Error inesperado: ${messageOf(error)}`);
  }
}
