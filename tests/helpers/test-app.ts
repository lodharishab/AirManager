import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import { registerRoutes } from "../../server/routes";

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

export async function createTestApp() {
  const app = express();

  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.correlationId = "test-correlation-id";
    next();
  });

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return { app, httpServer };
}
