import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { randomUUID } from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { config } from "./config";
import { startFollowUpScheduler } from "./followups/engine";
import { startPricingScheduler } from "./pricing/engine";
import { startTicketTriageScheduler } from "./tickets/engine";

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
app.disable("x-powered-by");
// Behind a reverse proxy (nginx/caddy) set TRUST_PROXY=1 so rate limits & secure cookies use real client IPs.
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}
// Security headers. CSP left off: the React bundle needs inline bootstrap; enable with a policy once audited.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
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

// Credential endpoints get a deliberately tight limit: the generic API limiter
// (200 req / 15 min) is far too loose for online password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts, please try again later." },
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/ai-chat", aiLimiter);
app.use("/api/properties/:id/ai-enrich", aiLimiter);
app.use("/api/gallery/import-drive", driveLimiter);

const PgStore = connectPgSimple(session);
const cookieSecure = process.env.COOKIE_SECURE === "true"
  ? true
  : process.env.COOKIE_SECURE === "false"
    ? false
    : config.isProduction;
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
      secure: cookieSecure,
      httpOnly: true,
      sameSite: "lax",
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
  res.on("finish", () => {
    if (path.startsWith("/api")) logStructured(res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info", {
      correlationId: req.correlationId, method: req.method, path,
      statusCode: res.statusCode, durationMs: Date.now() - start,
    });
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);
  app.use("/api", (_req, res) => { res.status(404).json({ message: "API route not found" }); });

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

    res.status(status).json({ message: status >= 500 && config.isProduction ? "An unexpected error occurred. Please try again." : message });
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
      host: process.env.HOST || "127.0.0.1",
      reusePort: true,
    },
    () => {
      log(`serving on port ${config.port}`);
      const schedulers: NodeJS.Timeout[] = [
        startFollowUpScheduler(),
        startPricingScheduler(),
        startTicketTriageScheduler(),
      ];

      let shuttingDown = false;
      const shutdown = (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        log(`${signal} received — shutting down gracefully`);
        schedulers.forEach((t) => clearInterval(t));
        httpServer.close(() => {
          import("./db")
            .then(({ pool }) => pool.end())
            .catch(() => {})
            .finally(() => process.exit(0));
        });
        // Force-exit if connections hang around.
        setTimeout(() => process.exit(0), 10_000).unref();
      };
      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGINT", () => shutdown("SIGINT"));
    },
  );
})();
