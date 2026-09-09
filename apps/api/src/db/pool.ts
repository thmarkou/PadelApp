import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { apiConfig, repoRoot } from "../env.js";

type QueryResult<T> = { rows: T[]; rowCount: number };

export type DbClient = {
  query<T extends object>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  end(): Promise<void>;
};

let client: DbClient | undefined;

function isPgliteUrl(url: string): boolean {
  return url.startsWith("pglite:");
}

function pglitePath(url: string): string {
  const relative = url.slice("pglite:".length);
  return path.isAbsolute(relative) ? relative : path.resolve(repoRoot, relative);
}

function createPgClient(databaseUrl: string): DbClient {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  return {
    async query<T extends object>(text: string, values: unknown[] = []) {
      const result = await pool.query<T>(text, values);
      return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
    async end() {
      await pool.end();
    },
  };
}

function createPgliteClient(directory: string): DbClient {
  fs.mkdirSync(directory, { recursive: true });
  const db = new PGlite(directory);
  const ready = db.waitReady;
  return {
    async query<T extends object>(text: string, values: unknown[] = []) {
      await ready;
      const result = await db.query<T>(text, values);
      return { rows: result.rows, rowCount: result.rows.length };
    },
    async exec(sql: string) {
      await ready;
      await db.exec(sql);
    },
    async end() {
      await ready;
      await db.close();
    },
  };
}

export function getPool(): DbClient {
  if (!client) {
    const url = apiConfig().databaseUrl;
    client = isPgliteUrl(url) ? createPgliteClient(pglitePath(url)) : createPgClient(url);
  }
  return client;
}

export async function query<T extends object>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, values);
}
