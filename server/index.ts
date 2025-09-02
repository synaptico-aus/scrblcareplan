import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error for debugging
    log(`ERROR ${req.method} ${req.path} ${status}: ${message}`);
    
    // Don't re-throw in production to prevent server crashes in autoscale environment
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    
    // Only re-throw in development for debugging
    if (app.get("env") === "development") {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // For autoscale deployment compatibility, force port 3000
  // Override any environment PORT setting for better deployment compatibility
  const port = 3000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      log(`Port ${port} is already in use. Trying alternative ports...`);
      // Try ports 3001, 3002, etc. for development fallback
      const tryPort = (portToTry: number) => {
        if (portToTry > 3010) {
          log('Could not find an available port. Exiting.');
          process.exit(1);
        }
        server.listen({
          port: portToTry,
          host: "0.0.0.0",
          reusePort: true,
        }, () => {
          log(`serving on port ${portToTry}`);
        }).on('error', (retryErr: any) => {
          if (retryErr.code === 'EADDRINUSE') {
            tryPort(portToTry + 1);
          } else {
            throw retryErr;
          }
        });
      };
      tryPort(3001);
    } else {
      throw err;
    }
  });
  
  // Graceful shutdown for autoscale environment
  const gracefulShutdown = (signal: string) => {
    log(`Received ${signal}. Starting graceful shutdown...`);
    server.close((err) => {
      if (err) {
        log(`Error during shutdown: ${err.message}`);
        process.exit(1);
      }
      log('Server shut down successfully');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      log('Forcing shutdown...');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
