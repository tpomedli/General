import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
let pool: pg.Pool | undefined;

const globalForDb = globalThis as typeof globalThis & { recipeBookLocal?: Promise<PGlite> };

type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await pool.query(text, params)).rows as T[];
  }
  const db = await getLocal();
  return (await db.query<T>(text, params)).rows;
}

export async function transaction<T>(fn: (query: Query) => Promise<T>): Promise<T> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = await fn(async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => {
        return (await client.query(text, params)).rows as T[];
      });
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
  const db = await getLocal();
  return db.transaction(async (tx) => {
    return fn(async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => {
      return (await tx.query<T>(text, params)).rows;
    });
  });
}

async function getLocal(): Promise<PGlite> {
  globalForDb.recipeBookLocal ??= startLocal().catch((error: unknown) => {
    globalForDb.recipeBookLocal = undefined;
    throw error;
  });
  return globalForDb.recipeBookLocal;
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
