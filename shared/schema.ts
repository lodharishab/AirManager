import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, serial, boolean, unique, json } from "drizzle-orm/pg-core";
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
  icalToken: text("ical_token"),
  currency: text("currency").notNull().default("USD"),
  deletedAt: text("deleted_at"),
}, (table) => ({
  nameAddressUnique: unique("properties_name_address_unique").on(table.name, table.address),
}));

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  roomType: text("room_type").notNull(),
  roomCount: integer("room_count").notNull(),
  nightlyRate: integer("nightly_rate").notNull(),
});

export const propertyLinks = pgTable("property_links", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  url: text("url").notNull(),
  linkType: text("link_type").notNull().default("other"),
});

export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  nationality: text("nationality"),
  notes: text("notes"),
  tags: text("tags").array(),
  createdAt: text("created_at").notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  guestId: integer("guest_id").references(() => guests.id),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  status: text("status").notNull().default("upcoming"),
  totalAmount: integer("total_amount").notNull(),
  roomId: integer("room_id"),
  roomCount: integer("room_count"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  deletedAt: text("deleted_at"),
}, (table) => ({
  propertyDatesUnique: unique("bookings_property_dates_unique").on(table.propertyId, table.checkIn, table.checkOut),
}));

export const externalCalendars = pgTable("external_calendars", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  lastSyncedAt: text("last_synced_at"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
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
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  tags: text("tags").array(),
  starRating: integer("star_rating").default(0),
  source: text("source").default("manual"),
  driveFileId: text("drive_file_id"),
  createdAt: text("created_at").notNull(),
});

export const expenseCategories = ["maintenance", "utilities", "supplies", "cleaning", "staff", "insurance", "taxes", "other"] as const;
export type ExpenseCategory = typeof expenseCategories[number];

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  receiptUrl: text("receipt_url"),
});

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  message: text("message"),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

export const insertGuestSchema = createInsertSchema(guests).omit({ id: true });

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, deletedAt: true, icalToken: true });
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true });
export const insertPropertyLinkSchema = createInsertSchema(propertyLinks).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, deletedAt: true });
export const insertExternalCalendarSchema = createInsertSchema(externalCalendars).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export const insertRevenueDataSchema = createInsertSchema(revenueData).omit({ id: true });
export const insertGalleryImageSchema = createInsertSchema(galleryImages).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export const insertEnquirySchema = createInsertSchema(enquiries).omit({ id: true });

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  platform: text("platform").notNull().default("direct"),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  responseText: text("response_text"),
  reviewDate: text("review_date").notNull(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true });

export const housekeepingTasks = pgTable("housekeeping_tasks", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("cleaning"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  assignee: text("assignee"),
  dueDate: text("due_date"),
  priority: text("priority").notNull().default("medium"),
  bookingId: integer("booking_id"),
});

export const insertHousekeepingTaskSchema = createInsertSchema(housekeepingTasks).omit({ id: true });

export const notificationTypes = ["check_in", "check_out", "new_enquiry", "booking_status", "overdue_task"] as const;
export type NotificationType = typeof notificationTypes[number];

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: integer("is_read").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  bookingAlerts: boolean("booking_alerts").notNull().default(true),
  messageAlerts: boolean("message_alerts").notNull().default(true),
  notificationEmail: text("notification_email"),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true });

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Created by connect-pg-simple at runtime; declared here so drizzle-kit push
// recognizes it instead of offering it as a rename candidate for new tables.
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;

export const followUpRules = pgTable("follow_up_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull().default("enquiry_unanswered"), // enquiry_unanswered | booking_upcoming
  delayHours: integer("delay_hours").notNull().default(24),
  channel: text("channel").notNull().default("direct"), // direct | email | whatsapp | instagram
  maxPerEnquiry: integer("max_per_enquiry").notNull().default(2),
  promptTemplate: text("prompt_template"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type FollowUpRule = typeof followUpRules.$inferSelect;
export type InsertFollowUpRule = typeof followUpRules.$inferInsert;
export const insertFollowUpRuleSchema = createInsertSchema(followUpRules).omit({ id: true, createdAt: true });

export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  enquiryId: integer("enquiry_id").references(() => enquiries.id, { onDelete: "cascade" }),
  ruleId: integer("rule_id").references(() => followUpRules.id, { onDelete: "set null" }),
  channel: text("channel").notNull().default("direct"),
  recipient: text("recipient"),
  message: text("message"),
  status: text("status").notNull().default("pending"), // pending | sent | failed | cancelled
  scheduledAt: text("scheduled_at").notNull(),
  sentAt: text("sent_at"),
  error: text("error"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = typeof followUps.$inferInsert;
export const insertFollowUpSchema = createInsertSchema(followUps).omit({ id: true, createdAt: true });

export const priceRecommendations = pgTable("price_recommendations", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  currentPrice: integer("current_price").notNull(),
  recommendedPrice: integer("recommended_price").notNull(),
  reason: text("reason").notNull(),
  confidence: integer("confidence").notNull().default(0), // 0-100
  status: text("status").notNull().default("pending"), // pending | approved | rejected | superseded
  reviewedAt: text("reviewed_at"),
  metricsSnapshot: text("metrics_snapshot"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type PriceRecommendation = typeof priceRecommendations.$inferSelect;
export type InsertPriceRecommendation = typeof priceRecommendations.$inferInsert;
export const insertPriceRecommendationSchema = createInsertSchema(priceRecommendations).omit({ id: true, createdAt: true });

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;
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
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type HousekeepingTask = typeof housekeepingTasks.$inferSelect;
export type InsertHousekeepingTask = z.infer<typeof insertHousekeepingTaskSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type ExternalCalendar = typeof externalCalendars.$inferSelect;
export type InsertExternalCalendar = z.infer<typeof insertExternalCalendarSchema>;

export * from "./models/chat";
