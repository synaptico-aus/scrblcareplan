import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatParityRequestSchema } from "@shared/schema";
import { extractFactsFromTranscript, generateCarePlanHtml } from "./services/openai";
import { generateOfflineFactsExtraction, generateOfflineCarePlan } from "./services/carePlanGenerator";

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.post("/api/chat-parity", async (req, res) => {
    try {
      const validatedData = chatParityRequestSchema.parse(req.body);
      const { clientName, transcript, template } = validatedData;

      if (template !== "gold-standard") {
        return res.status(400).json({ 
          message: "Only 'gold-standard' template is supported" 
        });
      }

      // Generate care plan using AI
      const [extractedFacts, generatedHtml] = await Promise.all([
        extractFactsFromTranscript(transcript, clientName),
        generateCarePlanHtml(transcript, clientName)
      ]);

      // Store the analysis
      const analysis = await storage.createCareAnalysis({
        clientName,
        transcript,
        processingMode: "ai",
        extractedFacts,
        generatedHtml,
      });

      res.json({
        html: generatedHtml,
        facts: extractedFacts,
        analysisId: analysis.id
      });

    } catch (error) {
      console.error("Error in chat-parity endpoint:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process care plan" 
      });
    }
  });

  app.post("/api/offline-analysis", async (req, res) => {
    try {
      const validatedData = chatParityRequestSchema.parse(req.body);
      const { clientName, transcript } = validatedData;

      // Generate care plan using offline processing
      const extractedFacts = generateOfflineFactsExtraction(transcript, clientName);
      const generatedHtml = generateOfflineCarePlan(transcript, clientName);

      // Store the analysis
      const analysis = await storage.createCareAnalysis({
        clientName,
        transcript,
        processingMode: "offline",
        extractedFacts,
        generatedHtml,
      });

      res.json({
        html: generatedHtml,
        facts: extractedFacts,
        analysisId: analysis.id
      });

    } catch (error) {
      console.error("Error in offline-analysis endpoint:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process care plan offline" 
      });
    }
  });

  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const analysis = await storage.getCareAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ 
          message: "Analysis not found" 
        });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ 
        message: "Failed to fetch analysis" 
      });
    }
  });

  app.get("/api/client/:clientName/analyses", async (req, res) => {
    try {
      const { clientName } = req.params;
      const analyses = await storage.getCareAnalysesByClient(clientName);
      
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching client analyses:", error);
      res.status(500).json({ 
        message: "Failed to fetch client analyses" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
