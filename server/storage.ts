import { eq, desc, isNull, and, or, lt, gt, sql, ilike, gte, lte, asc } from "drizzle-orm";
import { db } from "./db";
import {
  users, properties, propertyLinks, bookings, messages, conversations, revenueData, galleryImages, expenses, enquiries, rooms, reviews, housekeepingTasks, notifications, userPreferences, guests, externalCalendars, appSettings,
  followUpRules, followUps, priceRecommendations, tickets, ticketEvents,
  type User, type InsertUser,
  type Property, type InsertProperty,
  type Room, type InsertRoom,
  type PropertyLink, type InsertPropertyLink,
  type Booking, type InsertBooking,
  type Message, type InsertMessage,
  type Conversation, type InsertConversation,
  type RevenueData, type InsertRevenueData,
  type GalleryImage, type InsertGalleryImage,
  type Expense, type InsertExpense,
  type Enquiry, type InsertEnquiry,
  type Review, type InsertReview,
  type HousekeepingTask, type InsertHousekeepingTask,
  type Notification, type InsertNotification,
  type UserPreferences, type InsertUserPreferences,
  type Guest, type InsertGuest,
  type ExternalCalendar, type InsertExternalCalendar,
  type FollowUpRule, type InsertFollowUpRule,
  type FollowUp, type InsertFollowUp,
  type PriceRecommendation, type InsertPriceRecommendation,
  type Ticket, type InsertTicket, type TicketEvent, type InsertTicketEvent,
} from "@shared/schema";

export interface FollowUpWithMeta extends FollowUp {
  guestName: string | null;
  propertyName: string | null;
}

export interface PriceRecommendationWithMeta extends PriceRecommendation {
  propertyName: string | null;
  propertyCurrency: string | null;
}

export interface TicketWithMeta extends Ticket {
  propertyName: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PropertySearchParams extends PaginationParams {
  search?: string;
}

export interface BookingSearchParams extends PaginationParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReviewSearchParams extends PaginationParams {
  search?: string;
}

export interface GuestSearchParams extends PaginationParams {
  search?: string;
}

export interface GuestWithStats extends Guest {
  totalStays: number;
  totalSpent: number;
  lastVisit: string | null;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<{ username: string; password: string }>): Promise<User | undefined>;

  getProperties(params?: PropertySearchParams): Promise<PaginatedResult<Property>>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<void>;

  getAllRooms(): Promise<Room[]>;
  getRoomsByProperty(propertyId: number): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, data: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<void>;

  getPropertyLinks(propertyId: number): Promise<PropertyLink[]>;
  createPropertyLink(link: InsertPropertyLink): Promise<PropertyLink>;
  updatePropertyLink(id: number, data: Partial<InsertPropertyLink>): Promise<PropertyLink | undefined>;
  deletePropertyLink(id: number): Promise<void>;

  getBookings(params?: BookingSearchParams): Promise<PaginatedResult<Booking>>;
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<void>;
  hasOverlappingBooking(propertyId: number, checkIn: string, checkOut: string, excludeBookingId?: number): Promise<boolean>;
  getAvailabilityInfo(propertyId: number, checkIn: string, checkOut: string): Promise<{ available: boolean; bookingMode: string; bookedUnits: number; capacity: number | null; wholePropertyBooked: boolean; }>;
  getAllBookings(): Promise<Booking[]>;

  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  getRevenueData(): Promise<RevenueData[]>;
  createRevenueData(data: InsertRevenueData): Promise<RevenueData>;

  getGalleryImages(params?: PaginationParams): Promise<PaginatedResult<GalleryImage>>;
  getGalleryImagesByProperty(propertyId: number): Promise<GalleryImage[]>;
  getGalleryImage(id: number): Promise<GalleryImage | undefined>;
  createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage>;
  updateGalleryImage(id: number, data: Partial<InsertGalleryImage>): Promise<GalleryImage | undefined>;
  deleteGalleryImage(id: number): Promise<void>;

  getExpenses(params?: PaginationParams): Promise<PaginatedResult<Expense>>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;

  getEnquiries(params?: PaginationParams): Promise<PaginatedResult<Enquiry>>;
  getEnquiry(id: number): Promise<Enquiry | undefined>;
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  updateEnquiry(id: number, data: Partial<InsertEnquiry>): Promise<Enquiry | undefined>;
  deleteEnquiry(id: number): Promise<void>;

  getReviews(params?: ReviewSearchParams): Promise<PaginatedResult<Review>>;
  getReviewsByProperty(propertyId: number): Promise<Review[]>;
  getReview(id: number): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, data: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<void>;

  getHousekeepingTasks(params?: PaginationParams): Promise<PaginatedResult<HousekeepingTask>>;
  getHousekeepingTask(id: number): Promise<HousekeepingTask | undefined>;
  createHousekeepingTask(task: InsertHousekeepingTask): Promise<HousekeepingTask>;
  updateHousekeepingTask(id: number, data: Partial<InsertHousekeepingTask>): Promise<HousekeepingTask | undefined>;
  deleteHousekeepingTask(id: number): Promise<void>;

