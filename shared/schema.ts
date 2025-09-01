import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const careAnalyses = pgTable("care_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientName: text("client_name").notNull(),
  transcript: text("transcript").notNull(),
  extractedFacts: jsonb("extracted_facts"),
  generatedHtml: text("generated_html"),
  processingMode: text("processing_mode").notNull().default("ai"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedCarePlans = pgTable("saved_care_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  html: text("html").notNull(),
  extractedFacts: jsonb("extracted_facts"),
  saveDate: timestamp("save_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCareAnalysisSchema = createInsertSchema(careAnalyses).pick({
  clientName: true,
  transcript: true,
  processingMode: true,
});

// Funding level and budget definitions
export const fundingLevels = {
  hcp: {
    level1: { name: "HCP Level 1", quarterlyAmount: 2775.00 },
    level2: { name: "HCP Level 2", quarterlyAmount: 4873.75 },
    level3: { name: "HCP Level 3", quarterlyAmount: 10461.75 },
    level4: { name: "HCP Level 4", quarterlyAmount: 16236.00 }
  },
  sah: {
    level1: { name: "SaH Level 1", quarterlyAmount: 2750.00 },
    level2: { name: "SaH Level 2", quarterlyAmount: 4000.00 },
    level3: { name: "SaH Level 3", quarterlyAmount: 5500.00 },
    level4: { name: "SaH Level 4", quarterlyAmount: 7500.00 },
    level5: { name: "SaH Level 5", quarterlyAmount: 10000.00 },
    level6: { name: "SaH Level 6", quarterlyAmount: 12000.00 },
    level7: { name: "SaH Level 7", quarterlyAmount: 14500.00 },
    level8: { name: "SaH Level 8", quarterlyAmount: 19500.00 },
    restorative: { name: "Restorative Care Pathway", quarterlyAmount: 6000.00 },
    endoflife: { name: "End-of-Life Pathway", quarterlyAmount: 25000.00 }
  }
} as const;

export const insertSavedCarePlanSchema = createInsertSchema(savedCarePlans).pick({
  name: true,
  clientName: true,
  html: true,
  extractedFacts: true,
  saveDate: true,
}).extend({
  saveDate: z.string().or(z.date()).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

export const factsSchema = z.object({
  clientDetails: z.object({
    name: z.string(),
    language: z.string().optional(),
    interpreterRequired: z.boolean().optional(),
  }),
  medical: z.object({
    gp: z.string().optional(),
    pharmacy: z.string().optional(),
    equipment: z.array(z.string()).optional(),
    medications: z.string().optional(),
    allergies: z.string().optional(),
  }),
  support: z.object({
    primaryContact: z.string().optional(),
    secondaryContact: z.string().optional(),
    livingArrangement: z.string().optional(),
  }),
  risks: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.enum(["low", "medium", "high"]).optional(),
  })).optional(),
  preferences: z.object({
    workerPreferences: z.string().optional(),
    serviceDeliveryPreferences: z.string().optional(),
    culturalConsiderations: z.string().optional(),
  }).optional(),
});

export const chatParityRequestSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  transcript: z.string().min(1, "Transcript is required"),
  template: z.literal("gold-standard"),
  fundingType: z.enum(["hcp", "sah"]).optional(),
  fundingLevel: z.enum(["level1", "level2", "level3", "level4", "level5", "level6", "level7", "level8", "restorative", "endoflife"]).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CareAnalysis = typeof careAnalyses.$inferSelect;
export type InsertCareAnalysis = z.infer<typeof insertCareAnalysisSchema>;
export type SavedCarePlan = typeof savedCarePlans.$inferSelect;
export type InsertSavedCarePlan = z.infer<typeof insertSavedCarePlanSchema>;
export type ExtractedFacts = z.infer<typeof factsSchema>;
export type ChatParityRequest = z.infer<typeof chatParityRequestSchema>;
