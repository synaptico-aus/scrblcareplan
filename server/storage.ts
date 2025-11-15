import { type User, type InsertUser, type Organization, type InsertOrganization, type CareAnalysis, type InsertCareAnalysis, type SavedCarePlan, type InsertSavedCarePlan, type ClientDocument, type InsertClientDocument, type ClientFolderAlias, type InsertClientFolderAlias, type UpdateClientFolderAlias, type ServiceRate, type InsertServiceRate, type UpdateServiceRate, users, organizations, careAnalyses, savedCarePlans, clientDocuments, clientFolderAliases, serviceRates, DEFAULT_SERVICES } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";

export interface IStorage {
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  updateOrganizationSubscription(organizationId: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
  }): Promise<Organization | undefined>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUserLimit(userId: string, monthlyPlanLimit: number | null): Promise<User | undefined>;
  incrementUserPlanCount(userId: string): Promise<void>;
  checkAndResetUserPlanCount(userId: string): Promise<{ canGenerate: boolean; remainingPlans: number | null }>;
  
  // Care analysis operations (organization-scoped)
  createCareAnalysis(organizationId: string, analysis: InsertCareAnalysis & { extractedFacts?: any; generatedHtml?: string }): Promise<CareAnalysis>;
  getCareAnalysis(organizationId: string, id: string): Promise<CareAnalysis | undefined>;
  getCareAnalysesByClient(organizationId: string, clientName: string): Promise<CareAnalysis[]>;
  
  // Saved care plan operations (organization-scoped)
  createSavedCarePlan(organizationId: string, carePlan: InsertSavedCarePlan): Promise<SavedCarePlan>;
  getSavedCarePlans(organizationId: string): Promise<SavedCarePlan[]>;
  getSavedCarePlan(organizationId: string, id: string): Promise<SavedCarePlan | undefined>;
  deleteSavedCarePlan(organizationId: string, id: string): Promise<boolean>;
  
  // Client document operations (organization-scoped)
  createClientDocument(organizationId: string, document: InsertClientDocument): Promise<ClientDocument>;
  getClientDocuments(organizationId: string, clientName: string): Promise<ClientDocument[]>;
  getAllClientDocuments(organizationId: string): Promise<ClientDocument[]>;
  deleteClientDocument(organizationId: string, id: string): Promise<boolean>;
  
  // Client folder alias operations (organization-scoped)
  createClientFolderAlias(organizationId: string, alias: InsertClientFolderAlias): Promise<ClientFolderAlias>;
  getClientFolderAlias(organizationId: string, originalClientName: string): Promise<ClientFolderAlias | undefined>;
  getAllClientFolderAliases(organizationId: string): Promise<ClientFolderAlias[]>;
  updateClientFolderAlias(organizationId: string, originalClientName: string, update: UpdateClientFolderAlias): Promise<ClientFolderAlias | undefined>;
  deleteClientFolderAlias(organizationId: string, originalClientName: string): Promise<boolean>;
  
  // Service rate operations (organization-scoped)
  getServiceRates(organizationId: string): Promise<ServiceRate[]>;
  updateServiceRate(organizationId: string, serviceId: string, update: UpdateServiceRate): Promise<ServiceRate | undefined>;
  seedDefaultServiceRates(organizationId: string): Promise<ServiceRate[]>;
}

