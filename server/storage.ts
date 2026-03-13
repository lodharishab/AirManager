import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users, properties, propertyLinks, bookings, messages, conversations, revenueData, galleryImages,
  type User, type InsertUser,
  type Property, type InsertProperty,
  type PropertyLink, type InsertPropertyLink,
  type Booking, type InsertBooking,
  type Message, type InsertMessage,
  type Conversation, type InsertConversation,
  type RevenueData, type InsertRevenueData,
  type GalleryImage, type InsertGalleryImage,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<void>;

  getPropertyLinks(propertyId: number): Promise<PropertyLink[]>;
  createPropertyLink(link: InsertPropertyLink): Promise<PropertyLink>;
  updatePropertyLink(id: number, data: Partial<InsertPropertyLink>): Promise<PropertyLink | undefined>;
  deletePropertyLink(id: number): Promise<void>;

  getBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<void>;

  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  getRevenueData(): Promise<RevenueData[]>;
  createRevenueData(data: InsertRevenueData): Promise<RevenueData>;

  getGalleryImages(): Promise<GalleryImage[]>;
  getGalleryImagesByProperty(propertyId: number): Promise<GalleryImage[]>;
  getGalleryImage(id: number): Promise<GalleryImage | undefined>;
  createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage>;
  updateGalleryImage(id: number, data: Partial<InsertGalleryImage>): Promise<GalleryImage | undefined>;
  deleteGalleryImage(id: number): Promise<void>;
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

  async getProperties(): Promise<Property[]> {
    return db.select().from(properties);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [created] = await db.insert(properties).values(property).returning();
    return created;
  }

  async updateProperty(id: number, data: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db.update(properties).set(data).where(eq(properties.id, id)).returning();
    return updated;
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(propertyLinks).where(eq(propertyLinks.propertyId, id));
    await db.delete(properties).where(eq(properties.id, id));
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

  async getBookings(): Promise<Booking[]> {
    return db.select().from(bookings);
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  }

  async updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
    return updated;
  }

  async deleteBooking(id: number): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
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

  async getGalleryImages(): Promise<GalleryImage[]> {
    return db.select().from(galleryImages);
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
}

export const storage = new DatabaseStorage();