  getNotifications(unreadOnly?: boolean): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsRead(): Promise<void>;
  getUnreadNotificationCount(): Promise<number>;

  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  upsertUserPreferences(userId: number, data: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  getGuests(params?: GuestSearchParams): Promise<PaginatedResult<GuestWithStats>>;
  getGuest(id: number): Promise<Guest | undefined>;
  getGuestWithStats(id: number): Promise<GuestWithStats | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: number, data: Partial<InsertGuest>): Promise<Guest | undefined>;
  deleteGuest(id: number): Promise<void>;
  getTopGuests(limit?: number): Promise<GuestWithStats[]>;

  getDashboardRevenue(): Promise<{ totalRevenue: number }>;
  getRevenueByMonth(): Promise<{ month: string; revenue: number }[]>;
  getOccupancyStats(): Promise<{ averageOccupancy: number }>;

  getBookingsByProperty(propertyId: number): Promise<Booking[]>;
  getPropertyByIcalToken(token: string): Promise<Property | undefined>;
  setPropertyIcalToken(propertyId: number, token: string): Promise<Property | undefined>;
  getExternalCalendars(propertyId: number): Promise<ExternalCalendar[]>;
  createExternalCalendar(cal: InsertExternalCalendar): Promise<ExternalCalendar>;
  updateExternalCalendar(id: number, data: Partial<InsertExternalCalendar>): Promise<ExternalCalendar | undefined>;
  deleteExternalCalendar(id: number): Promise<void>;
  deleteExternalBookings(propertyId: number, source: string): Promise<void>;

  getSetting(key: string): Promise<string | undefined>;
  getSettings(prefix: string): Promise<Record<string, string>>;
  setSetting(key: string, value: string): Promise<void>;

  getFollowUpRules(): Promise<FollowUpRule[]>;
  getFollowUpRule(id: number): Promise<FollowUpRule | undefined>;
  createFollowUpRule(rule: InsertFollowUpRule): Promise<FollowUpRule>;
  updateFollowUpRule(id: number, updates: Partial<InsertFollowUpRule>): Promise<FollowUpRule | undefined>;
  deleteFollowUpRule(id: number): Promise<void>;

  getFollowUps(status?: string): Promise<FollowUpWithMeta[]>;
  getFollowUp(id: number): Promise<FollowUp | undefined>;
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  updateFollowUp(id: number, updates: Partial<InsertFollowUp>): Promise<FollowUp | undefined>;
  getFollowUpStats(): Promise<{ pending: number; sent: number; failed: number; sentToday: number }>;
  findFollowUpCandidates(rule: FollowUpRule, limit?: number): Promise<Enquiry[]>;

  getPriceRecommendations(status?: string): Promise<PriceRecommendationWithMeta[]>;
  createPriceRecommendation(rec: InsertPriceRecommendation): Promise<PriceRecommendation>;
  updatePriceRecommendation(id: number, updates: Partial<InsertPriceRecommendation>): Promise<PriceRecommendation | undefined>;
  getPendingPriceRecommendationCount(): Promise<number>;
  expirePendingRecommendationsForProperty(propertyId: number): Promise<void>;

