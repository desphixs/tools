import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { authSchema } from "@/db/schema/auth";

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to connect to Neon Postgres.");
  }

  const client = neon(connectionString);
  return drizzle({ client, schema: authSchema });
}

export const db = createDatabase();
