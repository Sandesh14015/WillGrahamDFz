import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : null;

// Drizzle client requires a live pool; when DATABASE_URL is missing we still
// want the server to boot so routes can return fallbacks.
export const db = pool ? drizzle(pool, { schema }) : null;



export * from "./schema";