  getTickets(status?: string): Promise<TicketWithMeta[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<InsertTicket>): Promise<Ticket | undefined>;
  getTicketStats(): Promise<{ open: number; escalated: number; resolved: number }>;
  getTicketEvents(ticketId: number): Promise<TicketEvent[]>;
  addTicketEvent(event: InsertTicketEvent): Promise<TicketEvent>;
  findUntriagedEnquiries(): Promise<Enquiry[]>;
  findUntriagedLowReviews(): Promise<Review[]>;
  hasTicketForSource(channel: string, sourceRefId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<{ username: string; password: string }>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getProperties(params?: PropertySearchParams): Promise<PaginatedResult<Property>> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [isNull(properties.deletedAt)];
    if (params?.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(
        or(
          ilike(properties.name, searchPattern),
          ilike(properties.address, searchPattern),
          ilike(properties.neighborhood, searchPattern)
        )
      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties)
      .where(whereClause);

    const data = await db
      .select()
      .from(properties)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return { data, total: countResult.count, page, limit };
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(and(eq(properties.id, id), isNull(properties.deletedAt)));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [created] = await db.insert(properties).values(property).returning();
    return created;
  }

  async updateProperty(id: number, data: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db.update(properties).set(data).where(and(eq(properties.id, id), isNull(properties.deletedAt))).returning();
    return updated;
  }

  async deleteProperty(id: number): Promise<void> {
    const now = new Date().toISOString();
    await db.update(bookings).set({ deletedAt: now }).where(and(eq(bookings.propertyId, id), isNull(bookings.deletedAt)));
    await db.delete(housekeepingTasks).where(eq(housekeepingTasks.propertyId, id));
    await db.delete(reviews).where(eq(reviews.propertyId, id));
    await db.delete(enquiries).where(eq(enquiries.propertyId, id));
    await db.delete(expenses).where(eq(expenses.propertyId, id));
    await db.delete(galleryImages).where(eq(galleryImages.propertyId, id));
    await db.delete(rooms).where(eq(rooms.propertyId, id));
    await db.delete(propertyLinks).where(eq(propertyLinks.propertyId, id));
    await db.update(properties).set({ deletedAt: now }).where(eq(properties.id, id));
  }

  async getAllRooms(): Promise<Room[]> {
    return db.select().from(rooms);
  }

  async getRoomsByProperty(propertyId: number): Promise<Room[]> {
    return db.select().from(rooms).where(eq(rooms.propertyId, propertyId));
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [created] = await db.insert(rooms).values(room).returning();
    return created;
  }

  async updateRoom(id: number, data: Partial<InsertRoom>): Promise<Room | undefined> {
    const [updated] = await db.update(rooms).set(data).where(eq(rooms.id, id)).returning();
    return updated;
  }

  async deleteRoom(id: number): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, id));
  }

  async getPropertyLinks(propertyId: number): Promise<PropertyLink[]> {
    return db.select().from(propertyLinks).where(eq(propertyLinks.propertyId, propertyId));
  }

  async createPropertyLink(link: InsertPropertyLink): Promise<PropertyLink> {
    const [created] = await db.insert(propertyLinks).values(link).returning();
    return created;
  }

  async updatePropertyLink(id: number, data: Partial<InsertPropertyLink>): Promise<PropertyLink | undefined> {
    const [updated] = await db.update(propertyLinks).set(data).where(eq(propertyLinks.id, id)).returning();
    return updated;
  }

  async deletePropertyLink(id: number): Promise<void> {
    await db.delete(propertyLinks).where(eq(propertyLinks.id, id));
  }

  async getAllBookings(): Promise<Booking[]> {
    const result = await db.select({ booking: bookings })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .where(and(isNull(bookings.deletedAt), isNull(properties.deletedAt)));
    return result.map(r => r.booking);
  }

  async getBookings(params?: BookingSearchParams): Promise<PaginatedResult<Booking>> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [isNull(bookings.deletedAt)];
    if (params?.search) {
      conditions.push(ilike(bookings.guestName, `%${params.search}%`));
    }
    if (params?.status && params.status !== "all") {
      conditions.push(eq(bookings.status, params.status));
    }
    if (params?.startDate) {
      conditions.push(gte(bookings.checkIn, params.startDate));
    }
    if (params?.endDate) {
      conditions.push(lte(bookings.checkOut, params.endDate));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(whereClause);

    const data = await db
      .select()
      .from(bookings)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return { data, total: countResult.count, page, limit };
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const result = await db.select({ booking: bookings })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .where(and(eq(bookings.id, id), isNull(bookings.deletedAt), isNull(properties.deletedAt)));
    return result[0]?.booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const { pool } = await import("./db");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("LOCK TABLE bookings IN EXCLUSIVE MODE");
      // Room-aware conflict detection inside the locked transaction.
      // Whole-property booking: ANY overlap blocks. Room-based: a specific room
      // blocks only if that same room overlaps; otherwise capacity is checked.
      const modeResult = await client.query(`SELECT booking_mode FROM properties WHERE id = $1`, [booking.propertyId]);
      const bookingMode = modeResult.rows[0]?.booking_mode ?? "whole";
      const overlapRows = await client.query(
        `SELECT room_id, COALESCE(room_count, 1) AS units
           FROM bookings
          WHERE property_id = $1 AND check_in < $2 AND check_out > $3
            AND deleted_at IS NULL AND status != 'cancelled'`,
        [booking.propertyId, booking.checkOut, booking.checkIn]
      );
      const overlaps = overlapRows.rows;
      let conflict = false;
      if (bookingMode === "whole") {
        conflict = overlaps.length > 0;
      } else if (booking.roomId != null) {
        conflict = overlaps.some((r: { room_id: number | null }) => r.room_id === booking.roomId);
      } else {
        const capacityResult = await client.query(
          `SELECT COALESCE(SUM(room_count), 0) AS capacity FROM rooms WHERE property_id = $1`,
          [booking.propertyId]
        );
        const capacity = Number(capacityResult.rows[0]?.capacity ?? 0);
        const bookedUnits = overlaps.reduce((sum: number, r: { units: number }) => sum + Number(r.units), 0);
        conflict = bookedUnits + Math.max(booking.roomCount ?? 1, 1) > capacity;
      }
      if (conflict) {
        await client.query("ROLLBACK");
        throw new Error("BOOKING_OVERLAP");
      }
      const insertResult = await client.query(
        `INSERT INTO bookings (property_id, guest_name, guest_id, check_in, check_out, status, total_amount, room_id, room_count, notes, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          booking.propertyId, booking.guestName, booking.guestId ?? null, booking.checkIn, booking.checkOut,
          booking.status ?? "upcoming", booking.totalAmount,
          booking.roomId ?? null, booking.roomCount ?? null, booking.notes ?? null,
          booking.source ?? "manual",
        ]
      );
      await client.query("COMMIT");
      const row = insertResult.rows[0];
      return {
        id: row.id,
        propertyId: row.property_id,
        guestName: row.guest_name,
        guestId: row.guest_id,
        checkIn: row.check_in,
        checkOut: row.check_out,
        status: row.status,
        totalAmount: row.total_amount,
        roomId: row.room_id,
        roomCount: row.room_count,
        notes: row.notes,
        source: row.source,
        deletedAt: row.deleted_at,
      };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings).set(data).where(and(eq(bookings.id, id), isNull(bookings.deletedAt))).returning();
    return updated;
  }

  async deleteBooking(id: number): Promise<void> {
    await db.update(bookings).set({ deletedAt: new Date().toISOString() }).where(eq(bookings.id, id));
  }

  async hasOverlappingBooking(propertyId: number, checkIn: string, checkOut: string, excludeBookingId?: number): Promise<boolean> {
    const conditions = [
      eq(bookings.propertyId, propertyId),
      isNull(bookings.deletedAt),
      lt(bookings.checkIn, checkOut),
      gt(bookings.checkOut, checkIn),
    ];
    if (excludeBookingId) {
      const result = await db.select().from(bookings).where(and(...conditions, sql`${bookings.id} != ${excludeBookingId}`));
      return result.length > 0;
    }
    const result = await db.select().from(bookings).where(and(...conditions));
    return result.length > 0;
  }

  async getAvailabilityInfo(propertyId: number, checkIn: string, checkOut: string): Promise<{ available: boolean; bookingMode: string; bookedUnits: number; capacity: number | null; wholePropertyBooked: boolean; }> {
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
    if (!property) throw new Error("PROPERTY_NOT_FOUND");
    const bookingMode = property.bookingMode || "whole";
    const overlapping = await db
      .select({ roomId: bookings.roomId, roomCount: bookings.roomCount })
      .from(bookings)
      .where(and(
        eq(bookings.propertyId, propertyId),
        isNull(bookings.deletedAt),
        sql`${bookings.status} != 'cancelled'`,
        lt(bookings.checkIn, checkOut),
        gt(bookings.checkOut, checkIn),
      ));
    const wholePropertyBooked = bookingMode === "whole" && overlapping.length > 0;
    const bookedUnits = overlapping.reduce((sum, b) => sum + Math.max(b.roomCount ?? 1, 1), 0);
    let capacity: number | null = null;
    if (bookingMode === "room_based") {
      const propertyRooms = await this.getRoomsByProperty(propertyId);
      capacity = propertyRooms.reduce((sum, r) => sum + Math.max(r.roomCount, 1), 0);
    }
    let available: boolean;
    if (bookingMode === "whole") {
      available = overlapping.length === 0;
    } else {
      available = !wholePropertyBooked && bookedUnits < (capacity ?? 0);
    }
    return { available, bookingMode, bookedUnits, capacity, wholePropertyBooked };
  }

  async getConversations(): Promise<Conversation[]> {
    return db.select().from(conversations);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async getRevenueData(): Promise<RevenueData[]> {
    return db.select().from(revenueData);
  }

  async createRevenueData(data: InsertRevenueData): Promise<RevenueData> {
    const [created] = await db.insert(revenueData).values(data).returning();
    return created;
  }

  async getGalleryImages(params?: PaginationParams): Promise<PaginatedResult<GalleryImage>> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(galleryImages);

    const data = await db
      .select()
      .from(galleryImages)
      .limit(limit)
      .offset(offset);

    return { data, total: countResult.count, page, limit };
  }

  async getGalleryImagesByProperty(propertyId: number): Promise<GalleryImage[]> {
    return db.select().from(galleryImages).where(eq(galleryImages.propertyId, propertyId));
  }

  async getGalleryImage(id: number): Promise<GalleryImage | undefined> {
    const [image] = await db.select().from(galleryImages).where(eq(galleryImages.id, id));
    return image;
  }

  async createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage> {
    const [created] = await db.insert(galleryImages).values(image).returning();
    return created;
  }

  async updateGalleryImage(id: number, data: Partial<InsertGalleryImage>): Promise<GalleryImage | undefined> {
    const [updated] = await db.update(galleryImages).set(data).where(eq(galleryImages.id, id)).returning();
    return updated;
  }

  async deleteGalleryImage(id: number): Promise<void> {
    await db.delete(galleryImages).where(eq(galleryImages.id, id));
  }

  async getExpenses(params?: PaginationParams): Promise<PaginatedResult<Expense>> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses);

    const data = await db
      .select()
      .from(expenses)
      .limit(limit)
      .offset(offset);

    return { data, total: countResult.count, page, limit };
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return updated;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getEnquiries(params?: PaginationParams): Promise<PaginatedResult<Enquiry>> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(enquiries);

    const data = await db
      .select()
      .from(enquiries)
      .limit(limit)
      .offset(offset);

    return { data, total: countResult.count, page, limit };
  }

  async getEnquiry(id: number): Promise<Enquiry | undefined> {
    const [enquiry] = await db.select().from(enquiries).where(eq(enquiries.id, id));
    return enquiry;
  }

  async createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry> {
    const [created] = await db.insert(enquiries).values(enquiry).returning();
    return created;
  }

  async updateEnquiry(id: number, data: Partial<InsertEnquiry>): Promise<Enquiry | undefined> {
    const [updated] = await db.update(enquiries).set(data).where(eq(enquiries.id, id)).returning();
    return updated;
  }

  async deleteEnquiry(id: number): Promise<void> {
    await db.delete(enquiries).where(eq(enquiries.id, id));
  }

  async getReviews(params?: ReviewSearchParams): Promise<PaginatedResult<Review>> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params?.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(
        or(
          ilike(reviews.reviewText, searchPattern),
          ilike(reviews.guestName, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(whereClause);

    const data = await db
      .select()
      .from(reviews)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return { data, total: countResult.count, page, limit };
  }

  async getReviewsByProperty(propertyId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.propertyId, propertyId));
  }

  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  async updateReview(id: number, data: Partial<InsertReview>): Promise<Review | undefined> {
    const [updated] = await db.update(reviews).set(data).where(eq(reviews.id, id)).returning();
    return updated;
  }

  async deleteReview(id: number): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  async getHousekeepingTasks(params?: PaginationParams): Promise<PaginatedResult<HousekeepingTask>> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(housekeepingTasks);

    const data = await db
      .select()
      .from(housekeepingTasks)
      .limit(limit)
      .offset(offset);

    return { data, total: countResult.count, page, limit };
  }

  async getHousekeepingTask(id: number): Promise<HousekeepingTask | undefined> {
    const [task] = await db.select().from(housekeepingTasks).where(eq(housekeepingTasks.id, id));
    return task;
  }

  async createHousekeepingTask(task: InsertHousekeepingTask): Promise<HousekeepingTask> {
    const [created] = await db.insert(housekeepingTasks).values(task).returning();
    return created;
  }

  async updateHousekeepingTask(id: number, data: Partial<InsertHousekeepingTask>): Promise<HousekeepingTask | undefined> {
    const [updated] = await db.update(housekeepingTasks).set(data).where(eq(housekeepingTasks.id, id)).returning();
    return updated;
  }

  async deleteHousekeepingTask(id: number): Promise<void> {
    await db.delete(housekeepingTasks).where(eq(housekeepingTasks.id, id));
  }

  async getNotifications(unreadOnly?: boolean): Promise<Notification[]> {
    if (unreadOnly) {
      return db.select().from(notifications).where(eq(notifications.isRead, 0)).orderBy(desc(notifications.createdAt));
    }
    return db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: number): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id)).returning();
    return updated;
  }

  async markAllNotificationsRead(): Promise<void> {
    await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.isRead, 0));
  }

  async getUnreadNotificationCount(): Promise<number> {
    const unread = await db.select().from(notifications).where(eq(notifications.isRead, 0));
    return unread.length;
  }

  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async upsertUserPreferences(userId: number, data: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(userId);
    if (existing) {
      const [updated] = await db.update(userPreferences).set(data).where(eq(userPreferences.userId, userId)).returning();
      return updated;
    }
    const [created] = await db.insert(userPreferences).values({ userId, ...data }).returning();
    return created;
  }

  async getGuests(params?: GuestSearchParams): Promise<PaginatedResult<GuestWithStats>> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params?.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(
        or(
          ilike(guests.name, searchPattern),
          ilike(guests.email, searchPattern),
          ilike(guests.phone, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests)
      .where(whereClause);

    const data = await db
      .select({
        guest: guests,
        totalStays: sql<number>`coalesce((select count(*) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null)::int, 0)`,
        totalSpent: sql<number>`coalesce((select sum(total_amount) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null and bookings.status != 'cancelled')::int, 0)`,
        lastVisit: sql<string | null>`(select max(check_out) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null)`,
      })
      .from(guests)
      .where(whereClause)
      .orderBy(desc(guests.createdAt))
      .limit(limit)
      .offset(offset);

    const result: GuestWithStats[] = data.map(d => ({
      ...d.guest,
      totalStays: d.totalStays,
      totalSpent: d.totalSpent,
      lastVisit: d.lastVisit,
    }));

    return { data: result, total: countResult.count, page, limit };
  }

  async getGuest(id: number): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest;
  }

  async getGuestWithStats(id: number): Promise<GuestWithStats | undefined> {
    const [result] = await db
      .select({
        guest: guests,
        totalStays: sql<number>`coalesce((select count(*) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null)::int, 0)`,
        totalSpent: sql<number>`coalesce((select sum(total_amount) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null and bookings.status != 'cancelled')::int, 0)`,
        lastVisit: sql<string | null>`(select max(check_out) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null)`,
      })
      .from(guests)
      .where(eq(guests.id, id));

    if (!result) return undefined;
    return {
      ...result.guest,
      totalStays: result.totalStays,
      totalSpent: result.totalSpent,
      lastVisit: result.lastVisit,
    };
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const [created] = await db.insert(guests).values(guest).returning();
    return created;
  }

  async updateGuest(id: number, data: Partial<InsertGuest>): Promise<Guest | undefined> {
    const [updated] = await db.update(guests).set(data).where(eq(guests.id, id)).returning();
    return updated;
  }

  async deleteGuest(id: number): Promise<void> {
    await db.update(bookings).set({ guestId: null }).where(eq(bookings.guestId, id));
    await db.delete(guests).where(eq(guests.id, id));
  }

  async getTopGuests(topLimit?: number): Promise<GuestWithStats[]> {
    const lim = topLimit || 5;
    const data = await db
      .select({
        guest: guests,
        totalStays: sql<number>`coalesce((select count(*) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null)::int, 0)`,
        totalSpent: sql<number>`coalesce((select sum(total_amount) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null and bookings.status != 'cancelled')::int, 0)`,
        lastVisit: sql<string | null>`(select max(check_out) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null)`,
      })
      .from(guests)
      .orderBy(sql`(select count(*) from bookings where bookings.guest_id = "guests"."id" and bookings.deleted_at is null) desc`)
      .limit(lim);

    return data.map(d => ({
      ...d.guest,
      totalStays: d.totalStays,
      totalSpent: d.totalSpent,
      lastVisit: d.lastVisit,
    }));
  }

  async getDashboardRevenue(): Promise<{ totalRevenue: number }> {
    const [result] = await db
      .select({ totalRevenue: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)::int` })
      .from(bookings)
      .where(
        and(
          sql`${bookings.status} != 'cancelled'`,
          isNull(bookings.deletedAt)
        )
      );
    return { totalRevenue: result.totalRevenue };
  }

  async getRevenueByMonth(): Promise<{ month: string; revenue: number }[]> {
    const result = await db
      .select({
        month: sql<string>`to_char(${bookings.checkIn}::timestamp, 'YYYY-MM')`,
        monthLabel: sql<string>`to_char(${bookings.checkIn}::timestamp, 'Mon YYYY')`,
        revenue: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)::int`,
      })
      .from(bookings)
      .where(and(sql`${bookings.status} != 'cancelled'`, isNull(bookings.deletedAt)))
      .groupBy(
        sql`to_char(${bookings.checkIn}::timestamp, 'YYYY-MM')`,
        sql`to_char(${bookings.checkIn}::timestamp, 'Mon YYYY')`
      )
      .orderBy(sql`to_char(${bookings.checkIn}::timestamp, 'YYYY-MM')`);

    return result.map(r => ({ month: r.monthLabel, revenue: r.revenue }));
  }

  async getOccupancyStats(): Promise<{ averageOccupancy: number }> {
    const allProps = await db.select().from(properties).where(isNull(properties.deletedAt));
    if (allProps.length === 0) return { averageOccupancy: 0 };
    const allBookings = await this.getAllBookings();
    const allRooms = await this.getAllRooms();
    const now = new Date();
    const rangeStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const rangeEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    const rangeDays = Math.max(1, (rangeEnd - rangeStart) / 86400000);

    const rates = allProps.map((property) => {
      const roomBased = property.bookingMode === "room_based" || property.bookingMode === "rooms";
      const capacity = roomBased
        ? Math.max(1, allRooms.filter((room) => room.propertyId === property.id).reduce((sum, room) => sum + room.roomCount, 0))
        : 1;
      const occupiedUnitNights = allBookings
        .filter((booking) => booking.propertyId === property.id && booking.status !== "cancelled")
        .reduce((sum, booking) => {
          const bookingStart = new Date(`${booking.checkIn}T00:00:00Z`).getTime();
          const bookingEnd = new Date(`${booking.checkOut}T00:00:00Z`).getTime();
          const overlapDays = Math.max(0, (Math.min(bookingEnd, rangeEnd) - Math.max(bookingStart, rangeStart)) / 86400000);
          const units = roomBased ? Math.max(booking.roomCount ?? 1, 1) : 1;
          return sum + overlapDays * units;
        }, 0);
      return Math.min(100, Math.round((occupiedUnitNights / (rangeDays * capacity)) * 100));
    });
    const avg = Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length);
    return { averageOccupancy: avg };
  }

  async getBookingsByProperty(propertyId: number): Promise<Booking[]> {
    return db.select().from(bookings).where(and(eq(bookings.propertyId, propertyId), isNull(bookings.deletedAt)));
  }

  async getPropertyByIcalToken(token: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(and(eq(properties.icalToken, token), isNull(properties.deletedAt)));
    return property;
  }

  async setPropertyIcalToken(propertyId: number, token: string): Promise<Property | undefined> {
    const [updated] = await db.update(properties).set({ icalToken: token }).where(and(eq(properties.id, propertyId), isNull(properties.deletedAt))).returning();
    return updated;
  }

  async getExternalCalendars(propertyId: number): Promise<ExternalCalendar[]> {
    return db.select().from(externalCalendars).where(eq(externalCalendars.propertyId, propertyId));
  }

  async createExternalCalendar(cal: InsertExternalCalendar): Promise<ExternalCalendar> {
    const [created] = await db.insert(externalCalendars).values(cal).returning();
    return created;
  }

  async updateExternalCalendar(id: number, data: Partial<InsertExternalCalendar>): Promise<ExternalCalendar | undefined> {
    const [updated] = await db.update(externalCalendars).set(data).where(eq(externalCalendars.id, id)).returning();
    return updated;
  }

  async deleteExternalCalendar(id: number): Promise<void> {
    await db.delete(externalCalendars).where(eq(externalCalendars.id, id));
  }

  async deleteExternalBookings(propertyId: number, source: string): Promise<void> {
    await db.delete(bookings).where(and(eq(bookings.propertyId, propertyId), eq(bookings.source, source)));
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return row?.value;
  }

  async getSettings(prefix: string): Promise<Record<string, string>> {
    const rows = await db.select().from(appSettings).where(ilike(appSettings.key, `${prefix}%`));
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }

  async getFollowUpRules(): Promise<FollowUpRule[]> {
    return db.select().from(followUpRules).orderBy(desc(followUpRules.createdAt));
  }

  async getFollowUpRule(id: number): Promise<FollowUpRule | undefined> {
    const [rule] = await db.select().from(followUpRules).where(eq(followUpRules.id, id));
    return rule;
  }

  async createFollowUpRule(rule: InsertFollowUpRule): Promise<FollowUpRule> {
    const [created] = await db
      .insert(followUpRules)
      .values({ ...rule, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async updateFollowUpRule(id: number, updates: Partial<InsertFollowUpRule>): Promise<FollowUpRule | undefined> {
    const [updated] = await db
      .update(followUpRules)
      .set(updates)
      .where(eq(followUpRules.id, id))
      .returning();
    return updated;
  }

  async deleteFollowUpRule(id: number): Promise<void> {
    await db.delete(followUpRules).where(eq(followUpRules.id, id));
  }

  async getFollowUps(status?: string): Promise<FollowUpWithMeta[]> {
    const base = db
      .select({
        id: followUps.id,
        enquiryId: followUps.enquiryId,
        ruleId: followUps.ruleId,
        channel: followUps.channel,
        recipient: followUps.recipient,
        message: followUps.message,
        status: followUps.status,
        scheduledAt: followUps.scheduledAt,
        sentAt: followUps.sentAt,
        error: followUps.error,
        createdAt: followUps.createdAt,
        guestName: enquiries.guestName,
        propertyName: properties.name,
      })
      .from(followUps)
      .leftJoin(enquiries, eq(followUps.enquiryId, enquiries.id))
      .leftJoin(properties, eq(enquiries.propertyId, properties.id));

    const rows = status
      ? await base.where(eq(followUps.status, status)).orderBy(desc(followUps.createdAt))
      : await base.orderBy(desc(followUps.createdAt));
    return rows;
  }

  async getFollowUp(id: number): Promise<FollowUp | undefined> {
    const [row] = await db.select().from(followUps).where(eq(followUps.id, id));
    return row;
  }

  async createFollowUp(followUp: InsertFollowUp): Promise<FollowUp> {
    const [created] = await db
      .insert(followUps)
      .values({ ...followUp, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async updateFollowUp(id: number, updates: Partial<InsertFollowUp>): Promise<FollowUp | undefined> {
    const [updated] = await db
      .update(followUps)
      .set(updates)
      .where(eq(followUps.id, id))
      .returning();
    return updated;
  }

  async getFollowUpStats(): Promise<{ pending: number; sent: number; failed: number; sentToday: number }> {
    const rows = await db
      .select({ status: followUps.status, count: sql<number>`count(*)::int` })
      .from(followUps)
      .groupBy(followUps.status);
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    const today = new Date().toISOString().slice(0, 10);
    const [sentToday] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(followUps)
      .where(and(eq(followUps.status, "sent"), sql`${followUps.sentAt} >= ${today}`));
    return {
      pending: byStatus["pending"] || 0,
      sent: byStatus["sent"] || 0,
      failed: byStatus["failed"] || 0,
      sentToday: sentToday?.count || 0,
    };
  }

  async findFollowUpCandidates(rule: FollowUpRule, limit: number = 50): Promise<Enquiry[]> {
    const cutoff = new Date(Date.now() - rule.delayHours * 3600_000).toISOString();
    return db
      .select()
      .from(enquiries)
      .where(
        and(
          eq(enquiries.status, "new"),
          lte(enquiries.createdAt, cutoff),
          sql`(SELECT COUNT(*) FROM ${followUps} WHERE ${followUps.enquiryId} = ${enquiries.id} AND ${followUps.status} <> 'cancelled') < ${rule.maxPerEnquiry}`,
        ),
      )
      .orderBy(asc(enquiries.createdAt))
      .limit(limit);
  }

  async getPriceRecommendations(status?: string): Promise<PriceRecommendationWithMeta[]> {
    const base = db
      .select({
        id: priceRecommendations.id,
        propertyId: priceRecommendations.propertyId,
        currentPrice: priceRecommendations.currentPrice,
        recommendedPrice: priceRecommendations.recommendedPrice,
        reason: priceRecommendations.reason,
        confidence: priceRecommendations.confidence,
        status: priceRecommendations.status,
        reviewedAt: priceRecommendations.reviewedAt,
        metricsSnapshot: priceRecommendations.metricsSnapshot,
        createdAt: priceRecommendations.createdAt,
        propertyName: properties.name,
        propertyCurrency: properties.currency,
      })
      .from(priceRecommendations)
      .leftJoin(properties, eq(priceRecommendations.propertyId, properties.id));

    const rows = status
      ? await base.where(eq(priceRecommendations.status, status)).orderBy(desc(priceRecommendations.createdAt))
      : await base.orderBy(desc(priceRecommendations.createdAt));
    return rows;
  }

  async createPriceRecommendation(rec: InsertPriceRecommendation): Promise<PriceRecommendation> {
    const [created] = await db
      .insert(priceRecommendations)
      .values({ ...rec, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async updatePriceRecommendation(id: number, updates: Partial<InsertPriceRecommendation>): Promise<PriceRecommendation | undefined> {
    const [updated] = await db
      .update(priceRecommendations)
      .set(updates)
      .where(eq(priceRecommendations.id, id))
      .returning();
    return updated;
  }

  async getPendingPriceRecommendationCount(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceRecommendations)
      .where(eq(priceRecommendations.status, "pending"));
    return row?.count || 0;
  }

  async expirePendingRecommendationsForProperty(propertyId: number): Promise<void> {
    await db
      .update(priceRecommendations)
      .set({ status: "superseded", reviewedAt: new Date().toISOString() })
      .where(and(eq(priceRecommendations.propertyId, propertyId), eq(priceRecommendations.status, "pending")));
  }

  async getTickets(status?: string): Promise<TicketWithMeta[]> {
    const base = db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        description: tickets.description,
        channel: tickets.channel,
        priority: tickets.priority,
        status: tickets.status,
        propertyId: tickets.propertyId,
        guestName: tickets.guestName,
        sourceRefId: tickets.sourceRefId,
        aiCategory: tickets.aiCategory,
        needsHost: tickets.needsHost,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
        propertyName: properties.name,
      })
      .from(tickets)
      .leftJoin(properties, eq(tickets.propertyId, properties.id));

    const rows = status
      ? await base.where(eq(tickets.status, status)).orderBy(desc(tickets.createdAt))
      : await base.orderBy(desc(tickets.createdAt));
    return rows;
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    const [row] = await db.select().from(tickets).where(eq(tickets.id, id));
    return row;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [created] = await db
      .insert(tickets)
      .values({ ...ticket, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async updateTicket(id: number, updates: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const [updated] = await db
      .update(tickets)
      .set(updates)
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  async getTicketStats(): Promise<{ open: number; escalated: number; resolved: number }> {
    const rows = await db
      .select({ status: tickets.status, count: sql<number>`count(*)::int` })
      .from(tickets)
      .groupBy(tickets.status);
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    return {
      open: byStatus["open"] || 0,
      escalated: byStatus["escalated"] || 0,
      resolved: byStatus["resolved"] || 0,
    };
  }

  async getTicketEvents(ticketId: number): Promise<TicketEvent[]> {
    return db
      .select()
      .from(ticketEvents)
      .where(eq(ticketEvents.ticketId, ticketId))
      .orderBy(asc(ticketEvents.createdAt));
  }

  async addTicketEvent(event: InsertTicketEvent): Promise<TicketEvent> {
    const [created] = await db
      .insert(ticketEvents)
      .values({ ...event, createdAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async findUntriagedEnquiries(): Promise<Enquiry[]> {
    return db
      .select()
      .from(enquiries)
      .where(
        and(
          eq(enquiries.status, "new"),
          sql`NOT EXISTS (SELECT 1 FROM ${tickets} WHERE ${tickets.channel} = 'enquiry' AND ${tickets.sourceRefId} = ${enquiries.id})`,
        ),
      )
      .orderBy(desc(enquiries.createdAt))
      .limit(50);
  }

  async findUntriagedLowReviews(): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(
        and(
          lte(reviews.rating, 3),
          sql`NOT EXISTS (SELECT 1 FROM ${tickets} WHERE ${tickets.channel} = 'review' AND ${tickets.sourceRefId} = ${reviews.id})`,
        ),
      )
      .limit(50);
  }

  async hasTicketForSource(channel: string, sourceRefId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(and(eq(tickets.channel, channel), eq(tickets.sourceRefId, sourceRefId)))
      .limit(1);
    return Boolean(row);
  }
}

export const storage = new DatabaseStorage();
