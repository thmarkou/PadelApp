import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "../../..");

export function loadPadelEnv(): void {
  const envFile = path.join(repoRoot, ".env.padelapp");
  if (!fs.existsSync(envFile)) {
    throw new Error(
      `Missing ${envFile}. Copy env.padelapp.example → .env.padelapp inside PadelApp only.`,
    );
  }
  dotenv.config({ path: envFile, override: true });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env.padelapp`);
  }
  return value;
}

export function apiConfig() {
  return {
    port: Number(process.env.PADELAPP_API_PORT ?? "3040"),
    host: process.env.PADELAPP_API_HOST ?? "0.0.0.0",
    databaseUrl: required("PADELAPP_DATABASE_URL"),
    seedPassword: process.env.PADELAPP_SEED_PASSWORD ?? "padel-dev",
  };
}
