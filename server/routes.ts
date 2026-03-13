import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { storage } from "./storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import {
  insertPropertySchema,
  insertPropertyLinkSchema,
  insertBookingSchema,
  insertMessageSchema,
  insertConversationSchema,
  insertGalleryImageSchema,
  insertEnquirySchema,
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
    res.json({ ...property, links, bookings });
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

  app.post("/api/seed", async (_req, res) => {
    const existingProperties = await storage.getProperties();
    if (existingProperties.length > 0) {
      return res.json({ message: "Data already seeded" });
    }

    const seedProperties = [
      {
        name: "Royal Heritage Haveli",
        address: "Nahargarh Road, Jaipur, RJ",
        nightlyRate: 8500,
        imageUrl: "/property-1.jpg",
        status: "active",
        occupancyRate: 85,
        monthlyRevenue: 216750,
        description: "A stunning heritage haveli restored to its former glory with modern amenities. Features traditional Rajasthani architecture, hand-painted frescoes, and a private courtyard with a marble fountain. Perfect for guests seeking an authentic royal Jaipur experience.",
        propertyType: "haveli",
        bedrooms: 4,
        bathrooms: 3,
        maxGuests: 8,
        squareFeet: 3200,
        amenities: ["WiFi", "AC", "Pool", "Courtyard", "Room Service", "Parking", "Kitchen", "Washing Machine", "TV", "Heritage Tour"],
        checkInTime: "14:00",
        checkOutTime: "11:00",
        minimumStay: 2,
        houseRules: "No smoking indoors. No pets. Quiet hours after 10 PM. Please respect the heritage artefacts.",
        neighborhood: "Amer",
      },
      {
        name: "Pink City Luxury Apartment",
        address: "Malviya Nagar, Jaipur, RJ",
        nightlyRate: 4500,
        imageUrl: "/property-2.jpg",
        status: "active",
        occupancyRate: 72,
        monthlyRevenue: 97200,
        description: "A sleek, fully-furnished luxury apartment in the heart of Malviya Nagar. Modern interiors with floor-to-ceiling windows offering panoramic city views. Walking distance to top restaurants, shopping, and the metro station.",
        propertyType: "apartment",
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        squareFeet: 1400,
        amenities: ["WiFi", "AC", "Gym", "Elevator", "Parking", "Kitchen", "Washing Machine", "TV", "Balcony", "Security"],
        checkInTime: "15:00",
        checkOutTime: "11:00",
        minimumStay: 1,
        houseRules: "No parties or events. No smoking. Pets allowed on request. Please keep noise to a minimum.",
        neighborhood: "Malviya Nagar",
      },
      {
        name: "Lakeside Palace Suite",
        address: "Man Sagar Lake Road, Jaipur, RJ",
        nightlyRate: 15000,
        imageUrl: "/property-3.jpg",
        status: "active",
        occupancyRate: 60,
        monthlyRevenue: 270000,
        description: "An opulent palace suite with breathtaking views of Man Sagar Lake and Jal Mahal. This exclusive property offers unparalleled luxury with a private terrace, antique furnishings, and personalised butler service.",
        propertyType: "villa",
        bedrooms: 5,
        bathrooms: 4,
        maxGuests: 10,
        squareFeet: 5500,
        amenities: ["WiFi", "AC", "Pool", "Spa", "Butler Service", "Parking", "Kitchen", "Laundry", "TV", "Lake View", "Private Terrace", "Garden"],
        checkInTime: "14:00",
        checkOutTime: "12:00",
        minimumStay: 3,
        houseRules: "No smoking indoors. No outside catering without prior approval. Children must be supervised near the pool.",
        neighborhood: "Amer",
      },
      {
        name: "Johari Bazaar Studio",
        address: "C-Scheme, Jaipur, RJ",
        nightlyRate: 2800,
        imageUrl: "/property-4.jpg",
        status: "active",
        occupancyRate: 92,
        monthlyRevenue: 77280,
        description: "A charming studio in the vibrant C-Scheme area, steps away from Johari Bazaar. Beautifully designed with Rajasthani textiles and art. Ideal for solo travellers and couples looking for an affordable yet stylish base in the Pink City.",
        propertyType: "studio",
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        squareFeet: 650,
        amenities: ["WiFi", "AC", "Kitchen", "TV", "Washing Machine", "Iron", "Hair Dryer", "Workspace"],
        checkInTime: "13:00",
        checkOutTime: "11:00",
        minimumStay: 1,
        houseRules: "No smoking. No pets. No parties. Please remove shoes at the entrance.",
        neighborhood: "C-Scheme",
      },
    ];

    const createdProperties = [];
    for (const p of seedProperties) {
      createdProperties.push(await storage.createProperty(p));
    }

    const seedLinks = [
      { propertyId: createdProperties[0].id, label: "Airbnb Listing", url: "https://airbnb.com/rooms/example-haveli", linkType: "airbnb" },
      { propertyId: createdProperties[0].id, label: "Google Maps", url: "https://maps.google.com/?q=Nahargarh+Road+Jaipur", linkType: "maps" },
      { propertyId: createdProperties[0].id, label: "Booking.com", url: "https://booking.com/hotel/example-haveli", linkType: "booking" },
      { propertyId: createdProperties[0].id, label: "Photo Gallery", url: "https://photos.google.com/share/example", linkType: "photos" },
      { propertyId: createdProperties[1].id, label: "Airbnb Listing", url: "https://airbnb.com/rooms/example-apartment", linkType: "airbnb" },
      { propertyId: createdProperties[1].id, label: "Google Maps", url: "https://maps.google.com/?q=Malviya+Nagar+Jaipur", linkType: "maps" },
      { propertyId: createdProperties[1].id, label: "MakeMyTrip", url: "https://makemytrip.com/hotels/example", linkType: "ota" },
      { propertyId: createdProperties[2].id, label: "Airbnb Listing", url: "https://airbnb.com/rooms/example-palace", linkType: "airbnb" },
      { propertyId: createdProperties[2].id, label: "Google Maps", url: "https://maps.google.com/?q=Man+Sagar+Lake+Jaipur", linkType: "maps" },
      { propertyId: createdProperties[2].id, label: "Luxury Retreats", url: "https://luxuryretreats.com/example-palace", linkType: "ota" },
      { propertyId: createdProperties[2].id, label: "Virtual Tour", url: "https://my.matterport.com/show/example", linkType: "tour" },
      { propertyId: createdProperties[3].id, label: "Airbnb Listing", url: "https://airbnb.com/rooms/example-studio", linkType: "airbnb" },
      { propertyId: createdProperties[3].id, label: "Google Maps", url: "https://maps.google.com/?q=C-Scheme+Jaipur", linkType: "maps" },
    ];

    for (const l of seedLinks) {
      await storage.createPropertyLink(l);
    }

    const now = new Date();
    const seedBookings = [
      { propertyId: createdProperties[0].id, guestName: "Sarah Jenkins", checkIn: new Date(now.getTime() - 2 * 86400000).toISOString(), checkOut: new Date(now.getTime() + 3 * 86400000).toISOString(), status: "current", totalAmount: 42500 },
      { propertyId: createdProperties[1].id, guestName: "Michael Chen", checkIn: new Date(now.getTime() + 5 * 86400000).toISOString(), checkOut: new Date(now.getTime() + 10 * 86400000).toISOString(), status: "upcoming", totalAmount: 22500 },
      { propertyId: createdProperties[3].id, guestName: "Emily Davis", checkIn: new Date(now.getTime() - 10 * 86400000).toISOString(), checkOut: new Date(now.getTime() - 5 * 86400000).toISOString(), status: "completed", totalAmount: 14000 },
      { propertyId: createdProperties[0].id, guestName: "James Wilson", checkIn: new Date(now.getTime() + 12 * 86400000).toISOString(), checkOut: new Date(now.getTime() + 15 * 86400000).toISOString(), status: "upcoming", totalAmount: 25500 },
      { propertyId: createdProperties[2].id, guestName: "Robert Taylor", checkIn: new Date(now.getTime() + 20 * 86400000).toISOString(), checkOut: new Date(now.getTime() + 27 * 86400000).toISOString(), status: "upcoming", totalAmount: 105000 },
    ];

    for (const b of seedBookings) {
      await storage.createBooking(b);
    }

    const seedConversations = [
      { guestName: "Sarah Jenkins", propertyName: "Royal Heritage Haveli", lastMessage: "What time is check-in?", lastMessageTime: "10:30 AM", unreadCount: 2, avatarUrl: "https://i.pravatar.cc/150?u=sarah" },
      { guestName: "Michael Chen", propertyName: "Pink City Luxury Apartment", lastMessage: "Thanks for the great stay!", lastMessageTime: "Yesterday", unreadCount: 0, avatarUrl: "https://i.pravatar.cc/150?u=michael" },
      { guestName: "Emily Davis", propertyName: "Johari Bazaar Studio", lastMessage: "Is parking available?", lastMessageTime: "Mon", unreadCount: 0, avatarUrl: "https://i.pravatar.cc/150?u=emily" },
    ];

    const createdConversations = [];
    for (const c of seedConversations) {
      createdConversations.push(await storage.createConversation(c));
    }

    const seedMessages = [
      { conversationId: createdConversations[0].id, senderName: "Sarah Jenkins", senderType: "guest", content: "Hi! We're really looking forward to our stay. Could you tell me what time check-in is?", sentAt: "10:28 AM" },
      { conversationId: createdConversations[0].id, senderName: "Host", senderType: "host", content: "Hello! We're excited to host you. Check-in is anytime after 2:00 PM. I'll send you the smart lock code on the morning of your arrival.", sentAt: "10:30 AM" },
    ];

    for (const m of seedMessages) {
      await storage.createMessage(m);
    }

    const seedRevenue = [
      { month: "Jan", revenue: 485000 },
      { month: "Feb", revenue: 520000 },
      { month: "Mar", revenue: 498000 },
      { month: "Apr", revenue: 612000 },
      { month: "May", revenue: 589000 },
      { month: "Jun", revenue: 661230 },
    ];

    for (const r of seedRevenue) {
      await storage.createRevenueData(r);
    }

    const seedEnquiries = [
      { propertyId: createdProperties[0].id, guestName: "Amit Patel", guestEmail: "amit.patel@email.com", guestPhone: "+91 98765 43210", message: "We are a family of 6 looking to stay for a week in December. Is the haveli available during Christmas week? Also, do you offer any special rates for longer stays?", status: "new", createdAt: new Date(now.getTime() - 1 * 86400000).toISOString() },
      { propertyId: createdProperties[1].id, guestName: "Priya Sharma", guestEmail: "priya.s@email.com", guestPhone: "+91 91234 56789", message: "Hi, I'm interested in booking the apartment for a corporate retreat. Can we arrange for 3 apartments for 4 nights in January?", status: "responded", createdAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
      { propertyId: createdProperties[2].id, guestName: "David Thompson", guestEmail: "david.t@email.com", guestPhone: "+44 7700 900123", message: "We are celebrating our anniversary and would love to book the palace suite. Is there a honeymoon or anniversary package available?", status: "converted", createdAt: new Date(now.getTime() - 7 * 86400000).toISOString() },
      { propertyId: createdProperties[3].id, guestName: "Meera Gupta", guestEmail: "meera.g@email.com", guestPhone: "+91 88888 77777", message: "Is the studio pet-friendly? I have a small dog. Also wondering about parking availability.", status: "closed", createdAt: new Date(now.getTime() - 14 * 86400000).toISOString() },
    ];

    for (const e of seedEnquiries) {
      await storage.createEnquiry(e);
    }

    res.json({ message: "Seed data created successfully" });
  });

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
              "User-Agent": "Mozilla/5.0 (compatible; HostSpaceBot/1.0)",
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

      const systemPrompt = `You are a property data extraction assistant for a luxury rental property management business in Jaipur, India. Your job is to analyze content fetched from various listing platforms and resources, then extract and structure property details.

You will receive:
1. The current property data we already have
2. Content scraped from various links (Airbnb, Booking.com, Google Maps, OTAs, etc.)

Analyze all the fetched content and extract any useful property information. Return a JSON object with ONLY the fields where you found new or better information than what we currently have. Do not include fields where the current data is already good or where you found nothing useful.

The fields you can return are:
- name (string): Property name
- description (string): A compelling, detailed description
- propertyType (string): one of "apartment", "haveli", "villa", "studio", "bungalow", "penthouse"
- nightlyRate (number): Nightly rate in INR (₹)
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

  registerChatRoutes(app);

  return httpServer;
}
