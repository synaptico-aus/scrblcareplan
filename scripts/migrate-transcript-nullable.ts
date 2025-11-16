import { db } from "../server/db.js";
import { sql } from "drizzle-orm";

async function migrateTranscriptToNullable() {
  console.log("Starting database migration: Making transcript column nullable...");
  console.log("");

  try {
    // Alter the transcript column to allow NULL values
    await db.execute(sql`
      ALTER TABLE care_analyses 
      ALTER COLUMN transcript DROP NOT NULL
    `);

    console.log("✓ Successfully altered transcript column to allow NULL values.");
    console.log("");
    console.log("Migration complete! The transcript field can now be deleted for privacy.");

  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

migrateTranscriptToNullable()
  .then(() => {
    console.log("Migration successful.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
