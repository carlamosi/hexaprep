import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src")  // vitest se ejecuta desde frontend/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe("textos de la interfaz", () => {
  it("no_em_dashes_in_ui_strings: ningún guion largo en src", () => {
    const bad = files(SRC).filter((f) => /[—–]/.test(readFileSync(f, "utf-8")));
    expect(bad).toEqual([]);
  });

  it("«Monté» siempre lleva acento", () => {
    const bad = files(SRC).filter((f) => /\bMonte\b/.test(readFileSync(f, "utf-8")));
    expect(bad).toEqual([]);
  });
});
