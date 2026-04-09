import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { storage } from "./storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import {
  insertPropertySchema,
  insertRoomSchema,
  insertPropertyLinkSchema,
  insertBookingSchema,
  insertMessageSchema,
  insertConversationSchema,
  insertGalleryImageSchema,
  insertEnquirySchema,
  insertReviewSchema,
} from "@shared/schema";
import { importFromGoogleDrive, extractFolderId } from "./google-drive";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/properties", async (_req, res) => {
    const properties = await storage.getProperties();
    res.json(properties);
  });

  app.get("/api/properties/:id", async (req, res) => {
    const property = await storage.getProperty(Number(req.params.id));
    if (!property) return res.status(404).json({ message: "Property not found" });
    const links = await storage.getPropertyLinks(property.id);
    const bookings = (await storage.getBookings()).filter(b => b.propertyId === property.id);
    const rooms = await storage.getRoomsByProperty(property.id);
    res.json({ ...property, links, bookings, rooms });
  });

  app.post("/api/properties", async (req, res) => {
    const parsed = insertPropertySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const property = await storage.createProperty(parsed.data);
    res.status(201).json(property);
  });

  app.patch("/api/properties/:id", async (req, res) => {
    const updated = await storage.updateProperty(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Property not found" });
    res.json(updated);
  });

  app.delete("/api/properties/:id", async (req, res) => {
    await storage.deleteProperty(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/properties/:id/links", async (req, res) => {
    const links = await storage.getPropertyLinks(Number(req.params.id));
    res.json(links);
  });

  app.post("/api/properties/:id/links", async (req, res) => {
    const data = { ...req.body, propertyId: Number(req.params.id) };
    const parsed = insertPropertyLinkSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const urlObj = new URL(parsed.data.url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return res.status(400).json({ message: "Only http and https URLs are allowed" });
      }
    } catch {
      return res.status(400).json({ message: "Invalid URL format" });
    }
    const link = await storage.createPropertyLink(parsed.data);
    res.status(201).json(link);
  });

  app.patch("/api/property-links/:id", async (req, res) => {
    const updated = await storage.updatePropertyLink(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Link not found" });
    res.json(updated);
  });

  app.delete("/api/property-links/:id", async (req, res) => {
    await storage.deletePropertyLink(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/rooms", async (_req, res) => {
    const allRooms = await storage.getAllRooms();
    res.json(allRooms);
  });

  app.get("/api/properties/:id/rooms", async (req, res) => {
    const propertyRooms = await storage.getRoomsByProperty(Number(req.params.id));
    res.json(propertyRooms);
  });

  app.post("/api/properties/:id/rooms", async (req, res) => {
    const data = { ...req.body, propertyId: Number(req.params.id) };
    const parsed = insertRoomSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const room = await storage.createRoom(parsed.data);
    res.status(201).json(room);
  });

  app.patch("/api/rooms/:id", async (req, res) => {
    const { roomType, roomCount, nightlyRate } = req.body;
    const updateData: Record<string, any> = {};
    if (roomType !== undefined) updateData.roomType = String(roomType);
    if (roomCount !== undefined) {
      const count = Number(roomCount);
      if (isNaN(count) || count < 1) return res.status(400).json({ message: "roomCount must be a positive integer" });
      updateData.roomCount = count;
    }
    if (nightlyRate !== undefined) {
      const rate = Number(nightlyRate);
      if (isNaN(rate) || rate < 0) return res.status(400).json({ message: "nightlyRate must be non-negative" });
      updateData.nightlyRate = rate;
    }
    const updated = await storage.updateRoom(Number(req.params.id), updateData);
    if (!updated) return res.status(404).json({ message: "Room not found" });
    res.json(updated);
  });

  app.delete("/api/rooms/:id", async (req, res) => {
    await storage.deleteRoom(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/bookings", async (_req, res) => {
    const allBookings = await storage.getBookings();
    res.json(allBookings);
  });

  app.get("/api/bookings/:id", async (req, res) => {
    const booking = await storage.getBooking(Number(req.params.id));
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  });

  app.post("/api/bookings", async (req, res) => {
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

    const booking = await storage.createBooking(parsed.data);
    res.status(201).json(booking);
  });

  app.patch("/api/bookings/:id", async (req, res) => {
    const updated = await storage.updateBooking(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Booking not found" });
    res.json(updated);
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    await storage.deleteBooking(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/conversations", async (_req, res) => {
    const allConversations = await storage.getConversations();
    res.json(allConversations);
  });

  app.post("/api/conversations", async (req, res) => {
    const parsed = insertConversationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const conversation = await storage.createConversation(parsed.data);
    res.status(201).json(conversation);
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const allMessages = await storage.getMessages(Number(req.params.id));
    res.json(allMessages);
  });

  app.post("/api/messages", async (req, res) => {
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const message = await storage.createMessage(parsed.data);
    res.status(201).json(message);
  });

  app.get("/api/revenue", async (_req, res) => {
    const data = await storage.getRevenueData();
    res.json(data);
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    const allProperties = await storage.getProperties();
    const allBookings = await storage.getBookings();
    const revenue = await storage.getRevenueData();

    const activeProperties = allProperties.filter(p => p.status === 'active').length;
    const currentBookings = allBookings.filter(b => b.status === 'current').length;
    const upcomingBookings = allBookings.filter(b => b.status === 'upcoming').length;
    const totalMonthlyRevenue = allProperties.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const averageOccupancy = allProperties.length > 0
      ? Math.round(allProperties.reduce((sum, p) => sum + p.occupancyRate, 0) / allProperties.length)
      : 0;

    res.json({
      totalProperties: allProperties.length,
      activeProperties,
      currentBookings,
      upcomingBookings,
      totalMonthlyRevenue,
      averageOccupancy,
    });
  });

  // Seed endpoint removed — app starts with empty state (demo data moved to demo branch)

  app.get("/api/gallery", async (_req, res) => {
    const images = await storage.getGalleryImages();
    res.json(images);
  });

  app.get("/api/gallery/property/:propertyId", async (req, res) => {
    const images = await storage.getGalleryImagesByProperty(Number(req.params.propertyId));
    res.json(images);
  });

  app.post("/api/gallery", async (req, res) => {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    const parsed = insertGalleryImageSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const image = await storage.createGalleryImage(parsed.data);
    res.status(201).json(image);
  });

  app.patch("/api/gallery/:id", async (req, res) => {
    const { title, tags, starRating, propertyId } = req.body;
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (tags !== undefined) {
      if (!Array.isArray(tags) || !tags.every((t: any) => typeof t === "string")) {
        return res.status(400).json({ message: "tags must be an array of strings" });
      }
      updateData.tags = tags;
    }
    if (starRating !== undefined) {
      const rating = Number(starRating);
      if (isNaN(rating) || rating < 0 || rating > 5) {
        return res.status(400).json({ message: "starRating must be between 0 and 5" });
      }
      updateData.starRating = rating;
    }
    if (propertyId !== undefined) {
      if (propertyId !== null) {
        const prop = await storage.getProperty(Number(propertyId));
        if (!prop) return res.status(400).json({ message: "Property not found" });
        updateData.propertyId = Number(propertyId);
      } else {
        updateData.propertyId = null;
      }
    }
    const updated = await storage.updateGalleryImage(Number(req.params.id), updateData);
    if (!updated) return res.status(404).json({ message: "Image not found" });
    res.json(updated);
  });

  app.delete("/api/gallery/:id", async (req, res) => {
    await storage.deleteGalleryImage(Number(req.params.id));
    res.status(204).send();
  });

  app.post("/api/gallery/import-drive", async (req, res) => {
    try {
      const { folderUrl, propertyId } = req.body;
      if (!folderUrl) return res.status(400).json({ message: "Folder URL or ID is required" });

      const folderId = extractFolderId(folderUrl);
      if (!folderId) return res.status(400).json({ message: "Could not extract folder ID from the provided URL" });

      const imported = await importFromGoogleDrive(folderId, propertyId || undefined);
      res.json({ message: `Imported ${imported} image(s) from Google Drive`, imported });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to import from Google Drive" });
    }
  });

  app.post("/api/properties/:id/ai-enrich", async (req, res) => {
    try {
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

      const stream = await openai.chat.completions.create({
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
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("AI enrich error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message || "AI enrichment failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: error.message || "AI enrichment failed" });
      }
    }
  });

  app.get("/api/enquiries", async (_req, res) => {
    const allEnquiries = await storage.getEnquiries();
    res.json(allEnquiries);
  });

  app.get("/api/enquiries/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid enquiry ID" });
    const enquiry = await storage.getEnquiry(id);
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    res.json(enquiry);
  });

  app.post("/api/enquiries", async (req, res) => {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    const parsed = insertEnquirySchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const enquiry = await storage.createEnquiry(parsed.data);
    res.status(201).json(enquiry);
  });

  app.patch("/api/enquiries/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid enquiry ID" });
    const validStatuses = ["new", "responded", "converted", "closed"];
    if (req.body.status && !validStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid status. Must be one of: new, responded, converted, closed" });
    }
    const updated = await storage.updateEnquiry(id, req.body);
    if (!updated) return res.status(404).json({ message: "Enquiry not found" });
    res.json(updated);
  });

  app.delete("/api/enquiries/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid enquiry ID" });
    await storage.deleteEnquiry(id);
    res.status(204).send();
  });

  app.get("/api/reviews", async (_req, res) => {
    const allReviews = await storage.getReviews();
    res.json(allReviews);
  });

  app.get("/api/reviews/property/:propertyId", async (req, res) => {
    const propertyReviews = await storage.getReviewsByProperty(Number(req.params.propertyId));
    res.json(propertyReviews);
  });

  app.get("/api/reviews/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid review ID" });
    const review = await storage.getReview(id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  });

  app.post("/api/reviews", async (req, res) => {
    const data = { ...req.body };
    const validPlatforms = ["airbnb", "booking", "google", "direct", "other"];
    if (data.platform && !validPlatforms.includes(data.platform)) {
      return res.status(400).json({ message: "Invalid platform. Must be one of: airbnb, booking, google, direct, other" });
    }
    if (data.rating !== undefined) {
      const rating = Number(data.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
      }
    }
    const propertyId = Number(data.propertyId);
    if (!propertyId || isNaN(propertyId) || propertyId <= 0) {
      return res.status(400).json({ message: "Valid propertyId is required" });
    }
    const property = await storage.getProperty(propertyId);
    if (!property) return res.status(400).json({ message: "Property not found" });
    const parsed = insertReviewSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const review = await storage.createReview(parsed.data);
    res.status(201).json(review);
  });

  app.patch("/api/reviews/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid review ID" });
    const validPlatforms = ["airbnb", "booking", "google", "direct", "other"];
    if (req.body.platform && !validPlatforms.includes(req.body.platform)) {
      return res.status(400).json({ message: "Invalid platform" });
    }
    if (req.body.rating !== undefined) {
      const rating = Number(req.body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
    }
    if (req.body.propertyId !== undefined) {
      const propertyId = Number(req.body.propertyId);
      if (!propertyId || isNaN(propertyId) || propertyId <= 0) {
        return res.status(400).json({ message: "Valid propertyId is required" });
      }
      const property = await storage.getProperty(propertyId);
      if (!property) return res.status(400).json({ message: "Property not found" });
    }
    const allowedFields = ["propertyId", "guestName", "platform", "rating", "reviewText", "responseText", "reviewDate"];
    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    const updated = await storage.updateReview(id, updateData);
    if (!updated) return res.status(404).json({ message: "Review not found" });
    res.json(updated);
  });

  app.delete("/api/reviews/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid review ID" });
    await storage.deleteReview(id);
    res.status(204).send();
  });

  registerChatRoutes(app);

  return httpServer;
}
