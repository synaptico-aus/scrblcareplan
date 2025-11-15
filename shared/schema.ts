import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, index, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Organizations table for multi-tenancy
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"),
  subscriptionPlan: varchar("subscription_plan"),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table with authentication and organization membership
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  role: varchar("role").notNull().default("user"), // "super_admin", "admin", or "user"
  monthlyPlanLimit: integer("monthly_plan_limit"), // null = unlimited
  plansGeneratedThisMonth: integer("plans_generated_this_month").notNull().default(0),
  limitResetDate: timestamp("limit_reset_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const careAnalyses = pgTable("care_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  clientName: text("client_name").notNull(),
  transcript: text("transcript").notNull(),
  extractedFacts: jsonb("extracted_facts"),
  generatedHtml: text("generated_html"),
  processingMode: text("processing_mode").notNull().default("ai"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedCarePlans = pgTable("saved_care_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  html: text("html").notNull(),
  extractedFacts: jsonb("extracted_facts"),
  saveDate: timestamp("save_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientDocuments = pgTable("client_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  clientName: text("client_name").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  objectPath: text("object_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  description: text("description"),
});

export const clientFolderAliases = pgTable("client_folder_aliases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  originalClientName: text("original_client_name").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_client_folder_org").on(table.organizationId, table.originalClientName),
]);

export const serviceRates = pgTable("service_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  serviceName: text("service_name").notNull(),
  category: text("category").notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_service_rates_org").on(table.organizationId),
]);

export const organizationBillingProfiles = pgTable("organization_billing_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").unique().notNull().references(() => organizations.id),
  contactName: text("contact_name"),
  companyName: text("company_name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  suburb: text("suburb"),
  state: text("state"),
  postcode: text("postcode"),
  email: text("email"),
  phone: text("phone"),
  abn: text("abn"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_billing_org").on(table.organizationId),
]);

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCareAnalysisSchema = createInsertSchema(careAnalyses).pick({
  clientName: true,
  transcript: true,
  processingMode: true,
});

// Funding level and budget definitions
export const fundingLevels = {
  hcp: {
    level1: { name: "HCP Level 1", quarterlyAmount: 2647.16 },
    level2: { name: "HCP Level 2", quarterlyAmount: 4655.58 },
    level3: { name: "HCP Level 3", quarterlyAmount: 10132.40 },
    level4: { name: "HCP Level 4", quarterlyAmount: 15360.11 }
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

export const insertClientDocumentSchema = createInsertSchema(clientDocuments).pick({
  clientName: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  objectPath: true,
  description: true,
});

export const insertClientFolderAliasSchema = createInsertSchema(clientFolderAliases).pick({
  originalClientName: true,
  displayName: true,
});

export const updateClientFolderAliasSchema = insertClientFolderAliasSchema.pick({
  displayName: true,
});

export const insertServiceRateSchema = createInsertSchema(serviceRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
});

export const updateServiceRateSchema = insertServiceRateSchema.pick({
  hourlyRate: true,
});

// Helper to convert empty strings to null for optional fields
const emptyToNull = <T extends z.ZodTypeAny>(schema: T) => 
  z.preprocess(v => v === "" ? null : v, schema.nullable().optional());

export const insertBillingProfileSchema = createInsertSchema(organizationBillingProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
}).extend({
  contactName: emptyToNull(z.string().min(2, "Contact name must be at least 2 characters")),
  companyName: emptyToNull(z.string().min(2, "Company name must be at least 2 characters")),
  addressLine1: emptyToNull(z.string().min(3, "Address must be at least 3 characters")),
  addressLine2: emptyToNull(z.string()),
  suburb: emptyToNull(z.string().min(2, "Suburb must be at least 2 characters")),
  state: emptyToNull(z.string().min(2, "State must be at least 2 characters")),
  postcode: emptyToNull(z.string().regex(/^\d{4}$/, "Postcode must be 4 digits")),
  email: emptyToNull(z.string().email("Invalid email address")),
  phone: emptyToNull(z.string()
    .max(25, "Phone number too long")
    .regex(/^[\d\s\-\+\(\)]+$/, "Phone number can only contain digits, spaces, dashes, plus sign, and parentheses")
    .refine((val) => val.replace(/[\s\-\+\(\)]/g, '').length >= 6, {
      message: "Phone number must contain at least 6 digits",
    })),
  abn: emptyToNull(z.string().regex(/^\d{11}$/, "ABN must be 11 digits")),
});

