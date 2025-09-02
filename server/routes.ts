import type { Express } from "express";
import { createServer, type Server } from "http";
import { EventEmitter } from "events";
import { storage } from "./storage";
import { chatParityRequestSchema, insertSavedCarePlanSchema, insertClientDocumentSchema, insertClientFolderAliasSchema, updateClientFolderAliasSchema } from "@shared/schema";
import { extractFactsFromTranscript, generateCarePlanHtml } from "./services/openai";
import { generateOfflineFactsExtraction, generateOfflineCarePlan } from "./services/carePlanGenerator";
import { z } from "zod";
import puppeteer from "puppeteer";
import { ObjectStorageService } from "./objectStorage";

// Event emitter for real-time updates
const eventEmitter = new EventEmitter();

const nottaUrlSchema = z.object({
  url: z.string().url()
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.post("/api/fetch-notta", async (req, res) => {
    let browser;
    try {
      const { url } = nottaUrlSchema.parse(req.body);
      
      console.log(`Attempting to extract transcript from Notta.AI URL: ${url}`);
      
      // Launch headless browser with additional Chrome args for server environments
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-default-browser-check',
          '--no-sandbox',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI'
        ],
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser'
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to the page
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for content to load and try multiple selectors
      await page.waitForFunction(() => document.readyState === 'complete');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try to extract transcript using various selectors
      const transcript = await page.evaluate(() => {
        // Try multiple possible selectors for transcript content
        const selectors = [
          '[data-testid*="transcript"]',
          '.transcript-content',
          '.transcript-text',
          '[class*="transcript"]',
          'pre',
          '.content-text',
          '[data-transcript]',
          '.meeting-transcript',
          'div[contenteditable="true"]'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent && element.textContent.trim().length > 50) {
            return element.textContent.trim();
          }
        }
        
        // Try to find any text content that looks like a transcript
        const allText = document.body.innerText;
        const lines = allText.split('\n').filter(line => line.trim().length > 10);
        
        // Look for patterns that suggest transcript content
        for (let i = 0; i < lines.length - 5; i++) {
          const section = lines.slice(i, i + 5).join('\n');
          // Check if this looks like transcript content
          if (section.match(/\d{1,2}:\d{2}/) || 
              section.match(/Speaker \d+/i) ||
              section.match(/Unknown speaker/i) ||
              (section.length > 200 && section.split(' ').length > 30)) {
            // Found potential transcript, get more context
            const fullTranscript = lines.slice(i, Math.min(i + 100, lines.length)).join('\n');
            if (fullTranscript.length > 100) {
              return fullTranscript.trim();
            }
          }
        }
        
        return null;
      });
      
      if (!transcript) {
        return res.status(400).json({ 
          message: "Could not extract transcript content from Notta.AI page. The page may still be loading or the share link may not contain transcript text." 
        });
      }
      
      console.log(`Successfully extracted transcript: ${transcript.length} characters`);
      res.json({ transcript });
      
    } catch (error) {
      console.error("Error extracting Notta.AI transcript:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to extract transcript from Notta.AI" 
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });
  
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

  // Server-Sent Events endpoint for real-time generation updates
  app.get("/api/generation-stream/:sessionId", (req, res) => {
    const sessionId = req.params.sessionId;
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write('data: {"type":"ping"}\n\n');
    }, 30000);

    // Listen for updates for this session
    const updateHandler = (update: any) => {
      if (update.sessionId === sessionId) {
        res.write(`data: ${JSON.stringify(update)}\n\n`);
      }
    };

    // Add listener
    eventEmitter.on('generation-update', updateHandler);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      eventEmitter.removeListener('generation-update', updateHandler);
    });
  });

  // New streaming generation endpoint
  app.post("/api/chat-parity-stream", async (req, res) => {
    try {
      const validatedData = chatParityRequestSchema.parse(req.body);
      const { clientName, transcript, template, sessionId } = validatedData;

      if (template !== "gold-standard") {
        return res.status(400).json({ 
          message: "Only 'gold-standard' template is supported" 
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          message: "sessionId is required for streaming generation"
        });
      }

      // Send initial update
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Initializing AI care planning agent',
        step: 1,
        totalSteps: 8
      });

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Connecting to OpenAI GPT-5 model',
        step: 2,
        totalSteps: 8
      });

      // Step 1: Extract facts
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Analyzing transcript for key client information',
        step: 3,
        totalSteps: 8
      });

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Extracting medical history, support networks, and risk factors',
        step: 4,
        totalSteps: 8
      });

      const extractedFacts = await extractFactsFromTranscript(transcript, clientName);

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Facts extraction complete - proceeding to care plan generation',
        step: 5,
        totalSteps: 8
      });

      // Step 2: Generate care plan
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Generating Gold Standard Care Plan using Australian Aged Care standards',
        step: 6,
        totalSteps: 8
      });

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Applying Support at Home Program requirements and SMARTA goal principles',
        step: 7,
        totalSteps: 8
      });

      const generatedHtml = await generateCarePlanHtml(transcript, clientName);

      // Step 3: Store analysis
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Finalizing care plan and saving to database',
        step: 8,
        totalSteps: 8
      });

      const analysis = await storage.createCareAnalysis({
        clientName,
        transcript,
        processingMode: "ai",
        extractedFacts,
        generatedHtml,
      });

      // Send completion
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'complete',
        message: 'Care plan generation complete!',
        step: 4,
        totalSteps: 4,
        result: {
          html: generatedHtml,
          facts: extractedFacts,
          analysisId: analysis.id
        }
      });

      res.json({
        html: generatedHtml,
        facts: extractedFacts,
        analysisId: analysis.id
      });

    } catch (error) {
      const sessionId = req.body.sessionId;
      if (sessionId) {
        eventEmitter.emit('generation-update', {
          sessionId,
          type: 'error',
          message: error instanceof Error ? error.message : "Failed to process care plan"
        });
      }
      
      console.error("Error in streaming chat-parity endpoint:", error);
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

  // Saved Care Plans routes
  app.post("/api/saved-care-plans", async (req, res) => {
    try {
      const validatedData = insertSavedCarePlanSchema.parse(req.body);
      const savedCarePlan = await storage.createSavedCarePlan(validatedData);
      
      res.json(savedCarePlan);
    } catch (error) {
      console.error("Error saving care plan:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to save care plan" 
      });
    }
  });

  app.get("/api/saved-care-plans", async (req, res) => {
    try {
      const savedCarePlans = await storage.getSavedCarePlans();
      res.json(savedCarePlans);
    } catch (error) {
      console.error("Error fetching saved care plans:", error);
      res.status(500).json({ 
        message: "Failed to fetch saved care plans" 
      });
    }
  });

  app.get("/api/saved-care-plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const savedCarePlan = await storage.getSavedCarePlan(id);
      
      if (!savedCarePlan) {
        return res.status(404).json({ 
          message: "Saved care plan not found" 
        });
      }

      res.json(savedCarePlan);
    } catch (error) {
      console.error("Error fetching saved care plan:", error);
      res.status(500).json({ 
        message: "Failed to fetch saved care plan" 
      });
    }
  });

  app.delete("/api/saved-care-plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSavedCarePlan(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          message: "Saved care plan not found" 
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved care plan:", error);
      res.status(500).json({ 
        message: "Failed to delete saved care plan" 
      });
    }
  });

  // Object storage routes for document uploads
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  
  // Serve uploaded documents
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      res.status(404).json({ error: "File not found" });
    }
  });
  
  // Handle downloads for legacy documents with Google Cloud Storage URLs
  app.get("/api/documents/download", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL parameter is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(url);
      
      if (normalizedPath.startsWith('/objects/')) {
        // Convert to proper object file and download
        const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
        objectStorageService.downloadObject(objectFile, res);
      } else {
        return res.status(400).json({ error: "Invalid document URL" });
      }
    } catch (error) {
      console.error("Error downloading legacy document:", error);
      res.status(404).json({ error: "File not found" });
    }
  });
  
  // Client document routes
  app.post("/api/client-documents", async (req, res) => {
    try {
      const validatedData = insertClientDocumentSchema.parse(req.body);
      
      // Normalize the object path if it's a raw Google Cloud Storage URL
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(validatedData.objectPath);
      
      const documentData = {
        ...validatedData,
        objectPath: normalizedPath
      };
      
      const document = await storage.createClientDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating client document:", error);
      res.status(500).json({ error: "Failed to create document record" });
    }
  });
  
  app.get("/api/client-documents/:clientName", async (req, res) => {
    try {
      const { clientName } = req.params;
      const documents = await storage.getClientDocuments(decodeURIComponent(clientName));
      res.json(documents);
    } catch (error) {
      console.error("Error fetching client documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });
  
  app.get("/api/client-documents", async (req, res) => {
    try {
      const documents = await storage.getAllClientDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching all client documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });
  
  app.delete("/api/client-documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteClientDocument(id);
      
      if (success) {
        res.json({ message: "Document deleted successfully" });
      } else {
        res.status(404).json({ error: "Document not found" });
      }
    } catch (error) {
      console.error("Error deleting client document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });
  
  // Client folder alias routes
  app.post("/api/client-folder-aliases", async (req, res) => {
    try {
      const validatedData = insertClientFolderAliasSchema.parse(req.body);
      
      // Check if alias already exists
      const existing = await storage.getClientFolderAlias(validatedData.originalClientName);
      if (existing) {
        return res.status(409).json({ error: "Folder alias already exists for this client" });
      }
      
      const alias = await storage.createClientFolderAlias(validatedData);
      res.status(201).json(alias);
    } catch (error) {
      console.error("Error creating client folder alias:", error);
      res.status(500).json({ error: "Failed to create folder alias" });
    }
  });
  
  app.get("/api/client-folder-aliases/:originalClientName", async (req, res) => {
    try {
      const { originalClientName } = req.params;
      const alias = await storage.getClientFolderAlias(decodeURIComponent(originalClientName));
      
      if (alias) {
        res.json(alias);
      } else {
        res.status(404).json({ error: "Folder alias not found" });
      }
    } catch (error) {
      console.error("Error fetching client folder alias:", error);
      res.status(500).json({ error: "Failed to fetch folder alias" });
    }
  });
  
  app.get("/api/client-folder-aliases", async (req, res) => {
    try {
      const aliases = await storage.getAllClientFolderAliases();
      res.json(aliases);
    } catch (error) {
      console.error("Error fetching all client folder aliases:", error);
      res.status(500).json({ error: "Failed to fetch folder aliases" });
    }
  });
  
  app.put("/api/client-folder-aliases/:originalClientName", async (req, res) => {
    try {
      const { originalClientName } = req.params;
      const validatedData = updateClientFolderAliasSchema.parse(req.body);
      
      // Check if alias exists first, if not create it
      const existing = await storage.getClientFolderAlias(decodeURIComponent(originalClientName));
      
      if (!existing) {
        // Create new alias
        const newAlias = await storage.createClientFolderAlias({
          originalClientName: decodeURIComponent(originalClientName),
          displayName: validatedData.displayName
        });
        return res.status(201).json(newAlias);
      }
      
      // Update existing alias
      const updated = await storage.updateClientFolderAlias(decodeURIComponent(originalClientName), validatedData);
      
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ error: "Folder alias not found" });
      }
    } catch (error) {
      console.error("Error updating client folder alias:", error);
      res.status(500).json({ error: "Failed to update folder alias" });
    }
  });
  
  app.delete("/api/client-folder-aliases/:originalClientName", async (req, res) => {
    try {
      const { originalClientName } = req.params;
      const success = await storage.deleteClientFolderAlias(decodeURIComponent(originalClientName));
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Folder alias not found" });
      }
    } catch (error) {
      console.error("Error deleting client folder alias:", error);
      res.status(500).json({ error: "Failed to delete folder alias" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
