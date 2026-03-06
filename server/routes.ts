import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import {
  insertPropertySchema,
  insertBookingSchema,
  insertMessageSchema,
  insertConversationSchema,
} from "@shared/schema";

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
    res.json(property);
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
      { name: "Modern Downtown Loft", address: "Bapu Nagar, Jaipur, RJ", nightlyRate: 150, imageUrl: "/property-1.jpg", status: "active", occupancyRate: 85, monthlyRevenue: 3825 },
      { name: "Cozy Mountain Cabin", address: "Malviya Nagar, Jaipur, RJ", nightlyRate: 220, imageUrl: "/property-2.jpg", status: "active", occupancyRate: 60, monthlyRevenue: 3960 },
      { name: "Luxury Waterfront Villa", address: "Vaishali Nagar, Jaipur, RJ", nightlyRate: 550, imageUrl: "/property-3.jpg", status: "maintenance", occupancyRate: 40, monthlyRevenue: 6600 },
      { name: "Sunny Beach House", address: "C-Scheme, Jaipur, RJ", nightlyRate: 300, imageUrl: "/property-4.jpg", status: "active", occupancyRate: 90, monthlyRevenue: 8100 },
    ];

    const createdProperties = [];
    for (const p of seedProperties) {
      createdProperties.push(await storage.createProperty(p));
    }

    const now = new Date();
    const seedBookings = [
      { propertyId: createdProperties[0].id, guestName: "Sarah Jenkins", checkIn: new Date(now.getTime() - 2 * 86400000).toISOString(), checkOut: new Date(now.getTime() + 3 * 86400000).toISOString(), status: "current", totalAmount: 750 },
      { propertyId: createdProperties[1].id, guestName: "Michael Chen", checkIn: new Date(now.getTime() + 5 * 86400000).toISOString(), checkOut: new Date(now.getTime() + 10 * 86400000).toISOString(), status: "upcoming", totalAmount: 1100 },
      { propertyId: createdProperties[3].id, guestName: "Emily Davis", checkIn: new Date(now.getTime() - 10 * 86400000).toISOString(), checkOut: new Date(now.getTime() - 5 * 86400000).toISOString(), status: "completed", totalAmount: 1500 },
      { propertyId: createdProperties[0].id, guestName: "James Wilson", checkIn: new Date(now.getTime() + 12 * 86400000).toISOString(), checkOut: new Date(now.getTime() + 15 * 86400000).toISOString(), status: "upcoming", totalAmount: 450 },
      { propertyId: createdProperties[2].id, guestName: "Robert Taylor", checkIn: new Date(now.getTime() + 20 * 86400000).toISOString(), checkOut: new Date(now.getTime() + 27 * 86400000).toISOString(), status: "upcoming", totalAmount: 3850 },
    ];

    for (const b of seedBookings) {
      await storage.createBooking(b);
    }

    const seedConversations = [
      { guestName: "Sarah Jenkins", propertyName: "Modern Downtown Loft", lastMessage: "What time is check-in?", lastMessageTime: "10:30 AM", unreadCount: 2, avatarUrl: "https://i.pravatar.cc/150?u=sarah" },
      { guestName: "Michael Chen", propertyName: "Cozy Mountain Cabin", lastMessage: "Thanks for the great stay!", lastMessageTime: "Yesterday", unreadCount: 0, avatarUrl: "https://i.pravatar.cc/150?u=michael" },
      { guestName: "Emily Davis", propertyName: "Sunny Beach House", lastMessage: "Is parking available?", lastMessageTime: "Mon", unreadCount: 0, avatarUrl: "https://i.pravatar.cc/150?u=emily" },
    ];

    const createdConversations = [];
    for (const c of seedConversations) {
      createdConversations.push(await storage.createConversation(c));
    }

    const seedMessages = [
      { conversationId: createdConversations[0].id, senderName: "Sarah Jenkins", senderType: "guest", content: "Hi! We're really looking forward to our stay. Could you tell me what time check-in is?", sentAt: "10:28 AM" },
      { conversationId: createdConversations[0].id, senderName: "Host", senderType: "host", content: "Hello! We're excited to host you. Check-in is anytime after 3:00 PM. I'll send you the smart lock code on the morning of your arrival.", sentAt: "10:30 AM" },
    ];

    for (const m of seedMessages) {
      await storage.createMessage(m);
    }

    const seedRevenue = [
      { month: "Jan", revenue: 18500 },
      { month: "Feb", revenue: 22000 },
      { month: "Mar", revenue: 21500 },
      { month: "Apr", revenue: 26800 },
      { month: "May", revenue: 29000 },
      { month: "Jun", revenue: 34500 },
    ];

    for (const r of seedRevenue) {
      await storage.createRevenueData(r);
    }

    res.json({ message: "Seed data created successfully" });
  });

  registerChatRoutes(app);

  return httpServer;
}
