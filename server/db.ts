import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Build DATABASE_URL from AWS RDS credentials or use existing DATABASE_URL
const getDatabaseUrl = () => {
  // If using AWS RDS (Australian server), build from individual credentials
  if (process.env.AWS_RDS_HOST) {
    const host = process.env.AWS_RDS_HOST;
    const port = process.env.AWS_RDS_PORT || '5432';
    const database = process.env.AWS_RDS_DATABASE;
    const user = process.env.AWS_RDS_USER;
    const password = process.env.AWS_RDS_PASSWORD;
    
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }
  
  // Fallback to regular DATABASE_URL
  return process.env.DATABASE_URL;
};

const connectionString = getDatabaseUrl();

if (!connectionString) {
  throw new Error(
    "Database credentials not set. Provide either AWS_RDS_* credentials or DATABASE_URL",
  );
}

export const pool = new Pool({ 
  connectionString,
  ssl: process.env.AWS_RDS_HOST ? { rejectUnauthorized: false } : undefined
});

export const db = drizzle(pool, { schema });
