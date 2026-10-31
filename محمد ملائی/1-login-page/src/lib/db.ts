import "server-only";

import { neon } from "@neondatabase/serverless";

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Database is not configured. Set DATABASE_URL in the deployment environment.");
  }

  return neon(connectionString);
}
