import { type User, type InsertUser, type CareAnalysis, type InsertCareAnalysis, type SavedCarePlan, type InsertSavedCarePlan, users, careAnalyses, savedCarePlans } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createCareAnalysis(analysis: InsertCareAnalysis & { extractedFacts?: any; generatedHtml?: string }): Promise<CareAnalysis>;
  getCareAnalysis(id: string): Promise<CareAnalysis | undefined>;
  getCareAnalysesByClient(clientName: string): Promise<CareAnalysis[]>;
  createSavedCarePlan(carePlan: InsertSavedCarePlan): Promise<SavedCarePlan>;
  getSavedCarePlans(): Promise<SavedCarePlan[]>;
  getSavedCarePlan(id: string): Promise<SavedCarePlan | undefined>;
  deleteSavedCarePlan(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private careAnalyses: Map<string, CareAnalysis>;
  private savedCarePlans: Map<string, SavedCarePlan>;

  constructor() {
    this.users = new Map();
    this.careAnalyses = new Map();
    this.savedCarePlans = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createCareAnalysis(analysis: InsertCareAnalysis & { extractedFacts?: any; generatedHtml?: string }): Promise<CareAnalysis> {
    const id = randomUUID();
    const careAnalysis: CareAnalysis = {
      id,
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

  async getCareAnalysis(id: string): Promise<CareAnalysis | undefined> {
    return this.careAnalyses.get(id);
  }

  async getCareAnalysesByClient(clientName: string): Promise<CareAnalysis[]> {
    return Array.from(this.careAnalyses.values()).filter(
      (analysis) => analysis.clientName.toLowerCase() === clientName.toLowerCase()
    );
  }

  async createSavedCarePlan(carePlan: InsertSavedCarePlan): Promise<SavedCarePlan> {
    const id = randomUUID();
    const savedCarePlan: SavedCarePlan = {
      id,
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

  async getSavedCarePlans(): Promise<SavedCarePlan[]> {
    return Array.from(this.savedCarePlans.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getSavedCarePlan(id: string): Promise<SavedCarePlan | undefined> {
    return this.savedCarePlans.get(id);
  }

  async deleteSavedCarePlan(id: string): Promise<boolean> {
    return this.savedCarePlans.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createCareAnalysis(analysis: InsertCareAnalysis & { extractedFacts?: any; generatedHtml?: string }): Promise<CareAnalysis> {
    const [careAnalysis] = await db
      .insert(careAnalyses)
      .values({
        clientName: analysis.clientName,
        transcript: analysis.transcript,
        extractedFacts: analysis.extractedFacts || null,
        generatedHtml: analysis.generatedHtml || null,
        processingMode: analysis.processingMode || "ai",
      })
      .returning();
    return careAnalysis;
  }

  async getCareAnalysis(id: string): Promise<CareAnalysis | undefined> {
    const [careAnalysis] = await db.select().from(careAnalyses).where(eq(careAnalyses.id, id));
    return careAnalysis || undefined;
  }

  async getCareAnalysesByClient(clientName: string): Promise<CareAnalysis[]> {
    return await db.select().from(careAnalyses).where(eq(careAnalyses.clientName, clientName));
  }

  async createSavedCarePlan(carePlan: InsertSavedCarePlan): Promise<SavedCarePlan> {
    const [savedCarePlan] = await db
      .insert(savedCarePlans)
      .values({
        name: carePlan.name,
        clientName: carePlan.clientName,
        html: carePlan.html,
        extractedFacts: carePlan.extractedFacts || null,
        saveDate: carePlan.saveDate,
      })
      .returning();
    return savedCarePlan;
  }

  async getSavedCarePlans(): Promise<SavedCarePlan[]> {
    return await db.select().from(savedCarePlans).orderBy(sql`${savedCarePlans.createdAt} DESC`);
  }

  async getSavedCarePlan(id: string): Promise<SavedCarePlan | undefined> {
    const [savedCarePlan] = await db.select().from(savedCarePlans).where(eq(savedCarePlans.id, id));
    return savedCarePlan || undefined;
  }

  async deleteSavedCarePlan(id: string): Promise<boolean> {
    const result = await db.delete(savedCarePlans).where(eq(savedCarePlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
