import { type User, type InsertUser, type Organization, type InsertOrganization, type CareAnalysis, type InsertCareAnalysis, type SavedCarePlan, type InsertSavedCarePlan, type ClientDocument, type InsertClientDocument, type ClientFolderAlias, type InsertClientFolderAlias, type UpdateClientFolderAlias, users, organizations, careAnalyses, savedCarePlans, clientDocuments, clientFolderAliases } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";

export interface IStorage {
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;
  
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
}

export class MemStorage implements IStorage {
  private organizations: Map<string, Organization>;
  private users: Map<string, User>;
  private careAnalyses: Map<string, CareAnalysis>;
  private savedCarePlans: Map<string, SavedCarePlan>;
  private clientDocuments: Map<string, ClientDocument>;
  private clientFolderAliases: Map<string, ClientFolderAlias>;

  constructor() {
    this.organizations = new Map();
    this.users = new Map();
    this.careAnalyses = new Map();
    this.savedCarePlans = new Map();
    this.clientDocuments = new Map();
    this.clientFolderAliases = new Map();
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const id = randomUUID();
    const organization: Organization = {
      id,
      name: org.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.set(id, organization);
    return organization;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      passwordHash: insertUser.passwordHash,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      organizationId: insertUser.organizationId,
      role: insertUser.role || "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.organizationId === organizationId);
  }

  async createCareAnalysis(organizationId: string, analysis: InsertCareAnalysis & { extractedFacts?: any; generatedHtml?: string }): Promise<CareAnalysis> {
    const id = randomUUID();
    const careAnalysis: CareAnalysis = {
      id,
      organizationId,
      clientName: analysis.clientName,
      transcript: analysis.transcript,
      extractedFacts: analysis.extractedFacts || null,
      generatedHtml: analysis.generatedHtml || null,
      processingMode: analysis.processingMode || "ai",
      createdAt: new Date(),
    };
    this.careAnalyses.set(id, careAnalysis);
    return careAnalysis;
  }

  async getCareAnalysis(organizationId: string, id: string): Promise<CareAnalysis | undefined> {
    const analysis = this.careAnalyses.get(id);
    return analysis?.organizationId === organizationId ? analysis : undefined;
  }

  async getCareAnalysesByClient(organizationId: string, clientName: string): Promise<CareAnalysis[]> {
    return Array.from(this.careAnalyses.values()).filter(
      (analysis) => analysis.organizationId === organizationId && analysis.clientName.toLowerCase() === clientName.toLowerCase()
    );
  }

  async createSavedCarePlan(organizationId: string, carePlan: InsertSavedCarePlan): Promise<SavedCarePlan> {
    const id = randomUUID();
    const savedCarePlan: SavedCarePlan = {
      id,
      organizationId,
      name: carePlan.name,
      clientName: carePlan.clientName,
      html: carePlan.html,
      extractedFacts: carePlan.extractedFacts || null,
      saveDate: carePlan.saveDate,
      createdAt: new Date(),
    };
    this.savedCarePlans.set(id, savedCarePlan);
    return savedCarePlan;
  }

  async getSavedCarePlans(organizationId: string): Promise<SavedCarePlan[]> {
    return Array.from(this.savedCarePlans.values())
      .filter(plan => plan.organizationId === organizationId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getSavedCarePlan(organizationId: string, id: string): Promise<SavedCarePlan | undefined> {
    const plan = this.savedCarePlans.get(id);
    return plan?.organizationId === organizationId ? plan : undefined;
  }

  async deleteSavedCarePlan(organizationId: string, id: string): Promise<boolean> {
    const plan = this.savedCarePlans.get(id);
    if (plan?.organizationId === organizationId) {
      return this.savedCarePlans.delete(id);
    }
    return false;
  }
  
  async createClientDocument(organizationId: string, document: InsertClientDocument): Promise<ClientDocument> {
    const id = randomUUID();
    const newDocument: ClientDocument = {
      id,
      organizationId,
      clientName: document.clientName,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize || null,
      objectPath: document.objectPath,
      description: document.description || null,
      uploadedAt: new Date(),
    };
    this.clientDocuments.set(id, newDocument);
    return newDocument;
  }
  
  async getClientDocuments(organizationId: string, clientName: string): Promise<ClientDocument[]> {
    return Array.from(this.clientDocuments.values())
      .filter(doc => doc.organizationId === organizationId && doc.clientName === clientName)
      .sort((a, b) => new Date(b.uploadedAt!).getTime() - new Date(a.uploadedAt!).getTime());
  }
  
  async getAllClientDocuments(organizationId: string): Promise<ClientDocument[]> {
    return Array.from(this.clientDocuments.values())
      .filter(doc => doc.organizationId === organizationId)
      .sort((a, b) => new Date(b.uploadedAt!).getTime() - new Date(a.uploadedAt!).getTime());
  }
  
  async deleteClientDocument(organizationId: string, id: string): Promise<boolean> {
    const doc = this.clientDocuments.get(id);
    if (doc?.organizationId === organizationId) {
      return this.clientDocuments.delete(id);
    }
    return false;
  }

  async createClientFolderAlias(organizationId: string, alias: InsertClientFolderAlias): Promise<ClientFolderAlias> {
    const id = randomUUID();
    const newAlias: ClientFolderAlias = {
      id,
      ...alias,
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const key = `${organizationId}_${alias.originalClientName}`;
    this.clientFolderAliases.set(key, newAlias);
    return newAlias;
  }

  async getClientFolderAlias(organizationId: string, originalClientName: string): Promise<ClientFolderAlias | undefined> {
    const key = `${organizationId}_${originalClientName}`;
    return this.clientFolderAliases.get(key);
  }

  async getAllClientFolderAliases(organizationId: string): Promise<ClientFolderAlias[]> {
    return Array.from(this.clientFolderAliases.values())
      .filter(alias => alias.organizationId === organizationId);
  }

  async updateClientFolderAlias(organizationId: string, originalClientName: string, update: UpdateClientFolderAlias): Promise<ClientFolderAlias | undefined> {
    const key = `${organizationId}_${originalClientName}`;
    const existing = this.clientFolderAliases.get(key);
    if (!existing) return undefined;
    
    const updated: ClientFolderAlias = {
      ...existing,
      ...update,
      updatedAt: new Date(),
    };
    this.clientFolderAliases.set(key, updated);
    return updated;
  }

  async deleteClientFolderAlias(organizationId: string, originalClientName: string): Promise<boolean> {
    const key = `${organizationId}_${originalClientName}`;
    return this.clientFolderAliases.delete(key);
  }
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
}

export const storage = new DatabaseStorage();