export const updateBillingProfileSchema = insertBillingProfileSchema;

export const DEFAULT_SERVICES = [
  { serviceName: "Registered nurse", category: "Clinical/Nursing" },
  { serviceName: "Enrolled nurse", category: "Clinical/Nursing" },
  { serviceName: "Nursing assistant", category: "Clinical/Nursing" },
  { serviceName: "Enrolled nurse - Telehealth", category: "Clinical/Nursing" },
  { serviceName: "Registered nurse - Telehealth", category: "Clinical/Nursing" },
  { serviceName: "Allied Health Therapy assistant", category: "Allied Health" },
  { serviceName: "Counsellor or Psychotherapist", category: "Allied Health" },
  { serviceName: "Dietitian or Nutritionist", category: "Allied Health" },
  { serviceName: "Exercise physiologist", category: "Allied Health" },
  { serviceName: "Occupational therapist", category: "Allied Health" },
  { serviceName: "Physiotherapist", category: "Allied Health" },
  { serviceName: "Podiatrist", category: "Allied Health" },
  { serviceName: "Psychologist", category: "Allied Health" },
  { serviceName: "Social worker", category: "Allied Health" },
  { serviceName: "Speech pathologist", category: "Allied Health" },
  { serviceName: "Personal care", category: "Care & Support" },
  { serviceName: "Social support and community engagement", category: "Care & Support" },
  { serviceName: "Respite Care", category: "Care & Support" },
  { serviceName: "Remedial Massage", category: "Care & Support" },
  { serviceName: "Domestic assistance", category: "Care & Support" },
  { serviceName: "Home Gardening & Maintenance", category: "Care & Support" },
  { serviceName: "Meal preparation", category: "Care & Support" },
] as const;

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
  sessionId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  organizationName: z.string().min(1, "Organization name is required"),
});

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["super_admin", "admin", "user"]).default("user"),
});

export const updateUserLimitSchema = z.object({
  userId: z.string(),
  monthlyPlanLimit: z.number().int().min(0).nullable(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CareAnalysis = typeof careAnalyses.$inferSelect;
export type InsertCareAnalysis = z.infer<typeof insertCareAnalysisSchema>;
export type SavedCarePlan = typeof savedCarePlans.$inferSelect;
export type InsertSavedCarePlan = z.infer<typeof insertSavedCarePlanSchema>;
export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientDocument = z.infer<typeof insertClientDocumentSchema>;
export type ClientFolderAlias = typeof clientFolderAliases.$inferSelect;
export type InsertClientFolderAlias = z.infer<typeof insertClientFolderAliasSchema>;
export type UpdateClientFolderAlias = z.infer<typeof updateClientFolderAliasSchema>;
export type UpdateUserLimit = z.infer<typeof updateUserLimitSchema>;
export type ExtractedFacts = z.infer<typeof factsSchema>;
export type ChatParityRequest = z.infer<typeof chatParityRequestSchema>;
export type ServiceRate = typeof serviceRates.$inferSelect;
export type InsertServiceRate = z.infer<typeof insertServiceRateSchema>;
export type UpdateServiceRate = z.infer<typeof updateServiceRateSchema>;
export type BillingProfile = typeof organizationBillingProfiles.$inferSelect;
export type InsertBillingProfile = z.infer<typeof insertBillingProfileSchema>;
export type UpdateBillingProfile = z.infer<typeof updateBillingProfileSchema>;
