import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Lazy-initialize the database connection.
// This prevents crashes at import time when DATABASE_URL is not yet configured
// (e.g., before Supabase is set up).

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("[YOUR-PASSWORD]")) {
    throw new Error(
      "DATABASE_URL is not configured. " +
        "Set it in frontend/.env to your Supabase connection string.",
    );
  }

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  _db = drizzle(client, { schema });
  return _db;
}

// For convenience — re-export as `db` but it's a getter
// Use `getDb()` in API routes for lazy initialization
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export type Database = ReturnType<typeof getDb>;
