import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { EventEmitter } from "events";
import passport from "passport";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { requireAuth, requireAdmin, requireSuperAdmin, getOrganizationId } from "./middleware/auth";
import { chatParityRequestSchema, insertSavedCarePlanSchema, insertClientDocumentSchema, insertClientFolderAliasSchema, updateClientFolderAliasSchema, loginSchema, signupSchema, createUserSchema, updateUserLimitSchema, type User } from "@shared/schema";
import { extractFactsFromTranscript, generateCarePlanHtml } from "./services/openai";
import { generateOfflineFactsExtraction, generateOfflineCarePlan } from "./services/carePlanGenerator";
import { z } from "zod";
import { ObjectStorageService } from "./objectStorage";
import { uploadFile, getFile, deleteFile, listFiles } from "./services/s3";
import multer from "multer";

// Event emitter for real-time updates
const eventEmitter = new EventEmitter();

const nottaUrlSchema = z.object({
  url: z.string().url()
});

// Configure multer for file uploads (store in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: "Invalid signup data",
        errors: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    try {
      const { email, password, firstName, lastName, organizationName } = result.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const organization = await storage.createOrganization({ name: organizationName });

      const user = await storage.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
        organizationId: organization.id,
        role: "admin",
      });

      req.login(user, (err) => {
        if (err) {
          console.error("Session login error after signup:", err);
          return res.status(500).json({ message: "Login failed after signup" });
        }
        res.json({ 
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: user.organizationId
          }
        });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Signup failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        console.error("Passport authentication error:", err);
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: user.organizationId
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as User;
      const session = req.session as any;
      
      res.json({
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
          monthlyPlanLimit: user.monthlyPlanLimit,
          plansGeneratedThisMonth: user.plansGeneratedThisMonth
        },
        impersonation: session.impersonatedUserId ? {
          isImpersonating: true,
          impersonatorId: session.impersonatorId,
          impersonatedUserId: session.impersonatedUserId
        } : {
          isImpersonating: false
        }
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

  // Impersonation routes (super admin only)
  app.post("/api/impersonation/start", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
      const superAdmin = req.user as User;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Fetch the target user
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Store impersonation state in session
      const session = req.session as any;
      session.impersonatorId = superAdmin.id;
      session.impersonatedUserId = targetUser.id;
      session.impersonationStartedAt = new Date().toISOString();
      
      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Audit log: Impersonation started
      console.log(JSON.stringify({
        event: "IMPERSONATION_START",
        timestamp: new Date().toISOString(),
        superAdminId: superAdmin.id,
        superAdminEmail: superAdmin.email,
        impersonatedUserId: targetUser.id,
        impersonatedUserEmail: targetUser.email,
        impersonatedUserOrg: targetUser.organizationId
      }));
      
      res.json({
        success: true,
        impersonatedUser: {
          id: targetUser.id,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          role: targetUser.role,
          organizationId: targetUser.organizationId,
          monthlyPlanLimit: targetUser.monthlyPlanLimit,
          plansGeneratedThisMonth: targetUser.plansGeneratedThisMonth
        }
      });
    } catch (error) {
      console.error("Error starting impersonation:", error);
      res.status(500).json({ message: "Failed to start impersonation" });
    }
  });

  app.post("/api/impersonation/stop", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      if (!session.impersonatedUserId) {
        return res.status(400).json({ message: "Not currently impersonating" });
      }
      
      const impersonatorId = session.impersonatorId;
      const impersonatedUserId = session.impersonatedUserId;
      
      // Clear impersonation state
      delete session.impersonatorId;
      delete session.impersonatedUserId;
      delete session.impersonationStartedAt;
      
      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Audit log: Impersonation stopped
      console.log(JSON.stringify({
        event: "IMPERSONATION_STOP",
        timestamp: new Date().toISOString(),
        superAdminId: impersonatorId,
        impersonatedUserId: impersonatedUserId
      }));
      
      // Fetch the original super admin user
      const superAdmin = await storage.getUser(impersonatorId);
      
      res.json({
        success: true,
        user: superAdmin ? {
          id: superAdmin.id,
          email: superAdmin.email,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          role: superAdmin.role,
          organizationId: superAdmin.organizationId,
          monthlyPlanLimit: superAdmin.monthlyPlanLimit,
          plansGeneratedThisMonth: superAdmin.plansGeneratedThisMonth
        } : null
      });
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      res.status(500).json({ message: "Failed to stop impersonation" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const user = req.user as User;
      const organizationId = getOrganizationId(req);
      
      // Super admins can see all users across all organizations
      const users = user.role === "super_admin" 
        ? await storage.getAllUsers()
        : await storage.getUsersByOrganization(organizationId);
      
      // Fetch organization names for all users
      const usersWithOrgNames = await Promise.all(
        users.map(async (u) => {
          const org = await storage.getOrganization(u.organizationId);
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            monthlyPlanLimit: u.monthlyPlanLimit,
            plansGeneratedThisMonth: u.plansGeneratedThisMonth,
            organizationId: u.organizationId,
            organizationName: org?.name || "Unknown",
            createdAt: u.createdAt,
            updatedAt: u.updatedAt
          };
        })
      );
      
      res.json(usersWithOrgNames);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const validatedData = createUserSchema.parse(req.body);
      const { email, password, firstName, lastName, role } = validatedData;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        organizationId,
        role,
      });

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors[0]?.message || "Validation failed" 
        });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Super admin route to update user monthly plan limits
  app.patch("/api/users/:userId/limit", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const validatedData = updateUserLimitSchema.parse({ ...req.body, userId });
      
      // Verify the target user exists (super admins can modify users across all organizations)
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUserLimit(userId, validatedData.monthlyPlanLimit);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        monthlyPlanLimit: updatedUser.monthlyPlanLimit,
        plansGeneratedThisMonth: updatedUser.plansGeneratedThisMonth,
        organizationId: updatedUser.organizationId
      });
    } catch (error) {
      console.error("Error updating user limit:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors[0]?.message || "Validation failed" 
        });
      }
      res.status(500).json({ message: "Failed to update user limit" });
    }
  });

  app.post("/api/fetch-notta", requireAuth, async (req, res) => {
    try {
      const { url } = nottaUrlSchema.parse(req.body);
      
      // First try simple HTTP fetch for better deployment compatibility
      let transcript = null;
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        if (response.ok) {
          const html = await response.text();
          
          // Enhanced transcript extraction patterns
          const patterns = [
            // Look for JSON data containing transcript
            /"transcript"\s*:\s*"([^"]{100,})"/i,
            /"content"\s*:\s*"([^"]{100,})"/i,
            // Look for data attributes
            /data-transcript="([^"]{100,})"/i,
            // Look for content in script tags
            /"text"\s*:\s*"([^"]{100,})"/i,
            // Look for plain text patterns
            /transcript[^<>{]*[:\-\s]+([^<>{]{100,})/i,
            // Look for meeting content
            /meeting[^<>{]*[:\-\s]+([^<>{]{100,})/i,
            // Look for dialogue patterns
            /\b[A-Z][a-z]+\s*:\s*([^<>{]{50,})/,
            // Look for time-stamped content
            /\d{1,2}:\d{2}[^<>]*([^<>{]{50,})/
          ];
          
          for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1] && match[1].trim().length > 100) {
              transcript = match[1].trim()
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\//g, '/')
                .substring(0, 10000); // Limit length
              break;
            }
          }
          
          // If no direct match, try extracting from visible text
          if (!transcript) {
            const textMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (textMatch) {
              const bodyContent = textMatch[1]
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (bodyContent.length > 200) {
                transcript = bodyContent.substring(0, 5000);
              }
            }
          }
        }
      } catch (fetchError) {
        // HTTP fetch failed, will try alternative extraction method
      }
      
      if (!transcript) {
        return res.status(400).json({ 
          message: "Could not automatically extract transcript from Notta.AI link. Please copy the transcript text directly from the Notta.AI page and paste it into the transcript field manually." 
        });
      }
      
      res.json({ transcript });
      
    } catch (error) {
      console.error("Error extracting Notta.AI transcript:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to extract transcript from Notta.AI" 
      });
    }
  });
  
  app.post("/api/chat-parity", requireAuth, async (req, res) => {
    try {
      const validatedData = chatParityRequestSchema.parse(req.body);
      const { clientName, transcript, template } = validatedData;
      const organizationId = getOrganizationId(req);
      const userId = req.user!.id;

      if (template !== "gold-standard") {
        return res.status(400).json({ 
          message: "Only 'gold-standard' template is supported" 
        });
      }

      // Check user's monthly plan limit
      const limitCheck = await storage.checkAndResetUserPlanCount(userId);
      if (!limitCheck.canGenerate) {
        return res.status(403).json({
          message: limitCheck.remainingPlans === 0 
            ? "You have reached your monthly care plan generation limit. Please contact your administrator."
            : "You have exceeded your monthly care plan generation limit.",
          remainingPlans: limitCheck.remainingPlans
        });
      }

      // Generate care plan using AI
      const [extractedFacts, generatedHtml] = await Promise.all([
        extractFactsFromTranscript(transcript, clientName),
        generateCarePlanHtml(transcript, clientName, organizationId)
      ]);

      // Store the analysis
      const analysis = await storage.createCareAnalysis(organizationId, {
        clientName,
        transcript,
        processingMode: "ai",
        extractedFacts,
        generatedHtml,
      });

      // Increment user's plan count after successful generation
      await storage.incrementUserPlanCount(userId);

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
  app.get("/api/generation-stream/:sessionId", requireAuth, (req, res) => {
    const sessionId = req.params.sessionId;
    
    // Set headers for SSE - Enhanced for deployment environments
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'keep-alive');
    // Remove wildcard CORS header for same-origin requests
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Send initial connection confirmation
    res.write('data: {"type":"connected","sessionId":"' + sessionId + '"}\n\n');
    
    // Force flush to ensure immediate delivery
    if ('flush' in res && typeof (res as any).flush === 'function') {
      (res as any).flush();
    }

    // Keep connection alive with more frequent pings for deployment
    const keepAlive = setInterval(() => {
      try {
        res.write('data: {"type":"ping"}\n\n');
        if ('flush' in res && typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      } catch (error) {
        console.error('Error sending ping:', error);
      }
    }, 15000); // Reduced from 30s to 15s for better deployment compatibility

    // Listen for updates for this session
    const updateHandler = (update: any) => {
      if (update.sessionId === sessionId) {
        try {
          res.write(`data: ${JSON.stringify(update)}\n\n`);
          if ('flush' in res && typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        } catch (error) {
          console.error('Error sending update:', error);
        }
      }
    };

    // Add listener
    eventEmitter.on('generation-update', updateHandler);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      eventEmitter.removeListener('generation-update', updateHandler);
    });

    // Handle connection errors
    req.on('error', () => {
      clearInterval(keepAlive);
      eventEmitter.removeListener('generation-update', updateHandler);
    });
  });

  // Job storage for async processing
  const asyncJobs = new Map();

  // Async processing endpoint for long transcripts
  app.post("/api/chat-parity-async", requireAuth, async (req, res) => {
    try {
      const validatedData = chatParityRequestSchema.parse(req.body);
      const { clientName, transcript, template, sessionId } = validatedData;
      const userId = req.user!.id;

      if (template !== "gold-standard") {
        return res.status(400).json({ 
          message: "Only 'gold-standard' template is supported" 
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          message: "sessionId is required for async generation"
        });
      }

      // Check user's monthly plan limit
      const limitCheck = await storage.checkAndResetUserPlanCount(userId);
      if (!limitCheck.canGenerate) {
        return res.status(403).json({
          message: limitCheck.remainingPlans === 0 
            ? "You have reached your monthly care plan generation limit. Please contact your administrator."
            : "You have exceeded your monthly care plan generation limit.",
          remainingPlans: limitCheck.remainingPlans
        });
      }

      // Estimate processing time to determine if async processing is needed
      const transcriptLength = transcript.length;
      const estimatedSeconds = Math.ceil(transcriptLength / 300); // Conservative estimate

      if (estimatedSeconds > 90) {
        // Long transcript - use async processing
        const jobId = `async_${sessionId}_${Date.now()}`;
        
        asyncJobs.set(jobId, {
          status: 'processing',
          progress: 0,
          startTime: Date.now(),
          clientName,
          transcriptLength,
          estimatedSeconds,
          sessionId,
          userId
        });

        // Start background processing (don't await)
        const organizationId = getOrganizationId(req);
        processAsyncJob(jobId, clientName, transcript, sessionId, organizationId, userId, asyncJobs, eventEmitter)
          .catch((error: Error) => {
            console.error(`Async job ${jobId} failed:`, error);
            asyncJobs.set(jobId, {
              ...asyncJobs.get(jobId),
              status: 'error',
              error: error.message,
              completedAt: Date.now()
            });
          });

        return res.json({
          jobId,
          status: 'processing',
          estimatedSeconds,
          message: `Long transcript detected (${Math.floor(transcriptLength/1000)}k chars). Processing asynchronously to avoid timeout.`,
          pollUrl: `/api/job-status/${jobId}`
        });
      } else {
        // Short transcript - process synchronously
        return res.status(400).json({
          message: 'Use /api/chat-parity-stream for shorter transcripts',
          estimatedSeconds,
          useStreaming: true
        });
      }

    } catch (error) {
      console.error("Error in async endpoint:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process request" 
      });
    }
  });

  // Job status endpoint
  app.get("/api/job-status/:jobId", requireAuth, (req, res) => {
    const { jobId } = req.params;
    const job = asyncJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const response = {
      ...job,
      elapsedSeconds: Math.floor((Date.now() - job.startTime) / 1000)
    };

    // Clean up completed jobs after 1 hour
    if (job.status === 'completed' && Date.now() - job.completedAt > 3600000) {
      asyncJobs.delete(jobId);
    }

    res.json(response);
  });

  // New streaming generation endpoint  
  app.post("/api/chat-parity-stream", requireAuth, async (req, res) => {
    try {
      const validatedData = chatParityRequestSchema.parse(req.body);
      const { clientName, transcript, template, sessionId } = validatedData;
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);

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

      // Check user's monthly plan limit
      const limitCheck = await storage.checkAndResetUserPlanCount(userId);
      if (!limitCheck.canGenerate) {
        return res.status(403).json({
          message: limitCheck.remainingPlans === 0 
            ? "You have reached your monthly care plan generation limit. Please contact your administrator."
            : "You have exceeded your monthly care plan generation limit.",
          remainingPlans: limitCheck.remainingPlans
        });
      }

      // Check for potential timeout risk in streaming
      const transcriptLength = transcript.length;
      const estimatedSeconds = Math.ceil(transcriptLength / 300);
      
      if (estimatedSeconds > 90) {
        return res.status(400).json({
          error: 'Transcript too long for streaming',
          transcriptLength,
          estimatedSeconds,
          message: 'Please use the async endpoint /api/chat-parity-async for long transcripts',
          useAsync: true
        });
      }

      // Send initial update with proper delays for visibility
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Initializing AI care planning agent',
        step: 1,
        totalSteps: 8
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Connecting to Knowledge Bank',
        step: 2,
        totalSteps: 8
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 1: Extract facts
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Analyzing transcript for key client information',
        step: 3,
        totalSteps: 8
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Extracting medical history, support networks, and risk factors',
        step: 4,
        totalSteps: 8
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const extractedFacts = await extractFactsFromTranscript(transcript, clientName);

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Facts extraction complete - proceeding to care plan generation',
        step: 5,
        totalSteps: 8
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Generate care plan
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Generating Gold Standard Care Plan using Australian Aged Care standards',
        step: 6,
        totalSteps: 8
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Applying Support at Home Program requirements and SMARTA goal principles',
        step: 7,
        totalSteps: 8
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const generatedHtml = await generateCarePlanHtml(transcript, clientName, organizationId);

      // Step 3: Store analysis
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Finalizing care plan and saving to database',
        step: 8,
        totalSteps: 8
      });

      const analysis = await storage.createCareAnalysis(organizationId, {
        clientName,
        transcript,
        processingMode: "ai",
        extractedFacts,
        generatedHtml,
      });

      // Increment user's plan count after successful generation
      await storage.incrementUserPlanCount(userId);

      // Send completion
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'complete',
        message: 'Care plan generation complete!',
        step: 8,
        totalSteps: 8,
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

  app.post("/api/offline-analysis", requireAuth, async (req, res) => {
    try {
      const validatedData = chatParityRequestSchema.parse(req.body);
      const { clientName, transcript } = validatedData;
      const userId = req.user!.id;
      const organizationId = getOrganizationId(req);

      // Check user's monthly plan limit
      const limitCheck = await storage.checkAndResetUserPlanCount(userId);
      if (!limitCheck.canGenerate) {
        return res.status(403).json({
          message: limitCheck.remainingPlans === 0 
            ? "You have reached your monthly care plan generation limit. Please contact your administrator."
            : "You have exceeded your monthly care plan generation limit.",
          remainingPlans: limitCheck.remainingPlans
        });
      }

      // Generate care plan using offline processing
      const extractedFacts = generateOfflineFactsExtraction(transcript, clientName);
      const generatedHtml = generateOfflineCarePlan(transcript, clientName);

      // Store the analysis
      const analysis = await storage.createCareAnalysis(organizationId, {
        clientName,
        transcript,
        processingMode: "offline",
        extractedFacts,
        generatedHtml,
      });

      // Increment user's plan count after successful generation
      await storage.incrementUserPlanCount(userId);

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

  app.get("/api/analysis/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = getOrganizationId(req);
      const analysis = await storage.getCareAnalysis(organizationId, id);
      
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

  app.get("/api/client/:clientName/analyses", requireAuth, async (req, res) => {
    try {
      const { clientName } = req.params;
      const organizationId = getOrganizationId(req);
      const analyses = await storage.getCareAnalysesByClient(organizationId, clientName);
      
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching client analyses:", error);
      res.status(500).json({ 
        message: "Failed to fetch client analyses" 
      });
    }
  });

  // Saved Care Plans routes
  app.post("/api/saved-care-plans", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSavedCarePlanSchema.parse(req.body);
      const organizationId = getOrganizationId(req);
      const savedCarePlan = await storage.createSavedCarePlan(organizationId, validatedData);
      
      res.json(savedCarePlan);
    } catch (error) {
      console.error("Error saving care plan:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to save care plan" 
      });
    }
  });

  app.get("/api/saved-care-plans", requireAuth, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const savedCarePlans = await storage.getSavedCarePlans(organizationId);
      res.json(savedCarePlans);
    } catch (error) {
      console.error("Error fetching saved care plans:", error);
      res.status(500).json({ 
        message: "Failed to fetch saved care plans" 
      });
    }
  });

  app.get("/api/saved-care-plans/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = getOrganizationId(req);
      const savedCarePlan = await storage.getSavedCarePlan(organizationId, id);
      
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

  app.delete("/api/saved-care-plans/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = getOrganizationId(req);
      const deleted = await storage.deleteSavedCarePlan(organizationId, id);
      
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
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
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
  app.get("/objects/:objectPath(*)", requireAuth, async (req, res) => {
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
  app.get("/api/documents/download", requireAuth, async (req, res) => {
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
  
  // Client document routes - using S3
  app.post("/api/client-documents", requireAuth, upload.single('file'), async (req, res) => {
    let s3Key: string | null = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // STEP 1: Validate request metadata BEFORE uploading to S3
      const validatedData = insertClientDocumentSchema.parse({
        clientName: req.body.clientName,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        objectPath: '', // Will be set after S3 upload
        description: req.body.description?.trim() || undefined,
      });

      // STEP 2: Generate S3 key for the file
      const timestamp = Date.now();
      s3Key = `client-documents/${validatedData.clientName}/${timestamp}-${req.file.originalname}`;

      // STEP 3: Upload file to S3 (only after validation succeeds)
      await uploadFile(s3Key, req.file.buffer, req.file.mimetype);

      // STEP 4: Store in database with the S3 path
      validatedData.objectPath = s3Key;
      const organizationId = getOrganizationId(req);
      const document = await storage.createClientDocument(organizationId, validatedData);
      
      res.status(201).json(document);
    } catch (error) {
      // Clean up orphaned S3 object if upload succeeded but database storage failed
      if (s3Key) {
        try {
          await deleteFile(s3Key);
        } catch (cleanupError) {
          console.error(`Failed to clean up S3 object ${s3Key}:`, cleanupError);
        }
      }
      
      console.error("Error uploading client document:", error);
      
      // Return proper HTTP status codes
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed",
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload document" 
      });
    }
  });
  
  app.get("/api/client-documents/:clientName", requireAuth, async (req, res) => {
    try {
      const { clientName } = req.params;
      const organizationId = getOrganizationId(req);
      const documents = await storage.getClientDocuments(organizationId, decodeURIComponent(clientName));
      res.json(documents);
    } catch (error) {
      console.error("Error fetching client documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });
  
  app.get("/api/client-documents", requireAuth, async (req, res) => {
    try {
      // List all documents from database
      const organizationId = getOrganizationId(req);
      const documents = await storage.getAllClientDocuments(organizationId);
      
      // Optionally, we could also list files from S3 to verify consistency
      // const s3Files = await listFiles('client-documents/');
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching all client documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });
  
  // Get individual document file from S3 by ID
  app.get("/api/client-documents/download/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = getOrganizationId(req);
      
      // Get document metadata from database
      const documents = await storage.getAllClientDocuments(organizationId);
      const document = documents.find(doc => doc.id === id);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Get file from S3
      const fileBuffer = await getFile(document.objectPath);

      // Set appropriate headers for download
      res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      // Send the file
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error downloading client document from S3:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to download document" 
      });
    }
  });
  
  app.delete("/api/client-documents/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = getOrganizationId(req);
      
      // First, get the document to retrieve the S3 key
      const documents = await storage.getAllClientDocuments(organizationId);
      const document = documents.find(doc => doc.id === id);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete from S3
      await deleteFile(document.objectPath);

      // Delete from database
      const success = await storage.deleteClientDocument(organizationId, id);
      
      if (success) {
        res.json({ message: "Document deleted successfully" });
      } else {
        res.status(404).json({ error: "Document not found in database" });
      }
    } catch (error) {
      console.error("Error deleting client document:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to delete document" 
      });
    }
  });
  
  // Client folder alias routes
  app.post("/api/client-folder-aliases", requireAuth, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const validatedData = insertClientFolderAliasSchema.parse(req.body);
      
      // Check if alias already exists
      const existing = await storage.getClientFolderAlias(organizationId, validatedData.originalClientName);
      if (existing) {
        return res.status(409).json({ error: "Folder alias already exists for this client" });
      }
      
      const alias = await storage.createClientFolderAlias(organizationId, validatedData);
      res.status(201).json(alias);
    } catch (error) {
      console.error("Error creating client folder alias:", error);
      res.status(500).json({ error: "Failed to create folder alias" });
    }
  });
  
  app.get("/api/client-folder-aliases/:originalClientName", requireAuth, async (req, res) => {
    try {
      const { originalClientName } = req.params;
      const organizationId = getOrganizationId(req);
      const alias = await storage.getClientFolderAlias(organizationId, decodeURIComponent(originalClientName));
      
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
  
  app.get("/api/client-folder-aliases", requireAuth, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const aliases = await storage.getAllClientFolderAliases(organizationId);
      res.json(aliases);
    } catch (error) {
      console.error("Error fetching all client folder aliases:", error);
      res.status(500).json({ error: "Failed to fetch folder aliases" });
    }
  });
  
  app.put("/api/client-folder-aliases/:originalClientName", requireAuth, async (req, res) => {
    try {
      const { originalClientName } = req.params;
      const organizationId = getOrganizationId(req);
      const validatedData = updateClientFolderAliasSchema.parse(req.body);
      
      // Check if alias exists first, if not create it
      const existing = await storage.getClientFolderAlias(organizationId, decodeURIComponent(originalClientName));
      
      if (!existing) {
        // Create new alias
        const newAlias = await storage.createClientFolderAlias(organizationId, {
          originalClientName: decodeURIComponent(originalClientName),
          displayName: validatedData.displayName
        });
        return res.status(201).json(newAlias);
      }
      
      // Update existing alias
      const updated = await storage.updateClientFolderAlias(organizationId, decodeURIComponent(originalClientName), validatedData);
      
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
  
  app.delete("/api/client-folder-aliases/:originalClientName", requireAuth, async (req, res) => {
    try {
      const { originalClientName } = req.params;
      const organizationId = getOrganizationId(req);
      const success = await storage.deleteClientFolderAlias(organizationId, decodeURIComponent(originalClientName));
      
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

  // Service Rates endpoints
  app.get("/api/service-rates", requireAuth, requireAdmin, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const rates = await storage.getServiceRates(organizationId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching service rates:", error);
      res.status(500).json({ error: "Failed to fetch service rates" });
    }
  });

  app.put("/api/service-rates/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = getOrganizationId(req);
      
      // Validate and coerce hourlyRate to number or null
      const rateSchema = z.object({
        hourlyRate: z.union([
          z.string().transform(val => {
            const trimmed = val.trim();
            if (trimmed === '') return null;
            const parsed = parseFloat(trimmed);
            if (isNaN(parsed)) throw new Error('Invalid number');
            return parsed;
          }),
          z.number(),
          z.null()
        ]).nullable()
      });
      
      const { hourlyRate } = rateSchema.parse(req.body);
      
      const updated = await storage.updateServiceRate(organizationId, id, { 
        hourlyRate 
      });
      
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ error: "Service rate not found" });
      }
    } catch (error) {
      console.error("Error updating service rate:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid hourly rate format" });
      }
      res.status(500).json({ error: "Failed to update service rate" });
    }
  });

  // Billing Profile endpoints (Admin only)
  app.get("/api/billing-profile", requireAuth, requireAdmin, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const profile = await storage.getBillingProfile(organizationId);
      
      if (profile) {
        res.json(profile);
      } else {
        res.status(404).json({ error: "Billing profile not found" });
      }
    } catch (error) {
      console.error("Error fetching billing profile:", error);
      res.status(500).json({ error: "Failed to fetch billing profile" });
    }
  });

  app.post("/api/billing-profile", requireAuth, requireAdmin, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const { insertBillingProfileSchema } = await import("@shared/schema");
      
      const validatedData = insertBillingProfileSchema.parse(req.body);
      const profile = await storage.createBillingProfile(organizationId, validatedData);
      
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating billing profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid billing profile data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create billing profile" });
    }
  });

  app.put("/api/billing-profile", requireAuth, requireAdmin, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req);
      const { updateBillingProfileSchema } = await import("@shared/schema");
      
      const validatedData = updateBillingProfileSchema.parse(req.body);
      const updated = await storage.updateBillingProfile(organizationId, validatedData);
      
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ error: "Billing profile not found" });
      }
    } catch (error) {
      console.error("Error updating billing profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid billing profile data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update billing profile" });
    }
  });

  const httpServer = createServer(app);
  // Async job processing function
  async function processAsyncJob(
    jobId: string, 
    clientName: string, 
    transcript: string, 
    sessionId: string, 
    organizationId: string,
    userId: string,
    asyncJobs: Map<string, any>, 
    eventEmitter: any
  ) {
    try {
      // Update job progress
      asyncJobs.set(jobId, {
        ...asyncJobs.get(jobId),
        status: 'extracting_facts',
        progress: 10
      });

      // Send progress update via event emitter
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Starting background processing for long transcript',
        step: 1,
        totalSteps: 8,
        jobId
      });

      // Step 1: Extract facts
      asyncJobs.set(jobId, { ...asyncJobs.get(jobId), progress: 25 });
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Extracting facts from long transcript',
        step: 3,
        totalSteps: 8,
        jobId
      });

      const extractedFacts = await extractFactsFromTranscript(transcript, clientName, (progress, stage) => {
        // Update async job with detailed progress from fact extraction
        const adjustedProgress = 10 + (progress * 0.4); // 10% to 50% of total progress
        asyncJobs.set(jobId, {
          ...asyncJobs.get(jobId),
          progress: adjustedProgress,
          currentStage: stage
        });
        
        eventEmitter.emit('generation-update', {
          sessionId,
          type: 'action',
          action: stage,
          progress: adjustedProgress,
          jobId
        });
      });

      // Step 2: Generate care plan
      asyncJobs.set(jobId, { 
        ...asyncJobs.get(jobId), 
        status: 'generating_care_plan',
        progress: 50 
      });
      
      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Generating care plan for long transcript',
        step: 6,
        totalSteps: 8,
        jobId
      });

      const generatedHtml = await generateCarePlanHtml(transcript, clientName, organizationId, (progress, stage) => {
        // Update async job with detailed progress from care plan generation  
        const adjustedProgress = 50 + (progress * 0.4); // 50% to 90% of total progress
        asyncJobs.set(jobId, {
          ...asyncJobs.get(jobId),
          progress: adjustedProgress,
          currentStage: stage
        });
        
        eventEmitter.emit('generation-update', {
          sessionId,
          type: 'action',
          action: stage,
          progress: adjustedProgress,
          jobId
        });
      });

      // Step 3: Store analysis
      asyncJobs.set(jobId, { 
        ...asyncJobs.get(jobId), 
        status: 'storing_results',
        progress: 90 
      });

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'action',
        action: 'Saving care plan to database',
        step: 8,
        totalSteps: 8,
        jobId
      });

      const analysis = await storage.createCareAnalysis(organizationId, {
        clientName,
        transcript,
        processingMode: "ai",
        extractedFacts,
        generatedHtml,
      });

      // Increment user's plan count after successful generation
      await storage.incrementUserPlanCount(userId);

      // Complete job
      asyncJobs.set(jobId, {
        ...asyncJobs.get(jobId),
        status: 'completed',
        progress: 100,
        completedAt: Date.now(),
        result: {
          html: generatedHtml,
          facts: extractedFacts,
          analysisId: analysis.id
        }
      });

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'complete',
        message: 'Long transcript processing completed successfully!',
        step: 8,
        totalSteps: 8,
        jobId,
        result: {
          html: generatedHtml,
          facts: extractedFacts,
          analysisId: analysis.id
        }
      });

    } catch (error) {
      console.error(`Async job ${jobId} processing error:`, error);
      
      asyncJobs.set(jobId, {
        ...asyncJobs.get(jobId),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: Date.now()
      });

      eventEmitter.emit('generation-update', {
        sessionId,
        type: 'error',
        message: `Async processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        jobId
      });

      throw error;
    }
  }

  // Serve public user guide (sanitized, no proprietary information)
  app.get("/api/user-guide", async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const guidePath = path.join(process.cwd(), 'USER_GUIDE_PUBLIC.md');
      const content = await fs.readFile(guidePath, 'utf-8');
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(content);
    } catch (error) {
      console.error("Error reading USER_GUIDE_PUBLIC.md:", error);
      res.status(500).json({ message: "Failed to load user guide" });
    }
  });

  return httpServer;
}
