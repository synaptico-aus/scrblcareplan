import { pool } from "../server/db";
import { readFileSync } from "fs";
import { join } from "path";

async function applyMigration() {
  try {
    console.log("Applying 2FA columns migration...");
    
    const migrationSQL = readFileSync(
      join(process.cwd(), "migrations", "add_2fa_columns.sql"),
      "utf-8"
    );
    
    await pool.query(migrationSQL);
    
    console.log("✓ Migration applied successfully!");
    console.log("✓ Columns two_factor_secret and two_factor_enabled added to users table");
    
  } catch (error: any) {
    console.error("Error applying migration:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
