interface AppConfig {
  databaseUrl: string;
  sessionSecret: string;
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  ai: {
    enabled: boolean;
    apiKey: string;
    baseUrl: string | undefined;
  };
  googleDrive: {
    enabled: boolean;
    apiKey: string;
  };
  cors: {
    origins: string[];
  };
}

function validateConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }

  const sessionSecret = process.env.SESSION_SECRET || "airmanager-dev-secret-2024";
  if (!process.env.SESSION_SECRET) {
    console.warn("[config] WARNING: SESSION_SECRET not set — using default dev secret. Set a strong random secret in production.");
  }

  const portRaw = process.env.PORT || "5000";
  const port = parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(
      `PORT must be a valid integer between 1 and 65535. Got: "${portRaw}"`
    );
  }

  const aiApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "";
  const aiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined;
  const aiEnabled = Boolean(aiApiKey);
  if (!aiEnabled) {
    console.warn("[config] WARNING: AI_INTEGRATIONS_OPENAI_API_KEY not set — AI features will be unavailable.");
  }

  const googleDriveApiKey = process.env.GOOGLE_DRIVE_API_KEY || "";
  const googleDriveEnabled = Boolean(googleDriveApiKey);
  if (!googleDriveEnabled) {
    console.warn("[config] WARNING: GOOGLE_DRIVE_API_KEY not set — Google Drive import will be unavailable.");
  }

  const origins: string[] = [];
  if (isProduction) {
    const productionDomain = process.env.PRODUCTION_DOMAIN;
    if (productionDomain) {
      origins.push(productionDomain);
    } else {
      console.warn("[config] WARNING: PRODUCTION_DOMAIN not set in production — CORS will reject all cross-origin requests.");
    }
  } else {
    origins.push(`http://localhost:${port}`);
    origins.push(`http://0.0.0.0:${port}`);
  }

  return {
    databaseUrl,
    sessionSecret,
    port,
    nodeEnv,
    isProduction,
    ai: {
      enabled: aiEnabled,
      apiKey: aiApiKey,
      baseUrl: aiBaseUrl,
    },
    googleDrive: {
      enabled: googleDriveEnabled,
      apiKey: googleDriveApiKey,
    },
    cors: {
      origins,
    },
  };
}

export const config = validateConfig();
