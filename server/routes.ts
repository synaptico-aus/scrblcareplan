import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatParityRequestSchema, insertSavedCarePlanSchema } from "@shared/schema";
import { extractFactsFromTranscript, generateCarePlanHtml } from "./services/openai";
import { generateOfflineFactsExtraction, generateOfflineCarePlan } from "./services/carePlanGenerator";
import { z } from "zod";
import puppeteer from "puppeteer";

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

  const httpServer = createServer(app);
  return httpServer;
}
