import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import bcrypt from "bcrypt";
import multer from "multer";
import { storage } from "./storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { logStructured } from "./logger";
import {
  properties, rooms, bookings, conversations, messages,
  revenueData, galleryImages, enquiries, reviews,
  expenses, housekeepingTasks, notifications, userPreferences, guests,
  insertPropertySchema,
  insertRoomSchema,
  insertPropertyLinkSchema,
  insertBookingSchema,
  insertMessageSchema,
  insertConversationSchema,
  insertGalleryImageSchema,
  insertExpenseSchema,
  insertEnquirySchema,
  insertReviewSchema,
  expenseCategories,
  insertHousekeepingTaskSchema,
  insertNotificationSchema,
  insertGuestSchema,
} from "@shared/schema";
import { generateIcal, parseIcal } from "./ical";
import crypto from "crypto";
import dns from "dns/promises";
import net from "net";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { importFromGoogleDrive, extractFolderId } from "./google-drive";
import { config } from "./config";
import {
  sendEmail,
  buildCheckInReminderEmail,
  buildNewEnquiryEmail,
  buildBookingConfirmationEmail,
  buildOverdueTaskEmail,
} from "./email";
import { uploadImage, deleteImage, getImageBuffer, validateImageFile, isObjectStorageUrl, getMimeType } from "./object-storage";
import { getAiConfig, saveAiConfig, testAiConnection, AI_PROVIDERS, type AiProvider } from "./ai/gateway";
import { runFollowUpSweep } from "./followups/engine";
import { runPricingRecommendations, approvePriceRecommendation, rejectPriceRecommendation } from "./pricing/engine";
import { insertFollowUpRuleSchema } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const openai = config.ai.enabled
  ? new OpenAI({
      apiKey: config.ai.apiKey,
      baseURL: config.ai.baseUrl,
    })
  : null;

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logStructured("error", {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        error: err.message,
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
      });
      next(err);
    });
  };
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "vbscript:"];

function isUrlSafe(url: string): { valid: boolean; message?: string } {
  try {
    const urlObj = new URL(url);
    if (DANGEROUS_PROTOCOLS.includes(urlObj.protocol)) {
      return { valid: false, message: "Dangerous URL protocol is not allowed" };
    }
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { valid: false, message: "Only http and https URLs are allowed" };
    }
    return { valid: true };
  } catch {
    return { valid: false, message: "Invalid URL format" };
  }
}

const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "metadata.google.internal", "169.254.169.254"];

function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1") return true;
    if (normalized.startsWith("fe80:")) return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized === "::") return true;
    return false;
  }
  return false;
}

function isUrlPublic(url: string): { valid: boolean; message?: string } {
  const baseCheck = isUrlSafe(url);
  if (!baseCheck.valid) return baseCheck;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return { valid: false, message: "Internal URLs are not allowed" };
    }
    if (net.isIP(hostname) && isPrivateIP(hostname)) {
      return { valid: false, message: "Private network URLs are not allowed" };
    }
    return { valid: true };
  } catch {
    return { valid: false, message: "Invalid URL format" };
  }
}

async function resolveAndValidateHost(hostname: string): Promise<{ valid: boolean; message?: string }> {
  if (BLOCKED_HOSTS.includes(hostname.toLowerCase())) {
    return { valid: false, message: "Internal URLs are not allowed" };
  }
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      return { valid: false, message: "Private network URLs are not allowed" };
    }
    return { valid: true };
  }
  try {
    const addresses = await dns.resolve4(hostname);
    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        return { valid: false, message: "URL resolves to a private network address" };
      }
    }
  } catch {
    try {
      const addresses = await dns.resolve6(hostname);
      for (const addr of addresses) {
        if (isPrivateIP(addr)) {
          return { valid: false, message: "URL resolves to a private network address" };
        }
      }
    } catch {
      return { valid: false, message: "Unable to resolve hostname" };
    }
  }
  return { valid: true };
}

async function safeFetchIcal(url: string): Promise<{ ok: true; data: string } | { ok: false; message: string }> {
  const MAX_REDIRECTS = 5;
  const MAX_SIZE = 5 * 1024 * 1024;
  let currentUrl = url;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const urlObj = new URL(currentUrl);
    const hostCheck = await resolveAndValidateHost(urlObj.hostname);
    if (!hostCheck.valid) {
      return { ok: false, message: hostCheck.message! };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timeout);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return { ok: false, message: "Redirect without location header" };
        }
        const redirectUrl = new URL(location, currentUrl).toString();
        const redirectSafe = isUrlPublic(redirectUrl);
        if (!redirectSafe.valid) {
          return { ok: false, message: `Redirect blocked: ${redirectSafe.message}` };
        }
        currentUrl = redirectUrl;
        continue;
      }

      if (!response.ok) {
        return { ok: false, message: `Failed to fetch calendar: ${response.status}` };
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > MAX_SIZE) {
        return { ok: false, message: "Calendar file too large" };
      }

      const data = await response.text();
      if (data.length > MAX_SIZE) {
        return { ok: false, message: "Calendar file too large" };
      }
      return { ok: true, data };
    } catch (e: any) {
      clearTimeout(timeout);
      return { ok: false, message: `Failed to fetch calendar: ${e.message}` };
    }
  }

  return { ok: false, message: "Too many redirects" };
}

type EmailEventType = "booking" | "enquiry" | "check_in" | "overdue_task";

