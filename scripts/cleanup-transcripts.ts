import { db } from "../server/db.js";
import { careAnalyses } from "../shared/schema.js";
import { sql } from "drizzle-orm";

async function cleanupTranscripts() {
  console.log("Starting transcript cleanup...");
  console.log("This will delete all transcript data from care_analyses for privacy compliance.");
  console.log("");

  try {
    // Count records with transcripts before cleanup
    const beforeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(careAnalyses)
      .where(sql`${careAnalyses.transcript} IS NOT NULL`);

    const recordsWithTranscripts = Number(beforeCount[0]?.count || 0);
    console.log(`Found ${recordsWithTranscripts} care analyses with transcripts.`);

    if (recordsWithTranscripts === 0) {
      console.log("No transcripts found. Nothing to clean up.");
      return;
    }

    // Delete all transcripts (set to null)
    const result = await db
      .update(careAnalyses)
      .set({ transcript: null })
      .where(sql`${careAnalyses.transcript} IS NOT NULL`);

    console.log(`✓ Successfully deleted transcripts from ${recordsWithTranscripts} records.`);
    console.log("");
    console.log("Privacy enhancement complete!");
    console.log("- Transcripts have been permanently deleted");
    console.log("- Extracted facts and care plans are preserved");
    console.log("");

  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupTranscripts()
  .then(() => {
    console.log("Cleanup complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
