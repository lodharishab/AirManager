import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type BookingMode = "whole" | "room_based";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  nightlyRate: integer("nightly_rate").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("active"),
  occupancyRate: integer("occupancy_rate").notNull().default(0),
  monthlyRevenue: integer("monthly_revenue").notNull().default(0),
  description: text("description"),
  propertyType: text("property_type").default("apartment"),
  bedrooms: integer("bedrooms").default(1),
  bathrooms: integer("bathrooms").default(1),
  maxGuests: integer("max_guests").default(2),
  squareFeet: integer("square_feet"),
  amenities: text("amenities").array(),
  checkInTime: text("check_in_time").default("14:00"),
  checkOutTime: text("check_out_time").default("11:00"),
  minimumStay: integer("minimum_stay").default(1),
  houseRules: text("house_rules"),
  neighborhood: text("neighborhood"),
  bookingMode: text("booking_mode").notNull().default("whole"),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  roomType: text("room_type").notNull(),
  roomCount: integer("room_count").notNull(),
  nightlyRate: integer("nightly_rate").notNull(),
});

export const propertyLinks = pgTable("property_links", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  linkType: text("link_type").notNull().default("other"),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  guestName: text("guest_name").notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  status: text("status").notNull().default("upcoming"),
  totalAmount: integer("total_amount").notNull(),
  roomId: integer("room_id"),
  roomCount: integer("room_count"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderName: text("sender_name").notNull(),
  senderType: text("sender_type").notNull().default("guest"),
  content: text("content").notNull(),
  sentAt: text("sent_at").notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  guestName: text("guest_name").notNull(),
  propertyName: text("property_name").notNull(),
  lastMessage: text("last_message"),
  lastMessageTime: text("last_message_time"),
  unreadCount: integer("unread_count").notNull().default(0),
  avatarUrl: text("avatar_url"),
});

export const revenueData = pgTable("revenue_data", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(),
  revenue: integer("revenue").notNull(),
});

export const galleryImages = pgTable("gallery_images", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  tags: text("tags").array(),
  starRating: integer("star_rating").default(0),
  source: text("source").default("manual"),
  driveFileId: text("drive_file_id"),
  createdAt: text("created_at").notNull(),
});

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  message: text("message"),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true });
export const insertPropertyLinkSchema = createInsertSchema(propertyLinks).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export const insertRevenueDataSchema = createInsertSchema(revenueData).omit({ id: true });
export const insertGalleryImageSchema = createInsertSchema(galleryImages).omit({ id: true });
export const insertEnquirySchema = createInsertSchema(enquiries).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type PropertyLink = typeof propertyLinks.$inferSelect;
export type InsertPropertyLink = z.infer<typeof insertPropertyLinkSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type RevenueData = typeof revenueData.$inferSelect;
export type InsertRevenueData = z.infer<typeof insertRevenueDataSchema>;
export type GalleryImage = typeof galleryImages.$inferSelect;
export type InsertGalleryImage = z.infer<typeof insertGalleryImageSchema>;
export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;

export * from "./models/chat";
