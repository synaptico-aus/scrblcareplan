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
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CareAnalysis = typeof careAnalyses.$inferSelect;
export type InsertCareAnalysis = z.infer<typeof insertCareAnalysisSchema>;
export type SavedCarePlan = typeof savedCarePlans.$inferSelect;
export type InsertSavedCarePlan = z.infer<typeof insertSavedCarePlanSchema>;
export type ExtractedFacts = z.infer<typeof factsSchema>;
export type ChatParityRequest = z.infer<typeof chatParityRequestSchema>;