async function trySendNotificationEmail(
  emailData: { subject: string; html: string },
  eventType: EmailEventType,
  userId?: number
): Promise<void> {
  try {
    const prefRows = userId
      ? await db.select().from(userPreferences).where(eq(userPreferences.userId, userId))
      : await db.select().from(userPreferences);

    for (const prefs of prefRows) {
      if (!prefs.emailNotifications || !prefs.notificationEmail) continue;

      if (eventType === "booking" && !prefs.bookingAlerts) continue;
      if (eventType === "enquiry" && !prefs.messageAlerts) continue;

      sendEmail(prefs.notificationEmail, emailData.subject, emailData.html).catch(() => {});
    }
  } catch (err) {
    logStructured("warn", {
      context: "email",
      message: "Failed to query user preferences for email notification",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const SSE_MAX_DURATION_MS = 120_000;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/health", async (_req, res) => {
    const startTime = process.uptime();
    let dbStatus = "disconnected";
    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(startTime),
      database: dbStatus,
    });
  });

  // --- Auth routes (public) ---
  app.post("/api/auth/register", asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    if (username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ message: "Username already taken" });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await storage.createUser({ username, password: hashed });
    req.session.userId = user.id;
    res.status(201).json({ id: user.id, username: user.username });
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username });
  }));

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", asyncHandler(async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ id: user.id, username: user.username });
  }));

  app.get("/api/properties/:id/calendar.ics", asyncHandler(async (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }
    const property = await storage.getPropertyByIcalToken(token);
    if (!property || property.id !== Number(req.params.id)) {
      return res.status(404).json({ message: "Not found" });
    }
    const propertyBookings = await storage.getBookingsByProperty(property.id);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const ical = generateIcal(propertyBookings, property, baseUrl);
    res.set("Content-Type", "text/calendar; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="${property.name.replace(/[^a-zA-Z0-9]/g, "_")}.ics"`);
    res.send(ical);
  }));

  app.get("/api/uploads/:filename", asyncHandler(async (req, res) => {
    const objectName = "uploads/" + req.params.filename;
    const buffer = await getImageBuffer(objectName);
    if (!buffer) {
      return res.status(404).json({ message: "Image not found" });
    }
    res.set("Content-Type", getMimeType(objectName));
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buffer);
  }));

  // Protect all remaining /api routes
  app.use("/api", requireAuth);

  app.get("/api/settings/ai", asyncHandler(async (req, res) => {
    const cfg = await getAiConfig();
    const maskedKey = cfg.apiKey
      ? `••••${cfg.apiKey.slice(-4)}`
      : "";
    res.json({
      provider: cfg.provider,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      hasApiKey: Boolean(cfg.apiKey),
      maskedApiKey: maskedKey,
    });
  }));

  app.put("/api/settings/ai", asyncHandler(async (req, res) => {
    const body = req.body as Partial<{
      provider: string;
      baseUrl: string;
      apiKey: string;
      model: string;
    }>;
    if (body.provider !== undefined && !AI_PROVIDERS.includes(body.provider as AiProvider)) {
      return res.status(400).json({ message: `Unknown provider: ${body.provider}` });
    }
    const cfg = await saveAiConfig({
      provider: body.provider as AiProvider | undefined,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      model: body.model,
    });
    res.json({
      provider: cfg.provider,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      hasApiKey: Boolean(cfg.apiKey),
      maskedApiKey: cfg.apiKey ? `••••${cfg.apiKey.slice(-4)}` : "",
    });
  }));

  app.post("/api/settings/ai/test", asyncHandler(async (req, res) => {
    const cfg = await getAiConfig();
    const result = await testAiConnection(cfg);
    res.json(result);
  }));

  app.get("/api/follow-up-rules", asyncHandler(async (req, res) => {
    res.json(await storage.getFollowUpRules());
  }));

  app.post("/api/follow-up-rules", asyncHandler(async (req, res) => {
    const parsed = insertFollowUpRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid follow-up rule", errors: parsed.error.flatten() });
    }
    res.json(await storage.createFollowUpRule(parsed.data));
  }));

  app.patch("/api/follow-up-rules/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = insertFollowUpRuleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid rule update", errors: parsed.error.flatten() });
    }
    const rule = await storage.updateFollowUpRule(id, parsed.data);
    if (!rule) return res.status(404).json({ message: "Rule not found" });
    res.json(rule);
  }));

  app.delete("/api/follow-up-rules/:id", asyncHandler(async (req, res) => {
    await storage.deleteFollowUpRule(Number(req.params.id));
    res.json({ ok: true });
  }));

  app.get("/api/follow-ups", asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const allowed = ["pending", "sent", "failed", "cancelled"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ message: `Invalid status filter: ${status}` });
    }
    res.json(await storage.getFollowUps(status));
  }));

  app.get("/api/follow-ups/stats", asyncHandler(async (req, res) => {
    res.json(await storage.getFollowUpStats());
  }));

  app.post("/api/follow-ups/run", asyncHandler(async (req, res) => {
    res.json(await runFollowUpSweep());
  }));

  app.post("/api/follow-ups/:id/cancel", asyncHandler(async (req, res) => {
    const followUp = await storage.updateFollowUp(Number(req.params.id), { status: "cancelled" });
    if (!followUp) return res.status(404).json({ message: "Follow-up not found" });
    res.json(followUp);
  }));

  app.get("/api/price-recommendations", asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const allowed = ["pending", "approved", "rejected", "superseded"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ message: `Invalid status filter: ${status}` });
    }
    res.json(await storage.getPriceRecommendations(status));
  }));

  app.post("/api/price-recommendations/run", asyncHandler(async (req, res) => {
    res.json(await runPricingRecommendations());
  }));

  app.post("/api/price-recommendations/:id/approve", asyncHandler(async (req, res) => {
    const rec = await approvePriceRecommendation(Number(req.params.id));
    if (!rec) return res.status(404).json({ message: "Recommendation not found" });
    res.json(rec);
  }));

  app.post("/api/price-recommendations/:id/reject", asyncHandler(async (req, res) => {
    const rec = await rejectPriceRecommendation(Number(req.params.id));
    if (!rec) return res.status(404).json({ message: "Recommendation not found" });
    res.json(rec);
  }));

  app.post("/api/upload", upload.array("files", 20), asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files provided" });
    }

    const results: { url: string; originalName: string }[] = [];
    const errors: { file: string; error: string }[] = [];

    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        errors.push({ file: file.originalname, error: validationError });
        continue;
      }
      try {
        const objectName = await uploadImage(file.buffer, file.originalname, file.mimetype);
        const url = `/api/${objectName}`;
        results.push({ url, originalName: file.originalname });
      } catch (err: any) {
        errors.push({ file: file.originalname, error: err.message || "Upload failed" });
      }
    }

    res.json({ uploaded: results, errors });
  }));

  app.patch("/api/auth/profile", asyncHandler(async (req, res) => {
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ message: "Username is required" });
    }
    if (username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }
    const existing = await storage.getUserByUsername(username);
    if (existing && existing.id !== req.session.userId) {
      return res.status(409).json({ message: "Username already taken" });
    }
    const updated = await storage.updateUser(req.session.userId!, { username });
    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ id: updated.id, username: updated.username });
  }));

  app.patch("/api/auth/password", asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await storage.updateUser(user.id, { password: hashed });
    res.json({ message: "Password updated successfully" });
  }));

  app.get("/api/user-preferences", asyncHandler(async (req, res) => {
    const prefs = await storage.getUserPreferences(req.session.userId!);
    if (!prefs) {
      const created = await storage.upsertUserPreferences(req.session.userId!, {});
      return res.json(created);
    }
    res.json(prefs);
  }));

  app.patch("/api/user-preferences", asyncHandler(async (req, res) => {
    const { emailNotifications, pushNotifications, bookingAlerts, messageAlerts, notificationEmail } = req.body;
    const data: Record<string, any> = {};
    if (typeof emailNotifications === "boolean") data.emailNotifications = emailNotifications;
    if (typeof pushNotifications === "boolean") data.pushNotifications = pushNotifications;
    if (typeof bookingAlerts === "boolean") data.bookingAlerts = bookingAlerts;
    if (typeof messageAlerts === "boolean") data.messageAlerts = messageAlerts;
    if (typeof notificationEmail === "string") {
      const trimmed = notificationEmail.trim();
      if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return res.status(400).json({ message: "Invalid email address format" });
      }
      data.notificationEmail = trimmed || null;
    }
    const updated = await storage.upsertUserPreferences(req.session.userId!, data);
    res.json(updated);
  }));

  app.get("/api/properties", asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string | undefined;
    const result = await storage.getProperties({ page, limit, search });
    res.json(result);
  }));

  app.get("/api/properties/:id", asyncHandler(async (req, res) => {
    const property = await storage.getProperty(Number(req.params.id));
    if (!property) return res.status(404).json({ message: "Property not found" });
    const links = await storage.getPropertyLinks(property.id);
    const allBookings = await storage.getAllBookings();
    const propertyBookings = allBookings.filter(b => b.propertyId === property.id);
    const rooms = await storage.getRoomsByProperty(property.id);
    const externalCalendars = await storage.getExternalCalendars(property.id);
    res.json({ ...property, links, bookings: propertyBookings, rooms, externalCalendars });
  }));

  app.post("/api/properties", asyncHandler(async (req, res) => {
    const parsed = insertPropertySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const property = await storage.createProperty(parsed.data);
    res.status(201).json(property);
  }));

  app.patch("/api/properties/:id", asyncHandler(async (req, res) => {
    const parsed = insertPropertySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateProperty(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Property not found" });
    res.json(updated);
  }));

  app.delete("/api/properties/:id", asyncHandler(async (req, res) => {
    await storage.deleteProperty(Number(req.params.id));
    res.status(204).send();
  }));

  app.get("/api/properties/:id/links", asyncHandler(async (req, res) => {
    const links = await storage.getPropertyLinks(Number(req.params.id));
    res.json(links);
  }));

  app.post("/api/properties/:id/links", asyncHandler(async (req, res) => {
    const data = { ...req.body, propertyId: Number(req.params.id) };
    const parsed = insertPropertyLinkSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const urlCheck = isUrlSafe(parsed.data.url);
    if (!urlCheck.valid) {
      return res.status(400).json({ message: urlCheck.message });
    }
    const link = await storage.createPropertyLink(parsed.data);
    res.status(201).json(link);
  }));

  app.patch("/api/property-links/:id", asyncHandler(async (req, res) => {
    if (req.body.url) {
      const urlCheck = isUrlSafe(req.body.url);
      if (!urlCheck.valid) {
        return res.status(400).json({ message: urlCheck.message });
      }
    }
    const parsed = insertPropertyLinkSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updatePropertyLink(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Link not found" });
    res.json(updated);
  }));

  app.delete("/api/property-links/:id", asyncHandler(async (req, res) => {
    await storage.deletePropertyLink(Number(req.params.id));
    res.status(204).send();
  }));

  app.post("/api/properties/:id/generate-ical-token", asyncHandler(async (req, res) => {
    const propertyId = Number(req.params.id);
    const property = await storage.getProperty(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });
    const token = crypto.randomBytes(32).toString("hex");
    const updated = await storage.setPropertyIcalToken(propertyId, token);
    res.json({ icalToken: updated?.icalToken });
  }));

  app.get("/api/properties/:id/external-calendars", asyncHandler(async (req, res) => {
    const propertyId = Number(req.params.id);
    const calendars = await storage.getExternalCalendars(propertyId);
    res.json(calendars);
  }));

  app.post("/api/properties/:id/import-calendar", asyncHandler(async (req, res) => {
    const propertyId = Number(req.params.id);
    const { url, name } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ message: "URL is required" });
    }
    const urlCheck = isUrlPublic(url);
    if (!urlCheck.valid) {
      return res.status(400).json({ message: urlCheck.message });
    }
    const property = await storage.getProperty(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    const fetchResult = await safeFetchIcal(url);
    if (!fetchResult.ok) {
      return res.status(400).json({ message: fetchResult.message });
    }
    const icalData = fetchResult.data;

    const events = parseIcal(icalData);
    if (events.length === 0) {
      return res.status(400).json({ message: "No events found in the calendar" });
    }

    const calendarName = name || new URL(url).hostname;
    const sourceId = `external:${url}`;

    await storage.deleteExternalBookings(propertyId, sourceId);

    let imported = 0;
    let failed = 0;
    for (const event of events) {
      try {
        await storage.createBooking({
          propertyId,
          guestName: event.summary || "Blocked",
          checkIn: event.dtstart,
          checkOut: event.dtend,
          status: "blocked",
          totalAmount: 0,
          source: sourceId,
        });
        imported++;
      } catch (e: any) {
        failed++;
        logStructured("warn", {
          method: "POST",
          path: `/api/properties/${propertyId}/import-calendar`,
          error: `Failed to import event: ${e.message}`,
          event: { dtstart: event.dtstart, dtend: event.dtend, summary: event.summary },
        });
      }
    }

    const existingCalendars = await storage.getExternalCalendars(propertyId);
    const existing = existingCalendars.find(c => c.url === url);
    let calendar;
    if (existing) {
      calendar = await storage.updateExternalCalendar(existing.id, {
        name: calendarName,
        lastSyncedAt: new Date().toISOString(),
      });
    } else {
      calendar = await storage.createExternalCalendar({
        propertyId,
        name: calendarName,
        url,
        lastSyncedAt: new Date().toISOString(),
      });
    }

    res.json({ imported, failed, total: events.length, calendar });
  }));

  app.delete("/api/properties/:propertyId/external-calendars/:id", asyncHandler(async (req, res) => {
    const propertyId = Number(req.params.propertyId);
    const calId = Number(req.params.id);
    const calendars = await storage.getExternalCalendars(propertyId);
    const cal = calendars.find(c => c.id === calId);
    if (!cal) return res.status(404).json({ message: "Calendar not found" });
    const sourceId = `external:${cal.url}`;
    await storage.deleteExternalBookings(propertyId, sourceId);
    await storage.deleteExternalCalendar(calId);
    res.status(204).send();
  }));

  app.get("/api/rooms", asyncHandler(async (_req, res) => {
    const allRooms = await storage.getAllRooms();
    res.json(allRooms);
  }));

  app.get("/api/properties/:id/rooms", asyncHandler(async (req, res) => {
    const propertyRooms = await storage.getRoomsByProperty(Number(req.params.id));
    res.json(propertyRooms);
  }));

  app.post("/api/properties/:id/rooms", asyncHandler(async (req, res) => {
    const data = { ...req.body, propertyId: Number(req.params.id) };
    const parsed = insertRoomSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const room = await storage.createRoom(parsed.data);
    res.status(201).json(room);
  }));

  app.patch("/api/rooms/:id", asyncHandler(async (req, res) => {
    const parsed = insertRoomSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateRoom(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Room not found" });
    res.json(updated);
  }));

  app.delete("/api/rooms/:id", asyncHandler(async (req, res) => {
    await storage.deleteRoom(Number(req.params.id));
    res.status(204).send();
  }));

  app.get("/api/bookings", asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const result = await storage.getBookings({ page, limit, search, status, startDate, endDate });
    res.json(result);
  }));

  app.get("/api/check-ins", asyncHandler(async (req, res) => {
    const allBookings = await storage.getAllBookings();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hasCustomRange = !!(req.query.startDate || req.query.endDate);

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : today;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(today.getTime() + 8 * 86400000);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use ISO date strings." });
    }

    const arrivals = allBookings.filter(b => {
      const checkInDate = new Date(b.checkIn);
      return checkInDate >= startDate && checkInDate < endDate && !["cancelled", "completed", "checked_out"].includes(b.status);
    });

    const departures = allBookings.filter(b => {
      const checkOutDate = new Date(b.checkOut);
      return checkOutDate >= startDate && checkOutDate < endDate && !["cancelled", "completed"].includes(b.status);
    });

    const overdueArrivals = allBookings.filter(b => {
      const checkInDate = new Date(b.checkIn);
      return checkInDate < today && ["upcoming"].includes(b.status);
    });

    const overdueDepartures = allBookings.filter(b => {
      const checkOutDate = new Date(b.checkOut);
      return checkOutDate < today && ["current", "checked_in"].includes(b.status);
    });

    const todayArrivalsCount = allBookings.filter(b => {
      const d = new Date(b.checkIn);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
        && !["cancelled", "completed", "checked_out"].includes(b.status);
    }).length;

    const todayDeparturesCount = allBookings.filter(b => {
      const d = new Date(b.checkOut);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
        && !["cancelled", "completed"].includes(b.status);
    }).length;

    res.json({
      arrivals: hasCustomRange ? arrivals : [...overdueArrivals, ...arrivals],
      departures: hasCustomRange ? departures : [...overdueDepartures, ...departures],
      todayArrivals: todayArrivalsCount,
      todayDepartures: todayDeparturesCount,
      overdueArrivals: overdueArrivals.length,
      overdueDepartures: overdueDepartures.length,
    });
  }));

  app.get("/api/bookings/:id", asyncHandler(async (req, res) => {
    const booking = await storage.getBooking(Number(req.params.id));
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  }));

  app.post("/api/bookings", asyncHandler(async (req, res) => {
    const parsed = insertBookingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const property = await storage.getProperty(parsed.data.propertyId);
    if (!property) return res.status(400).json({ message: "Property not found" });

    if (property.bookingMode === "room_based") {
      if (!parsed.data.roomId || !parsed.data.roomCount || parsed.data.roomCount < 1) {
        return res.status(400).json({ message: "Room type and room count are required for room-based properties" });
      }
      const room = await storage.getRoom(parsed.data.roomId);
      if (!room || room.propertyId !== property.id) {
        return res.status(400).json({ message: "Invalid room type for this property" });
      }
    } else {
      parsed.data.roomId = null;
      parsed.data.roomCount = null;
    }

    const hasOverlap = await storage.hasOverlappingBooking(
      parsed.data.propertyId,
      parsed.data.checkIn,
      parsed.data.checkOut
    );
    if (hasOverlap) {
      return res.status(409).json({ message: "A booking already exists for this property during the selected dates" });
    }

    let booking;
    try {
      booking = await storage.createBooking(parsed.data);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "BOOKING_OVERLAP") {
        return res.status(409).json({ message: "A booking already exists for this property during the selected dates" });
      }
      throw e;
    }

    const prop = await storage.getProperty(booking.propertyId);
    const propName = prop?.name ?? `Property #${booking.propertyId}`;
    await storage.createNotification({
      type: "booking_status",
      title: "New Booking Created",
      message: `${booking.guestName} booked ${propName} (check-in: ${booking.checkIn.split("T")[0]}).`,
      link: "/bookings",
      isRead: 0,
      createdAt: new Date().toISOString(),
    });

    const emailData = buildBookingConfirmationEmail(
      booking.guestName,
      propName,
      booking.checkIn.split("T")[0],
      booking.checkOut.split("T")[0],
      booking.totalAmount
    );
    trySendNotificationEmail(emailData, "booking", req.session.userId);

    res.status(201).json(booking);
  }));

  app.patch("/api/bookings/:id", asyncHandler(async (req, res) => {
    const parsed = insertBookingSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const validStatuses = ["upcoming", "current", "checked_in", "checked_out", "completed", "cancelled", "blocked"];
    if (parsed.data.status && !validStatuses.includes(parsed.data.status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }
    const bookingId = Number(req.params.id);
    const existing = await storage.getBooking(bookingId);
    if (!existing) return res.status(404).json({ message: "Booking not found" });

    const checkIn = parsed.data.checkIn ?? existing.checkIn;
    const checkOut = parsed.data.checkOut ?? existing.checkOut;
    const propertyId = parsed.data.propertyId ?? existing.propertyId;
    if (parsed.data.checkIn || parsed.data.checkOut || parsed.data.propertyId) {
      const hasOverlap = await storage.hasOverlappingBooking(propertyId, checkIn, checkOut, bookingId);
      if (hasOverlap) {
        return res.status(409).json({ message: "A booking already exists for this property during the selected dates" });
      }
    }

    const updated = await storage.updateBooking(bookingId, parsed.data);
    if (!updated) return res.status(404).json({ message: "Booking not found" });

    if (existing && parsed.data.status && parsed.data.status !== existing.status) {
      const prop = await storage.getProperty(updated.propertyId);
      const propName = prop?.name ?? `Property #${updated.propertyId}`;
      await storage.createNotification({
        type: "booking_status",
        title: "Booking Status Changed",
        message: `${updated.guestName}'s booking at ${propName} changed to "${parsed.data.status}".`,
        link: "/bookings",
        isRead: 0,
        createdAt: new Date().toISOString(),
      });
    }

    res.json(updated);
  }));

  app.delete("/api/bookings/:id", asyncHandler(async (req, res) => {
    await storage.deleteBooking(Number(req.params.id));
    res.status(204).send();
  }));

  app.get("/api/conversations", asyncHandler(async (_req, res) => {
    const allConversations = await storage.getConversations();
    res.json(allConversations);
  }));

  app.post("/api/conversations", asyncHandler(async (req, res) => {
    const parsed = insertConversationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const conversation = await storage.createConversation(parsed.data);
    res.status(201).json(conversation);
  }));

  app.get("/api/conversations/:id/messages", asyncHandler(async (req, res) => {
    const allMessages = await storage.getMessages(Number(req.params.id));
    res.json(allMessages);
  }));

  app.post("/api/messages", asyncHandler(async (req, res) => {
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const message = await storage.createMessage(parsed.data);
    res.status(201).json(message);
  }));

  app.get("/api/revenue", asyncHandler(async (_req, res) => {
    const data = await storage.getRevenueData();
    res.json(data);
  }));

  app.get("/api/dashboard/stats", asyncHandler(async (_req, res) => {
    const propertiesResult = await storage.getProperties({ page: 1, limit: 10000 });
    const allProperties = propertiesResult.data;
    const allBookings = await storage.getAllBookings();
    const { totalRevenue } = await storage.getDashboardRevenue();
    const { averageOccupancy } = await storage.getOccupancyStats();

    const activeProperties = allProperties.filter(p => p.status === 'active').length;
    const currentBookings = allBookings.filter(b => b.status === 'current').length;
    const upcomingBookings = allBookings.filter(b => b.status === 'upcoming').length;

    res.json({
      totalProperties: allProperties.length,
      activeProperties,
      currentBookings,
      upcomingBookings,
      totalMonthlyRevenue: totalRevenue,
      averageOccupancy,
    });
  }));

  app.get("/api/dashboard/revenue-chart", asyncHandler(async (_req, res) => {
    const revenueByMonth = await storage.getRevenueByMonth();
    if (revenueByMonth.length > 0) {
      res.json(revenueByMonth);
    } else {
      const fallbackData = await storage.getRevenueData();
      res.json(fallbackData);
    }
  }));

  app.post("/api/seed-demo", asyncHandler(async (_req, res) => {
    try {
      const d = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000);
      const ds = (offsetDays: number) => d(offsetDays).toISOString();
      const date = (offsetDays: number) => d(offsetDays).toISOString().split("T")[0];

      // Clear all tables (order matters for FK deps)
      await db.delete(notifications);
      await db.delete(housekeepingTasks);
      await db.delete(expenses);
      await db.delete(reviews);
      await db.delete(enquiries);
      await db.delete(galleryImages);
      await db.delete(messages);
      await db.delete(conversations);
      await db.delete(bookings);
      await db.delete(rooms);
      await db.delete(revenueData);
      await db.delete(properties);

      // ── Properties ────────────────────────────────────────────────────────────
      const props = await db.insert(properties).values([
        {
          name: "The Cobblestone Loft",
          address: "14 Rue de Bretagne, Le Marais, Paris, France",
          nightlyRate: 180,
          imageUrl: "/property-1.jpg",
          status: "active",
          occupancyRate: 88,
          monthlyRevenue: 4320,
          description: "A beautifully restored Haussmann-era loft in the heart of Le Marais. Exposed stone walls, high ceilings, and vintage Parisian furnishings meet modern comforts.",
          propertyType: "apartment",
          bedrooms: 2,
          bathrooms: 1,
          maxGuests: 4,
          squareFeet: 950,
          amenities: ["WiFi", "AC", "Heating", "Kitchen", "Washer", "Dishwasher", "TV", "Balcony", "Coffee Machine", "Iron"],
          checkInTime: "15:00",
          checkOutTime: "11:00",
          minimumStay: 2,
          houseRules: "No smoking. No parties. Quiet hours after 10 PM. Maximum 4 guests.",
          neighborhood: "Le Marais",
          bookingMode: "whole",
        },
        {
          name: "Santorini Cliffside Villa",
          address: "Oia Village, Santorini, Greece",
          nightlyRate: 420,
          imageUrl: "/property-2.jpg",
          status: "active",
          occupancyRate: 72,
          monthlyRevenue: 9072,
          description: "An iconic whitewashed villa perched on the caldera cliffs of Oia with uninterrupted views of the Aegean Sea and the legendary Santorini sunset. Private infinity pool.",
          propertyType: "villa",
          bedrooms: 3,
          bathrooms: 3,
          maxGuests: 6,
          squareFeet: 2200,
          amenities: ["WiFi", "Private Pool", "AC", "Kitchen", "BBQ", "Sunset View", "Concierge", "Parking", "Washer", "TV"],
          checkInTime: "16:00",
          checkOutTime: "11:00",
          minimumStay: 3,
          houseRules: "No smoking indoors. Children must be supervised near the pool. No loud music after 11 PM.",
          neighborhood: "Oia",
          bookingMode: "whole",
        },
        {
          name: "Brooklyn Brownstone Suite",
          address: "247 Pacific Street, Cobble Hill, Brooklyn, NY, USA",
          nightlyRate: 195,
          imageUrl: "/property-3.jpg",
          status: "active",
          occupancyRate: 91,
          monthlyRevenue: 5070,
          description: "A stunning garden-level suite in a landmarked brownstone in Brooklyn's most coveted neighborhood. Exposed brick, original tin ceilings, and a private garden patio.",
          propertyType: "apartment",
          bedrooms: 1,
          bathrooms: 1,
          maxGuests: 2,
          squareFeet: 750,
          amenities: ["WiFi", "AC", "Heating", "Kitchen", "Private Garden", "Washer", "TV", "Workspace", "Coffee Machine", "Bike Storage"],
          checkInTime: "14:00",
          checkOutTime: "11:00",
          minimumStay: 2,
          houseRules: "No smoking. No pets. No parties. Please be mindful of neighbors.",
          neighborhood: "Cobble Hill",
          bookingMode: "whole",
        },
        {
          name: "Lisbon Alfama Guesthouse",
          address: "Rua de São Miguel 42, Alfama, Lisbon, Portugal",
          nightlyRate: 85,
          imageUrl: "/property-4.jpg",
          status: "active",
          occupancyRate: 78,
          monthlyRevenue: 1989,
          description: "A charming guesthouse nestled in Lisbon's oldest neighborhood. Azulejo-tiled walls, handcrafted wooden furniture, and sweeping views of the Tagus River.",
          propertyType: "guesthouse",
          bedrooms: 4,
          bathrooms: 4,
          maxGuests: 8,
          squareFeet: 1800,
          amenities: ["WiFi", "AC", "Shared Kitchen", "River View", "Rooftop Terrace", "Breakfast Included", "Luggage Storage", "Tour Desk"],
          checkInTime: "14:00",
          checkOutTime: "10:00",
          minimumStay: 1,
          houseRules: "No smoking inside. Quiet hours from 11 PM. Please remove shoes at the entrance.",
          neighborhood: "Alfama",
          bookingMode: "room_based",
        },
      ]).returning();

      // ── Rooms (Lisbon is room-based) ──────────────────────────────────────────
      await db.insert(rooms).values([
        { propertyId: props[3].id, roomType: "River View Double", roomCount: 2, nightlyRate: 95 },
        { propertyId: props[3].id, roomType: "Standard Twin", roomCount: 1, nightlyRate: 75 },
        { propertyId: props[3].id, roomType: "Rooftop Suite", roomCount: 1, nightlyRate: 120 },
      ]);

      // ── Bookings (diverse statuses + notes for check-ins page) ───────────────
      const createdBookings = await db.insert(bookings).values([
        // Currently checked in — arrives 2 days ago, leaves in 3 days
        { propertyId: props[0].id, guestName: "Sophie Beaumont", checkIn: ds(-2), checkOut: ds(3), status: "checked_in", totalAmount: 900, notes: "Early check-in requested at 1pm. Celebrating anniversary — arranged champagne." },
        // Upcoming arriving tomorrow
        { propertyId: props[1].id, guestName: "Marcus & Elena Richter", checkIn: ds(1), checkOut: ds(8), status: "upcoming", totalAmount: 2940, notes: "Airport transfer needed from Santorini airport at 6pm." },
        // Completed — checked out
        { propertyId: props[2].id, guestName: "Jordan Webb", checkIn: ds(-10), checkOut: ds(-5), status: "checked_out", totalAmount: 975, notes: "Long-stay remote worker. Preferred quiet hours in mornings." },
        // Upcoming in 2 weeks
        { propertyId: props[0].id, guestName: "Yuki Tanaka", checkIn: ds(15), checkOut: ds(20), status: "upcoming", totalAmount: 900, notes: "Honeymoon couple. Please leave welcome note and flowers." },
        // Currently checked in at Lisbon
        { propertyId: props[3].id, guestName: "Carlos Mendes", checkIn: ds(-1), checkOut: ds(4), status: "checked_in", totalAmount: 425, notes: "Vegetarian breakfast preference. Requested river-view room." },
        // Future booking (30 days out)
        { propertyId: props[1].id, guestName: "Priya & Arun Nair", checkIn: ds(30), checkOut: ds(37), status: "upcoming", totalAmount: 2940, notes: "First visit to Santorini. Interested in local restaurant recommendations." },
        // Checking out today
        { propertyId: props[2].id, guestName: "Lena Müller", checkIn: ds(-4), checkOut: ds(0), status: "current", totalAmount: 780, notes: "Late checkout requested until 1pm." },
        // Checking in today
        { propertyId: props[0].id, guestName: "David Park", checkIn: ds(0), checkOut: ds(5), status: "upcoming", totalAmount: 900, notes: "Honeymoon. Champagne and flowers arranged." },
        // Past completed booking
        { propertyId: props[1].id, guestName: "Amelia Torres", checkIn: ds(-20), checkOut: ds(-13), status: "completed", totalAmount: 2940, notes: "" },
      ]).returning();

      // ── Conversations & Messages ───────────────────────────────────────────────
      const convs = await db.insert(conversations).values([
        { guestName: "Sophie Beaumont", propertyName: "The Cobblestone Loft", lastMessage: "Perfect, see you on the 14th!", lastMessageTime: ds(-0.04), unreadCount: 0 },
        { guestName: "Marcus Richter", propertyName: "Santorini Cliffside Villa", lastMessage: "Is airport pickup possible?", lastMessageTime: ds(-0.08), unreadCount: 1 },
        { guestName: "Jordan Webb", propertyName: "Brooklyn Brownstone Suite", lastMessage: "Loved every moment, thank you!", lastMessageTime: ds(-3), unreadCount: 0 },
        { guestName: "Carlos Mendes", propertyName: "Lisbon Alfama Guesthouse", lastMessage: "Can I get a late checkout until noon?", lastMessageTime: ds(-0.02), unreadCount: 2 },
      ]).returning();

      await db.insert(messages).values([
        { conversationId: convs[0].id, senderName: "Sophie Beaumont", senderType: "guest", content: "Hi! Just checking — is early check-in at 1pm possible?", sentAt: ds(-0.08) },
        { conversationId: convs[0].id, senderName: "Host", senderType: "host", content: "Hi Sophie! Yes, 1pm should work great. We'll have it all ready for you.", sentAt: ds(-0.06) },
        { conversationId: convs[0].id, senderName: "Sophie Beaumont", senderType: "guest", content: "Perfect, see you on the 14th!", sentAt: ds(-0.04) },
        { conversationId: convs[1].id, senderName: "Marcus Richter", senderType: "guest", content: "We land at 6pm at Santorini airport. Is airport pickup possible?", sentAt: ds(-0.08) },
        { conversationId: convs[2].id, senderName: "Jordan Webb", senderType: "guest", content: "Just checked out. The garden patio was incredible. Loved every moment, thank you!", sentAt: ds(-3) },
        { conversationId: convs[3].id, senderName: "Carlos Mendes", senderType: "guest", content: "Can I get a late checkout until noon?", sentAt: ds(-0.02) },
      ]);

      // ── Revenue Data (12 months) ───────────────────────────────────────────────
      await db.insert(revenueData).values([
        { month: "Jan", revenue: 18400 }, { month: "Feb", revenue: 21200 },
        { month: "Mar", revenue: 24800 }, { month: "Apr", revenue: 31500 },
        { month: "May", revenue: 38900 }, { month: "Jun", revenue: 44200 },
        { month: "Jul", revenue: 52100 }, { month: "Aug", revenue: 49800 },
        { month: "Sep", revenue: 38400 }, { month: "Oct", revenue: 29700 },
        { month: "Nov", revenue: 22100 }, { month: "Dec", revenue: 20451 },
      ]);

      // ── Reviews ────────────────────────────────────────────────────────────────
      await db.insert(reviews).values([
        { propertyId: props[0].id, guestName: "Sophie Beaumont", platform: "airbnb", rating: 5, reviewText: "Absolute perfection. The loft exceeded every expectation — stunning interiors, impeccable cleanliness, and a location that can't be beaten in Paris.", responseText: "Thank you so much, Sophie! It was a pleasure hosting you. Looking forward to welcoming you back!", reviewDate: ds(-5) },
        { propertyId: props[1].id, guestName: "Marcus Richter", platform: "booking_com", rating: 5, reviewText: "Words don't do this villa justice. Watching the sunset from the infinity pool was the most breathtaking experience of our lives.", responseText: "Marcus, your kind words mean everything. We're so glad the sunset views created such a magical memory!", reviewDate: ds(-10) },
        { propertyId: props[2].id, guestName: "Jordan Webb", platform: "airbnb", rating: 5, reviewText: "This brownstone suite is a hidden gem. The private garden patio is unbelievable — we had breakfast out there every morning.", responseText: "Jordan, thank you! The garden is our favourite feature too. Hope to host you again soon!", reviewDate: ds(-6) },
        { propertyId: props[3].id, guestName: "Amelia Torres", platform: "google", rating: 4, reviewText: "A wonderful base for exploring Alfama. The rooftop terrace with river views is simply gorgeous. Minus one star only for the narrow stairs!", responseText: "Thank you Amelia! You're right about the stairs — very authentic Lisbon! So glad you enjoyed the terrace.", reviewDate: ds(-15) },
        { propertyId: props[0].id, guestName: "Luca Ferrari", platform: "direct", rating: 5, reviewText: "Our third stay at the Cobblestone Loft and it just gets better every time. This is our home away from home in Paris.", responseText: "Luca, your loyalty means the world to us! Can't wait for visit number four!", reviewDate: ds(-20) },
        { propertyId: props[2].id, guestName: "Lena Müller", platform: "airbnb", rating: 4, reviewText: "Charming apartment in a great location. Very well equipped and the host was responsive. Would return!", reviewDate: ds(-1) },
      ]);

      // ── Enquiries ──────────────────────────────────────────────────────────────
      await db.insert(enquiries).values([
        { propertyId: props[1].id, guestName: "Hannah Schmidt", guestEmail: "hannah.schmidt@email.com", guestPhone: "+49 151 2345 6789", message: "We're a family of 5. Is the villa suitable? Pool safety measures in place?", status: "new", createdAt: ds(-0.08) },
        { propertyId: props[0].id, guestName: "David Park", guestEmail: "david.park@email.com", guestPhone: "+1 646 555 0182", message: "Looking to book for our honeymoon in late June. Any special touches for couples?", status: "responded", createdAt: ds(-1) },
        { propertyId: props[3].id, guestName: "Fatima Al-Rashid", guestEmail: "fatima@email.com", guestPhone: "+971 50 123 4567", message: "Group of 6 friends visiting for a week in October. Any group discounts?", status: "new", createdAt: ds(-0.16) },
        { propertyId: props[2].id, guestName: "Tom & Lisa Bennett", guestEmail: "tom.bennett@email.com", guestPhone: "+44 7911 123456", message: "Looking for a quiet base to work remotely for a month. Long-stay pricing available?", status: "converted", createdAt: ds(-2) },
      ]);

      // ── Gallery ────────────────────────────────────────────────────────────────
      const now = new Date();
      await db.insert(galleryImages).values([
        { propertyId: props[0].id, imageUrl: "/property-1.jpg", title: "Living Area", tags: ["interior", "living room", "luxury"], starRating: 5, source: "manual", createdAt: now.toISOString() },
        { propertyId: props[1].id, imageUrl: "/property-2.jpg", title: "Infinity Pool at Sunset", tags: ["pool", "sunset", "exterior", "caldera"], starRating: 5, source: "manual", createdAt: now.toISOString() },
        { propertyId: props[2].id, imageUrl: "/property-3.jpg", title: "Garden Patio", tags: ["garden", "outdoor", "patio"], starRating: 4, source: "manual", createdAt: now.toISOString() },
        { propertyId: props[3].id, imageUrl: "/property-4.jpg", title: "Rooftop Terrace", tags: ["rooftop", "view", "terrace", "lisbon"], starRating: 5, source: "manual", createdAt: now.toISOString() },
      ]);

      // ── Expenses (realistic USD amounts) ─────────────────────────────────────
      await db.insert(expenses).values([
        { propertyId: props[0].id, category: "maintenance", amount: 285, description: "Plumbing repair in master bathroom", date: date(-5) },
        { propertyId: props[0].id, category: "cleaning", amount: 120, description: "Deep cleaning after guest checkout", date: date(-3) },
        { propertyId: props[0].id, category: "utilities", amount: 180, description: "Electricity & gas bill — March", date: date(-10) },
        { propertyId: props[0].id, category: "staff", amount: 650, description: "Property manager fee — March", date: date(-15) },
        { propertyId: props[0].id, category: "other", amount: 95, description: "Balcony plant maintenance", date: date(-18) },
        { propertyId: props[1].id, category: "supplies", amount: 210, description: "Toiletries and linens restocking", date: date(-2) },
        { propertyId: props[1].id, category: "utilities", amount: 320, description: "Water and electricity bill", date: date(-8) },
        { propertyId: props[1].id, category: "insurance", amount: 480, description: "Property insurance premium — Q1", date: date(-20) },
        { propertyId: props[1].id, category: "maintenance", amount: 750, description: "Pool pump inspection and repair", date: date(-4) },
        { propertyId: props[2].id, category: "cleaning", amount: 140, description: "Professional carpet and upholstery cleaning", date: date(-6) },
        { propertyId: props[2].id, category: "taxes", amount: 1100, description: "NYC property tax — Q1", date: date(-25) },
        { propertyId: props[2].id, category: "maintenance", amount: 165, description: "Garden patio pressure washing", date: date(-12) },
        { propertyId: props[3].id, category: "utilities", amount: 85, description: "Internet and electricity bill", date: date(-7) },
        { propertyId: props[3].id, category: "cleaning", amount: 60, description: "Regular cleaning service", date: date(-1) },
        { propertyId: props[3].id, category: "supplies", amount: 45, description: "Kitchen supplies and coffee pods", date: date(-9) },
      ]);

      // ── Housekeeping Tasks ─────────────────────────────────────────────────────
      await db.insert(housekeepingTasks).values([
        { propertyId: props[0].id, type: "cleaning", title: "Turnover clean — Beaumont checkout", description: "Full deep clean of loft including linens, bathrooms, kitchen. Restock amenities before Park arrival.", status: "pending", assignee: "Maria Santos", dueDate: date(3), priority: "high" },
        { propertyId: props[1].id, type: "maintenance", title: "Pool pump pressure issue", description: "Guest reported low water pressure in infinity pool. Engineer inspection required before Richter check-in.", status: "in_progress", assignee: "Nikos Papadopoulos", dueDate: date(1), priority: "urgent" },
        { propertyId: props[2].id, type: "inspection", title: "Pre-arrival inspection", description: "Full property inspection before next guest arrival. Check garden, all appliances, and amenities.", status: "pending", assignee: "James Cooper", dueDate: date(14), priority: "medium" },
        { propertyId: props[3].id, type: "cleaning", title: "Post-checkout deep clean — rooftop suite", description: "Deep clean of rooftop suite. Extra attention to terrace and river-view windows.", status: "completed", assignee: "Maria Santos", dueDate: date(-5), priority: "medium" },
        { propertyId: props[0].id, type: "maintenance", title: "Annual boiler service", description: "Schedule annual boiler maintenance. Contact CityHeat services.", status: "pending", assignee: "James Cooper", dueDate: date(7), priority: "low" },
        { propertyId: props[1].id, type: "inspection", title: "AC filter replacement check", description: "All three AC units need filter inspection ahead of summer season.", status: "pending", assignee: "Nikos Papadopoulos", dueDate: date(5), priority: "medium" },
        { propertyId: props[2].id, type: "cleaning", title: "Garden patio deep clean — post Müller", description: "Thoroughly clean garden furniture and outdoor rug after checkout.", status: "completed", assignee: "Maria Santos", dueDate: date(-1), priority: "high" },
      ]);

      // ── Notifications ──────────────────────────────────────────────────────────
      await db.insert(notifications).values([
        { type: "check_in", title: "Check-in today: David Park", message: "David Park is arriving at The Cobblestone Loft today (check-in: 15:00).", link: "/check-ins", isRead: 0, createdAt: ds(-0.01) },
        { type: "check_out", title: "Checkout today: Lena Müller", message: "Lena Müller is checking out of Brooklyn Brownstone Suite today. Late checkout until 1pm requested.", link: "/check-ins", isRead: 0, createdAt: ds(-0.02) },
        { type: "new_enquiry", title: "New enquiry: Hannah Schmidt", message: "Hannah Schmidt sent a new enquiry about Santorini Cliffside Villa — family of 5, pool safety question.", link: "/enquiries", isRead: 0, createdAt: ds(-0.08) },
        { type: "check_in", title: "Check-in tomorrow: Marcus & Elena Richter", message: "Marcus & Elena Richter arrive at Santorini Cliffside Villa tomorrow. Airport transfer at 6pm.", link: "/check-ins", isRead: 0, createdAt: ds(-0.12) },
        { type: "overdue_task", title: "Urgent task: Pool pump issue", message: "Pool pump pressure issue at Santorini Cliffside Villa is in progress. Richter check-in tomorrow.", link: "/housekeeping", isRead: 1, createdAt: ds(-0.5) },
        { type: "new_enquiry", title: "New enquiry: Fatima Al-Rashid", message: "Fatima Al-Rashid enquired about Lisbon Alfama Guesthouse for a group of 6 in October.", link: "/enquiries", isRead: 1, createdAt: ds(-0.16) },
        { type: "booking_status", title: "Booking confirmed: Priya & Arun Nair", message: "New booking received for Santorini Cliffside Villa — 7 nights, $2,940.", link: "/bookings", isRead: 1, createdAt: ds(-2) },
      ]);

      res.json({ message: "Demo data seeded successfully" });
    } catch (error: any) {
      logStructured("error", { error: error.message, context: "seed-demo" });
      res.status(500).json({ message: "Seed failed: " + error.message });
    }
  }));

  app.get("/api/gallery", asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await storage.getGalleryImages({ page, limit });
    res.json(result);
  }));

  app.get("/api/gallery/property/:propertyId", asyncHandler(async (req, res) => {
    const images = await storage.getGalleryImagesByProperty(Number(req.params.propertyId));
    res.json(images);
  }));

  app.post("/api/gallery", asyncHandler(async (req, res) => {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    const parsed = insertGalleryImageSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const image = await storage.createGalleryImage(parsed.data);
    res.status(201).json(image);
  }));

  app.patch("/api/gallery/:id", asyncHandler(async (req, res) => {
    const parsed = insertGalleryImageSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    if (parsed.data.propertyId !== undefined && parsed.data.propertyId !== null) {
      const prop = await storage.getProperty(Number(parsed.data.propertyId));
      if (!prop) return res.status(400).json({ message: "Property not found" });
    }
    const updated = await storage.updateGalleryImage(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Image not found" });
    res.json(updated);
  }));

  app.delete("/api/gallery/:id", asyncHandler(async (req, res) => {
    const image = await storage.getGalleryImage(Number(req.params.id));
    if (image && isObjectStorageUrl(image.imageUrl.replace("/api/", ""))) {
      await deleteImage(image.imageUrl.replace("/api/", ""));
    }
    await storage.deleteGalleryImage(Number(req.params.id));
    res.status(204).send();
  }));

  app.post("/api/gallery/import-drive", asyncHandler(async (req, res) => {
    if (!config.googleDrive.enabled) {
      return res.status(503).json({ message: "Google Drive integration is not configured. Set GOOGLE_DRIVE_API_KEY to enable this feature." });
    }
    const { folderUrl, propertyId } = req.body;
    if (!folderUrl) return res.status(400).json({ message: "Folder URL or ID is required" });

    const folderId = extractFolderId(folderUrl);
    if (!folderId) return res.status(400).json({ message: "Could not extract folder ID from the provided URL" });

    const imported = await importFromGoogleDrive(folderId, propertyId || undefined);
    res.json({ message: `Imported ${imported} image(s) from Google Drive`, imported });
  }));

  app.post("/api/properties/:id/ai-enrich", asyncHandler(async (req, res) => {
    if (!openai) {
      return res.status(503).json({ message: "AI features are not configured. Set AI_INTEGRATIONS_OPENAI_API_KEY to enable this feature." });
    }
    const propertyId = Number(req.params.id);
    const property = await storage.getProperty(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    const links = await storage.getPropertyLinks(propertyId);
    if (links.length === 0) {
      return res.status(400).json({ message: "No links available to fetch data from. Add some links first." });
    }

    const fetchResults: Array<{ label: string; url: string; linkType: string; content: string }> = [];

    for (const link of links) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(link.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; AirManagerBot/1.0)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        clearTimeout(timeout);

        if (response.ok) {
          let text = await response.text();
          text = text
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          fetchResults.push({
            label: link.label,
            url: link.url,
            linkType: link.linkType,
            content: text.slice(0, 4000),
          });
        } else {
          fetchResults.push({
            label: link.label,
            url: link.url,
            linkType: link.linkType,
            content: `[Could not fetch: HTTP ${response.status}]`,
          });
        }
      } catch (err: any) {
        fetchResults.push({
          label: link.label,
          url: link.url,
          linkType: link.linkType,
          content: `[Could not fetch: ${err.message || "timeout/error"}]`,
        });
      }
    }

    const currentPropertyJson = JSON.stringify({
      name: property.name,
      address: property.address,
      description: property.description,
      propertyType: property.propertyType,
      nightlyRate: property.nightlyRate,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      maxGuests: property.maxGuests,
      squareFeet: property.squareFeet,
      amenities: property.amenities,
      checkInTime: property.checkInTime,
      checkOutTime: property.checkOutTime,
      minimumStay: property.minimumStay,
      houseRules: property.houseRules,
      neighborhood: property.neighborhood,
    }, null, 2);

    const linkDataSummary = fetchResults.map(r =>
      `--- ${r.label} (${r.linkType}) [${r.url}] ---\n${r.content}`
    ).join("\n\n");

    const systemPrompt = `You are a property data extraction assistant for a short-term rental property management business. Your job is to analyze content fetched from various listing platforms and resources, then extract and structure property details.

You will receive:
1. The current property data we already have
2. Content scraped from various links (Airbnb, Booking.com, Google Maps, OTAs, etc.)

Analyze all the fetched content and extract any useful property information. Return a JSON object with ONLY the fields where you found new or better information than what we currently have. Do not include fields where the current data is already good or where you found nothing useful.

The fields you can return are:
- name (string): Property name
- description (string): A compelling, detailed description
- propertyType (string): one of "apartment", "haveli", "villa", "studio", "bungalow", "penthouse"
- nightlyRate (number): Nightly rate in USD ($)
- bedrooms (number)
- bathrooms (number)
- maxGuests (number)
- squareFeet (number): Area in square feet
- amenities (string[]): List of amenities
- checkInTime (string): e.g. "14:00"
- checkOutTime (string): e.g. "11:00"
- minimumStay (number): Minimum nights
- houseRules (string): House rules text
- neighborhood (string): Neighbourhood/area name
- address (string): Full address

Also include a "summary" field (string) explaining what information you found and from which sources, and any recommendations.

Respond ONLY with valid JSON. No markdown, no code blocks, just the JSON object.`;

    const userMessage = `Current property data:\n${currentPropertyJson}\n\nFetched content from links:\n${linkDataSummary}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sseTimeout = setTimeout(() => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: "SSE stream exceeded maximum duration" })}\n\n`);
        res.end();
      }
    }, SSE_MAX_DURATION_MS);

    try {
      const stream = await openai!.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
        max_completion_tokens: 4096,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        if (res.writableEnded) break;
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      clearTimeout(sseTimeout);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      clearTimeout(sseTimeout);
      logStructured("error", {
        correlationId: req.correlationId,
        error: error.message,
        context: "ai-enrich-stream",
      });
      if (!res.writableEnded) {
        if (res.headersSent) {
          res.write(`data: ${JSON.stringify({ error: error.message || "AI enrichment failed" })}\n\n`);
          res.end();
        } else {
          res.status(500).json({ message: error.message || "AI enrichment failed" });
        }
      }
    }
  }));

  app.get("/api/expenses", asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await storage.getExpenses({ page, limit });
    res.json(result);
  }));

  app.get("/api/expenses/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid expense ID" });
    const expense = await storage.getExpense(id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
  }));

  app.post("/api/expenses", asyncHandler(async (req, res) => {
    const parsed = insertExpenseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const validCategories: readonly string[] = expenseCategories;
    if (!validCategories.includes(parsed.data.category)) {
      return res.status(400).json({ message: `Invalid category. Must be one of: ${expenseCategories.join(", ")}` });
    }
    if (parsed.data.amount <= 0) {
      return res.status(400).json({ message: "Amount must be positive" });
    }
    const property = await storage.getProperty(parsed.data.propertyId);
    if (!property) return res.status(400).json({ message: "Property not found" });
    const expense = await storage.createExpense(parsed.data);
    res.status(201).json(expense);
  }));

  app.patch("/api/expenses/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid expense ID" });

    const updateParsed = insertExpenseSchema.partial().safeParse(req.body);
    if (!updateParsed.success) return res.status(400).json({ message: updateParsed.error.message });

    const updateData = updateParsed.data;
    const validCategories: readonly string[] = expenseCategories;
    if (updateData.category && !validCategories.includes(updateData.category)) {
      return res.status(400).json({ message: `Invalid category. Must be one of: ${expenseCategories.join(", ")}` });
    }
    if (updateData.amount !== undefined && updateData.amount <= 0) {
      return res.status(400).json({ message: "Amount must be positive" });
    }
    if (updateData.propertyId !== undefined) {
      if (!Number.isInteger(updateData.propertyId) || updateData.propertyId <= 0) {
        return res.status(400).json({ message: "propertyId must be a positive integer" });
      }
      const property = await storage.getProperty(updateData.propertyId);
      if (!property) return res.status(400).json({ message: "Property not found" });
    }
    const updated = await storage.updateExpense(id, updateData);
    if (!updated) return res.status(404).json({ message: "Expense not found" });
    res.json(updated);
  }));

  app.delete("/api/expenses/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid expense ID" });
    await storage.deleteExpense(id);
    res.status(204).send();
  }));

  app.get("/api/enquiries", asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await storage.getEnquiries({ page, limit });
    res.json(result);
  }));

  app.get("/api/enquiries/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid enquiry ID" });
    const enquiry = await storage.getEnquiry(id);
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    res.json(enquiry);
  }));

  app.post("/api/enquiries", asyncHandler(async (req, res) => {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    const parsed = insertEnquirySchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const enquiry = await storage.createEnquiry(parsed.data);

    const prop = await storage.getProperty(enquiry.propertyId);
    const propName = prop?.name ?? `Property #${enquiry.propertyId}`;
    await storage.createNotification({
      type: "new_enquiry",
      title: "New Enquiry Received",
      message: `${enquiry.guestName} sent an enquiry about ${propName}.`,
      link: "/enquiries",
      isRead: 0,
      createdAt: new Date().toISOString(),
    });

    const emailData = buildNewEnquiryEmail(enquiry.guestName, propName, enquiry.message ?? undefined);
    trySendNotificationEmail(emailData, "enquiry", req.session.userId);

    res.status(201).json(enquiry);
  }));

  app.patch("/api/enquiries/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid enquiry ID" });
    const parsed = insertEnquirySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const validStatuses = ["new", "responded", "converted", "closed"];
    if (parsed.data.status && !validStatuses.includes(parsed.data.status)) {
      return res.status(400).json({ message: "Invalid status. Must be one of: new, responded, converted, closed" });
    }
    const updated = await storage.updateEnquiry(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Enquiry not found" });
    res.json(updated);
  }));

  app.delete("/api/enquiries/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid enquiry ID" });
    await storage.deleteEnquiry(id);
    res.status(204).send();
  }));

  app.get("/api/reviews", asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string | undefined;
    const result = await storage.getReviews({ page, limit, search });
    res.json(result);
  }));

  app.get("/api/reviews/property/:propertyId", asyncHandler(async (req, res) => {
    const propertyReviews = await storage.getReviewsByProperty(Number(req.params.propertyId));
    res.json(propertyReviews);
  }));

  app.get("/api/reviews/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid review ID" });
    const review = await storage.getReview(id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  }));

  app.post("/api/reviews", asyncHandler(async (req, res) => {
    const parsed = insertReviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    if (parsed.data.rating < 1 || parsed.data.rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    const property = await storage.getProperty(parsed.data.propertyId);
    if (!property) return res.status(400).json({ message: "Property not found" });
    const review = await storage.createReview(parsed.data);
    res.status(201).json(review);
  }));

  app.patch("/api/reviews/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid review ID" });
    const parsed = insertReviewSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    if (parsed.data.rating !== undefined && (parsed.data.rating < 1 || parsed.data.rating > 5)) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    if (parsed.data.propertyId !== undefined) {
      const property = await storage.getProperty(parsed.data.propertyId);
      if (!property) return res.status(400).json({ message: "Property not found" });
    }
    const updated = await storage.updateReview(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Review not found" });
    res.json(updated);
  }));

  app.delete("/api/reviews/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid review ID" });
    await storage.deleteReview(id);
    res.status(204).send();
  }));

  app.get("/api/housekeeping-tasks", asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await storage.getHousekeepingTasks({ page, limit });
    res.json(result);
  }));

  app.get("/api/housekeeping-tasks/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid task ID" });
    const task = await storage.getHousekeepingTask(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  }));

  app.post("/api/housekeeping-tasks", asyncHandler(async (req, res) => {
    const parsed = insertHousekeepingTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const property = await storage.getProperty(parsed.data.propertyId);
    if (!property) return res.status(400).json({ message: "Property not found" });

    if (parsed.data.bookingId) {
      const booking = await storage.getBooking(parsed.data.bookingId);
      if (!booking) return res.status(400).json({ message: "Booking not found" });
    }

    const task = await storage.createHousekeepingTask(parsed.data);
    res.status(201).json(task);
  }));

  app.patch("/api/housekeeping-tasks/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid task ID" });

    const parsed = insertHousekeepingTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    if (parsed.data.propertyId) {
      const property = await storage.getProperty(parsed.data.propertyId);
      if (!property) return res.status(400).json({ message: "Property not found" });
    }

    if (parsed.data.bookingId) {
      const booking = await storage.getBooking(parsed.data.bookingId);
      if (!booking) return res.status(400).json({ message: "Booking not found" });
    }

    const updated = await storage.updateHousekeepingTask(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Task not found" });
    res.json(updated);
  }));

  app.delete("/api/housekeeping-tasks/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid task ID" });
    await storage.deleteHousekeepingTask(id);
    res.status(204).send();
  }));

  app.get("/api/analytics", asyncHandler(async (req, res) => {
    const { startDate, endDate, propertyId } = req.query;

    const propertiesResult = await storage.getProperties({ page: 1, limit: 10000 });
    const allProperties = propertiesResult.data;
    const allBookings = await storage.getAllBookings();

    let filteredBookings = allBookings;

    // Filter by property if requested
    if (propertyId && propertyId !== "all") {
      const pid = Number(propertyId);
      filteredBookings = filteredBookings.filter(b => b.propertyId === pid);
    }

    // Filter by date range if requested
    if (startDate || endDate) {
      filteredBookings = filteredBookings.filter(b => {
        const checkIn = new Date(b.checkIn);
        if (startDate && checkIn < new Date(String(startDate))) return false;
        if (endDate && checkIn > new Date(String(endDate))) return false;
        return true;
      });
    }

    // Revenue by property
    const revenueByProperty = allProperties.map(p => {
      const propBookings = filteredBookings.filter(b => b.propertyId === p.id && b.status !== "cancelled");
      const revenue = propBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      return { propertyId: p.id, propertyName: p.name, revenue };
    }).filter(r => r.revenue > 0 || (propertyId && propertyId !== "all" && Number(propertyId) === r.propertyId));

    // Monthly revenue trend (last 12 months based on booking checkIn dates)
    const monthMap: Record<string, number> = {};
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    filteredBookings.forEach(b => {
      if (b.status === "cancelled") return;
      const d = new Date(b.checkIn);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + b.totalAmount;
    });

    const now = new Date();
    const monthlyRevenueTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenueTrend.push({
        month: `${monthLabels[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
        revenue: monthMap[key] || 0,
      });
    }

    // Occupancy stats per property (avg booking duration)
    const occupancyByProperty = allProperties.map(p => {
      const propBookings = filteredBookings.filter(b => b.propertyId === p.id && b.status !== "cancelled");
      const totalNights = propBookings.reduce((sum, b) => {
        const nights = Math.round((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000);
        return sum + Math.max(nights, 0);
      }, 0);
      const avgDuration = propBookings.length > 0 ? Math.round((totalNights / propBookings.length) * 10) / 10 : 0;
      return {
        propertyId: p.id,
        propertyName: p.name,
        occupancyRate: p.occupancyRate,
        avgBookingDuration: avgDuration,
        bookingCount: propBookings.length,
      };
    });

    // Booking status breakdown
    const statusCounts: Record<string, number> = { upcoming: 0, current: 0, completed: 0, cancelled: 0 };
    filteredBookings.forEach(b => {
      if (statusCounts[b.status] !== undefined) statusCounts[b.status]++;
      else statusCounts[b.status] = 1;
    });
    const bookingStatusBreakdown = Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status, count }));

    // Busiest months
    const monthBookingCount: Record<string, number> = {};
    filteredBookings.forEach(b => {
      if (b.status === "cancelled") return;
      const d = new Date(b.checkIn);
      const label = monthLabels[d.getMonth()];
      monthBookingCount[label] = (monthBookingCount[label] || 0) + 1;
    });
    const busiestMonths = monthLabels.map(m => ({ month: m, bookings: monthBookingCount[m] || 0 }));

    // Average booking value
    const completedOrCurrent = filteredBookings.filter(b => b.status !== "cancelled");
    const avgBookingValue = completedOrCurrent.length > 0
      ? Math.round(completedOrCurrent.reduce((sum, b) => sum + b.totalAmount, 0) / completedOrCurrent.length)
      : 0;

    // Profit per property (using monthlyRevenue from property as proxy for expenses = 30% of revenue)
    const profitByProperty = allProperties.map(p => {
      const propBookings = filteredBookings.filter(b => b.propertyId === p.id && b.status !== "cancelled");
      const revenue = propBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const estimatedExpenses = Math.round(revenue * 0.3);
      const profit = revenue - estimatedExpenses;
      return { propertyId: p.id, propertyName: p.name, revenue, expenses: estimatedExpenses, profit };
    });

    // Top earning properties sorted by revenue
    const topEarningProperties = [...revenueByProperty].sort((a, b) => b.revenue - a.revenue);

    res.json({
      revenueByProperty,
      monthlyRevenueTrend,
      occupancyByProperty,
      bookingStatusBreakdown,
      busiestMonths,
      avgBookingValue,
      profitByProperty,
      topEarningProperties,
      totalBookings: completedOrCurrent.length,
      totalRevenue: completedOrCurrent.reduce((sum, b) => sum + b.totalAmount, 0),
    });
  }));

  app.get("/api/notifications", asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === "true";
    const notifs = await storage.getNotifications(unreadOnly);
    res.json(notifs);
  }));

  app.get("/api/notifications/unread-count", asyncHandler(async (_req, res) => {
    const count = await storage.getUnreadNotificationCount();
    res.json({ count });
  }));

  app.patch("/api/notifications/:id/read", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid notification ID" });
    const updated = await storage.markNotificationRead(id);
    if (!updated) return res.status(404).json({ message: "Notification not found" });
    res.json(updated);
  }));

  app.patch("/api/notifications/mark-all-read", asyncHandler(async (_req, res) => {
    await storage.markAllNotificationsRead();
    res.json({ message: "All notifications marked as read" });
  }));

  app.post("/api/notifications", asyncHandler(async (req, res) => {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    const parsed = insertNotificationSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const notification = await storage.createNotification(parsed.data);
    res.status(201).json(notification);
  }));

  app.post("/api/notifications/generate", asyncHandler(async (_req, res) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowDate = new Date(now.getTime() + 86400000);
    const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

    const allBookings = await storage.getAllBookings();
    const propertiesResult = await storage.getProperties({ page: 1, limit: 10000 });
    const allProperties = propertiesResult.data;
    const tasksResult = await storage.getHousekeepingTasks({ page: 1, limit: 10000 });
    const allTasks = tasksResult.data;
    const propertyMap = new Map(allProperties.map(p => [p.id, p]));

    const created: string[] = [];

    for (const booking of allBookings) {
      if (booking.status === "cancelled" || booking.status === "completed") continue;
      const checkInDate = booking.checkIn.split("T")[0];
      const checkOutDate = booking.checkOut.split("T")[0];
      const property = propertyMap.get(booking.propertyId);
      const propName = property?.name ?? `Property #${booking.propertyId}`;

      if (checkInDate === tomorrowStr) {
        await storage.createNotification({
          type: "check_in",
          title: "Upcoming Check-in Tomorrow",
          message: `${booking.guestName} checks in to ${propName} tomorrow.`,
          link: "/bookings",
          isRead: 0,
          createdAt: now.toISOString(),
        });
        created.push("check_in");
        const emailData = buildCheckInReminderEmail(booking.guestName, propName, tomorrowStr);
        trySendNotificationEmail(emailData, "check_in");
      }

      if (checkOutDate === todayStr) {
        await storage.createNotification({
          type: "check_out",
          title: "Guest Check-out Today",
          message: `${booking.guestName} is checking out of ${propName} today.`,
          link: "/bookings",
          isRead: 0,
          createdAt: now.toISOString(),
        });
        created.push("check_out");
      }
    }

    for (const task of allTasks) {
      if (task.status === "completed") continue;
      if (!task.dueDate) continue;
      const dueDateStr = task.dueDate.split("T")[0];
      if (dueDateStr < todayStr) {
        const property = propertyMap.get(task.propertyId);
        const propName = property?.name ?? `Property #${task.propertyId}`;
        await storage.createNotification({
          type: "overdue_task",
          title: "Overdue Housekeeping Task",
          message: `"${task.title}" at ${propName} is overdue.`,
          link: "/housekeeping",
          isRead: 0,
          createdAt: now.toISOString(),
        });
        created.push("overdue_task");
        const emailData = buildOverdueTaskEmail(task.title, propName, dueDateStr);
        trySendNotificationEmail(emailData, "overdue_task");
      }
    }

    res.json({ message: `Generated ${created.length} notification(s)`, types: created });
  }));

  // --- Export routes ---
  app.get("/api/export/bookings", asyncHandler(async (req, res) => {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await storage.getBookings({ page: 1, limit: 100000, search, status, startDate, endDate });
    const propertiesResult = await storage.getProperties({ page: 1, limit: 100000 });

    const { arrayToCSV, formatBookingsForCSV } = await import("./export");
    const rows = formatBookingsForCSV(result.data, propertiesResult.data);
    const csv = arrayToCSV(rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bookings-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  }));

  app.get("/api/export/expenses", asyncHandler(async (req, res) => {
    const propertyId = req.query.propertyId as string | undefined;
    const category = req.query.category as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await storage.getExpenses({ page: 1, limit: 100000 });
    const propertiesResult = await storage.getProperties({ page: 1, limit: 100000 });

    let filteredExpenses = result.data;
    if (propertyId && propertyId !== "all") {
      filteredExpenses = filteredExpenses.filter(e => e.propertyId === Number(propertyId));
    }
    if (category && category !== "all") {
      filteredExpenses = filteredExpenses.filter(e => e.category === category);
    }
    if (dateFrom) {
      filteredExpenses = filteredExpenses.filter(e => e.date >= dateFrom);
    }
    if (dateTo) {
      filteredExpenses = filteredExpenses.filter(e => e.date <= dateTo);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredExpenses = filteredExpenses.filter(e =>
        (e.description || "").toLowerCase().includes(searchLower)
      );
    }

    const { arrayToCSV, formatExpensesForCSV } = await import("./export");
    const rows = formatExpensesForCSV(filteredExpenses, propertiesResult.data);
    const csv = arrayToCSV(rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="expenses-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  }));

  app.get("/api/export/revenue-report", asyncHandler(async (req, res) => {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const propertyId = req.query.propertyId as string | undefined;

    const propertiesResult = await storage.getProperties({ page: 1, limit: 100000 });
    const allBookings = await storage.getAllBookings();
    const expensesResult = await storage.getExpenses({ page: 1, limit: 100000 });

    let filteredProperties = propertiesResult.data;
    let filteredBookings = allBookings;
    let filteredExpenses = expensesResult.data;

    if (propertyId && propertyId !== "all") {
      const pid = Number(propertyId);
      filteredProperties = filteredProperties.filter(p => p.id === pid);
      filteredBookings = filteredBookings.filter(b => b.propertyId === pid);
      filteredExpenses = filteredExpenses.filter(e => e.propertyId === pid);
    }

    if (startDate) {
      filteredBookings = filteredBookings.filter(b => b.checkIn.split("T")[0] >= startDate);
      filteredExpenses = filteredExpenses.filter(e => e.date >= startDate);
    }
    if (endDate) {
      filteredBookings = filteredBookings.filter(b => b.checkIn.split("T")[0] <= endDate);
      filteredExpenses = filteredExpenses.filter(e => e.date <= endDate);
    }

    const periodLabel = startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
        ? `From ${startDate}`
        : endDate
          ? `Up to ${endDate}`
          : "All Time";

    const { generateRevenueReportPDF } = await import("./export");
    const pdfBuffer = await generateRevenueReportPDF({
      period: periodLabel,
      properties: filteredProperties,
      bookings: filteredBookings,
      expenses: filteredExpenses,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="revenue-report-${new Date().toISOString().split("T")[0]}.pdf"`);
    res.send(pdfBuffer);
  }));

  app.get("/api/guests", asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string | undefined;
    const result = await storage.getGuests({ page, limit, search });
    res.json(result);
  }));

  app.get("/api/guests/top", asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const topGuests = await storage.getTopGuests(limit);
    res.json(topGuests);
  }));

  app.get("/api/guests/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid guest ID" });
    const guest = await storage.getGuestWithStats(id);
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    const allBookings = await storage.getAllBookings();
    const guestBookings = allBookings.filter(b => b.guestId === guest.id);

    const allReviews = (await storage.getReviews({ page: 1, limit: 10000 })).data;
    const guestReviews = allReviews.filter(r => r.guestName.toLowerCase() === guest.name.toLowerCase());

    res.json({ ...guest, bookings: guestBookings, reviews: guestReviews });
  }));

  app.post("/api/guests", asyncHandler(async (req, res) => {
    const data = { ...req.body, createdAt: req.body.createdAt || new Date().toISOString() };
    const parsed = insertGuestSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const guest = await storage.createGuest(parsed.data);
    res.status(201).json(guest);
  }));

  app.patch("/api/guests/:id", asyncHandler(async (req, res) => {
    const parsed = insertGuestSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateGuest(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Guest not found" });
    res.json(updated);
  }));

  app.delete("/api/guests/:id", asyncHandler(async (req, res) => {
    await storage.deleteGuest(Number(req.params.id));
    res.status(204).send();
  }));

  registerChatRoutes(app);

  return httpServer;
}
