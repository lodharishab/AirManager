import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  guestName: text("guest_name").notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  status: text("status").notNull().default("upcoming"),
  totalAmount: integer("total_amount").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export const insertRevenueDataSchema = createInsertSchema(revenueData).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type RevenueData = typeof revenueData.$inferSelect;
export type InsertRevenueData = z.infer<typeof insertRevenueDataSchema>;

export * from "./models/chat";
