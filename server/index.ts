import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { config } from "./config";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    correlationId: string;
  }
}

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.cors.origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests, please try again later." },
});

const driveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many Google Drive requests, please try again later." },
});

app.use("/api", generalLimiter);
app.use("/api/ai-chat", aiLimiter);
app.use("/api/properties/:id/ai-enrich", aiLimiter);
app.use("/api/gallery/import-drive", driveLimiter);

const PgStore = connectPgSimple(session);
app.use(
  session({
    store: new PgStore({
      conString: config.databaseUrl,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.isProduction,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

import { log, logStructured } from "./logger";
export { log, logStructured };

app.use((req, _res, next) => {
  req.correlationId = (req.headers["x-correlation-id"] as string) || randomUUID();
  next();
});

const LONG_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 30_000;

function isLongRunningPath(path: string): boolean {
  return path.includes("ai-enrich") || path.startsWith("/ai-chat/");
}

app.use("/api", (req, res, next) => {
  const timeout = isLongRunningPath(req.path) ? LONG_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  req.setTimeout(timeout);

  const timer = setTimeout(() => {
    if (!res.headersSent) {
      logStructured("error", {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        error: "Request timeout",
        timeoutMs: timeout,
      });
      res.status(504).json({ message: "Request timeout" });
    }
  }, timeout);

  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));
  next();
});

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

      if (res.statusCode >= 400) {
        logStructured("error", {
          correlationId: req.correlationId,
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs: duration,
          response: capturedJsonResponse,
        });
      } else {
        log(logLine);
      }
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: unknown, req: Request, res: Response, next: NextFunction): void => {
    const error = err as { status?: number; statusCode?: number; message?: string; stack?: string };
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    logStructured("error", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: status,
      error: message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });

    if (res.headersSent) {
      next(err);
      return;
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (config.isProduction) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  httpServer.listen(
    {
      port: config.port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${config.port}`);
    },
  );
})();
