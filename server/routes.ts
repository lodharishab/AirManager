import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import {
  insertPropertySchema,
  insertPropertyLinkSchema,
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

    res.json({ message: "Seed data created successfully" });
  });

  registerChatRoutes(app);

  return httpServer;
}