export class DatabaseStorage implements IStorage {
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [organization] = await db
      .insert(organizations)
      .values(org)
      .returning();
    return organization;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization || undefined;
  }

  async updateOrganizationSubscription(organizationId: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
  }): Promise<Organization | undefined> {
    const [organization] = await db
      .update(organizations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId))
      .returning();
    return organization || undefined;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserLimit(userId: string, monthlyPlanLimit: number | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        monthlyPlanLimit,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async incrementUserPlanCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        plansGeneratedThisMonth: sql`${users.plansGeneratedThisMonth} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async checkAndResetUserPlanCount(userId: string): Promise<{ canGenerate: boolean; remainingPlans: number | null }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return { canGenerate: false, remainingPlans: null };
    }

    // Check if we need to reset the count (new month)
    const now = new Date();
    const resetDate = user.limitResetDate;
    
    if (!resetDate || now >= resetDate) {
      // Reset count and set next reset date to first day of next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await db
        .update(users)
        .set({ 
          plansGeneratedThisMonth: 0,
          limitResetDate: nextMonth,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      user.plansGeneratedThisMonth = 0;
      user.limitResetDate = nextMonth;
    }

    // If no limit set, user can generate unlimited plans
    if (user.monthlyPlanLimit === null) {
      return { canGenerate: true, remainingPlans: null };
    }

    // Check if user has exceeded limit
    const remaining = user.monthlyPlanLimit - (user.plansGeneratedThisMonth || 0);
    return {
      canGenerate: remaining > 0,
      remainingPlans: remaining
    };
  }

  async createCareAnalysis(organizationId: string, analysis: InsertCareAnalysis & { extractedFacts?: any; generatedHtml?: string }): Promise<CareAnalysis> {
    const [careAnalysis] = await db
      .insert(careAnalyses)
      .values({
        organizationId,
        clientName: analysis.clientName,
        transcript: analysis.transcript,
        extractedFacts: analysis.extractedFacts || null,
        generatedHtml: analysis.generatedHtml || null,
        processingMode: analysis.processingMode || "ai",
      })
      .returning();
    return careAnalysis;
  }

  async getCareAnalysis(organizationId: string, id: string): Promise<CareAnalysis | undefined> {
    const [careAnalysis] = await db.select().from(careAnalyses)
      .where(and(eq(careAnalyses.id, id), eq(careAnalyses.organizationId, organizationId)));
    return careAnalysis || undefined;
  }

  async getCareAnalysesByClient(organizationId: string, clientName: string): Promise<CareAnalysis[]> {
    return await db.select().from(careAnalyses)
      .where(and(eq(careAnalyses.clientName, clientName), eq(careAnalyses.organizationId, organizationId)));
  }

  async createSavedCarePlan(organizationId: string, carePlan: InsertSavedCarePlan): Promise<SavedCarePlan> {
    const [savedCarePlan] = await db
      .insert(savedCarePlans)
      .values({
        organizationId,
        name: carePlan.name,
        clientName: carePlan.clientName,
        html: carePlan.html,
        extractedFacts: carePlan.extractedFacts || null,
        saveDate: carePlan.saveDate,
      })
      .returning();
    return savedCarePlan;
  }

  async getSavedCarePlans(organizationId: string): Promise<SavedCarePlan[]> {
    return await db.select().from(savedCarePlans)
      .where(eq(savedCarePlans.organizationId, organizationId))
      .orderBy(sql`${savedCarePlans.createdAt} DESC`);
  }

  async getSavedCarePlan(organizationId: string, id: string): Promise<SavedCarePlan | undefined> {
    const [savedCarePlan] = await db.select().from(savedCarePlans)
      .where(and(eq(savedCarePlans.id, id), eq(savedCarePlans.organizationId, organizationId)));
    return savedCarePlan || undefined;
  }

  async deleteSavedCarePlan(organizationId: string, id: string): Promise<boolean> {
    const result = await db.delete(savedCarePlans)
      .where(and(eq(savedCarePlans.id, id), eq(savedCarePlans.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }
  
  async createClientDocument(organizationId: string, document: InsertClientDocument): Promise<ClientDocument> {
    const [clientDocument] = await db
      .insert(clientDocuments)
      .values({
        organizationId,
        clientName: document.clientName,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        objectPath: document.objectPath,
        description: document.description,
      })
      .returning();
    return clientDocument;
  }
  
  async getClientDocuments(organizationId: string, clientName: string): Promise<ClientDocument[]> {
    return await db.select().from(clientDocuments)
      .where(and(eq(clientDocuments.clientName, clientName), eq(clientDocuments.organizationId, organizationId)))
      .orderBy(sql`${clientDocuments.uploadedAt} DESC`);
  }
  
  async getAllClientDocuments(organizationId: string): Promise<ClientDocument[]> {
    return await db.select().from(clientDocuments)
      .where(eq(clientDocuments.organizationId, organizationId))
      .orderBy(sql`${clientDocuments.uploadedAt} DESC`);
  }
  
  async deleteClientDocument(organizationId: string, id: string): Promise<boolean> {
    const result = await db.delete(clientDocuments)
      .where(and(eq(clientDocuments.id, id), eq(clientDocuments.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  async createClientFolderAlias(organizationId: string, alias: InsertClientFolderAlias): Promise<ClientFolderAlias> {
    const [clientFolderAlias] = await db
      .insert(clientFolderAliases)
      .values({
        organizationId,
        originalClientName: alias.originalClientName,
        displayName: alias.displayName,
      })
      .returning();
    return clientFolderAlias;
  }

  async getClientFolderAlias(organizationId: string, originalClientName: string): Promise<ClientFolderAlias | undefined> {
    const [alias] = await db.select().from(clientFolderAliases)
      .where(and(
        eq(clientFolderAliases.originalClientName, originalClientName),
        eq(clientFolderAliases.organizationId, organizationId)
      ));
    return alias || undefined;
  }

  async getAllClientFolderAliases(organizationId: string): Promise<ClientFolderAlias[]> {
    return await db.select().from(clientFolderAliases)
      .where(eq(clientFolderAliases.organizationId, organizationId))
      .orderBy(sql`${clientFolderAliases.createdAt} DESC`);
  }

  async updateClientFolderAlias(organizationId: string, originalClientName: string, update: UpdateClientFolderAlias): Promise<ClientFolderAlias | undefined> {
    const [updated] = await db
      .update(clientFolderAliases)
      .set({
        displayName: update.displayName,
        updatedAt: new Date(),
      })
      .where(and(
        eq(clientFolderAliases.originalClientName, originalClientName),
        eq(clientFolderAliases.organizationId, organizationId)
      ))
      .returning();
    return updated || undefined;
  }

  async deleteClientFolderAlias(organizationId: string, originalClientName: string): Promise<boolean> {
    const result = await db.delete(clientFolderAliases)
      .where(and(
        eq(clientFolderAliases.originalClientName, originalClientName),
        eq(clientFolderAliases.organizationId, organizationId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async getServiceRates(organizationId: string): Promise<ServiceRate[]> {
    const rates = await db.select().from(serviceRates)
      .where(eq(serviceRates.organizationId, organizationId))
      .orderBy(serviceRates.category, serviceRates.serviceName);
    
    if (rates.length === 0) {
      return this.seedDefaultServiceRates(organizationId);
    }
    
    return rates;
  }

  async updateServiceRate(organizationId: string, serviceId: string, update: UpdateServiceRate): Promise<ServiceRate | undefined> {
    const [updated] = await db
      .update(serviceRates)
      .set({
        hourlyRate: update.hourlyRate,
        updatedAt: new Date(),
      })
      .where(and(
        eq(serviceRates.id, serviceId),
        eq(serviceRates.organizationId, organizationId)
      ))
      .returning();
    return updated || undefined;
  }

  async seedDefaultServiceRates(organizationId: string): Promise<ServiceRate[]> {
    const values = DEFAULT_SERVICES.map(service => ({
      organizationId,
      serviceName: service.serviceName,
      category: service.category,
      hourlyRate: null,
    }));
    
    const seededRates = await db
      .insert(serviceRates)
      .values(values)
      .returning();
    
    return seededRates;
  }
}

export const storage = new DatabaseStorage();
