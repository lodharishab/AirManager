import { describe, it, expect } from "vitest";
import {
  insertPropertySchema,
  insertBookingSchema,
  insertUserSchema,
  insertRoomSchema,
  insertPropertyLinkSchema,
  insertMessageSchema,
  insertConversationSchema,
  insertExpenseSchema,
  insertEnquirySchema,
  insertReviewSchema,
  insertHousekeepingTaskSchema,
  insertNotificationSchema,
  insertGalleryImageSchema,
  insertRevenueDataSchema,
  insertUserPreferencesSchema,
} from "@shared/schema";

describe("insertUserSchema", () => {
  it("accepts valid data", () => {
    const result = insertUserSchema.safeParse({ username: "john", password: "secret123" });
    expect(result.success).toBe(true);
  });

  it("rejects missing username", () => {
    const result = insertUserSchema.safeParse({ password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = insertUserSchema.safeParse({ username: "john" });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for username", () => {
    const result = insertUserSchema.safeParse({ username: 123, password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for password", () => {
    const result = insertUserSchema.safeParse({ username: "john", password: 456 });
    expect(result.success).toBe(false);
  });
});

describe("insertPropertySchema", () => {
  it("accepts valid data with required fields", () => {
    const result = insertPropertySchema.safeParse({
      name: "Beach House",
      address: "123 Ocean Dr",
      nightlyRate: 200,
    });
    expect(result.success).toBe(true);
  });

  it("accepts data with all optional fields", () => {
    const result = insertPropertySchema.safeParse({
      name: "Beach House",
      address: "123 Ocean Dr",
      nightlyRate: 200,
      status: "active",
      occupancyRate: 80,
      monthlyRevenue: 5000,
      description: "A nice place",
      propertyType: "villa",
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      amenities: ["pool", "wifi"],
      bookingMode: "whole",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = insertPropertySchema.safeParse({
      address: "123 Ocean Dr",
      nightlyRate: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing address", () => {
    const result = insertPropertySchema.safeParse({
      name: "Beach House",
      nightlyRate: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing nightlyRate", () => {
    const result = insertPropertySchema.safeParse({
      name: "Beach House",
      address: "123 Ocean Dr",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for nightlyRate", () => {
    const result = insertPropertySchema.safeParse({
      name: "Beach House",
      address: "123 Ocean Dr",
      nightlyRate: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for name", () => {
    const result = insertPropertySchema.safeParse({
      name: 999,
      address: "123 Ocean Dr",
      nightlyRate: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe("insertBookingSchema", () => {
  it("accepts valid data", () => {
    const result = insertBookingSchema.safeParse({
      propertyId: 1,
      guestName: "Jane Doe",
      checkIn: "2025-07-01",
      checkOut: "2025-07-05",
      totalAmount: 800,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing propertyId", () => {
    const result = insertBookingSchema.safeParse({
      guestName: "Jane Doe",
      checkIn: "2025-07-01",
      checkOut: "2025-07-05",
      totalAmount: 800,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing guestName", () => {
    const result = insertBookingSchema.safeParse({
      propertyId: 1,
      checkIn: "2025-07-01",
      checkOut: "2025-07-05",
      totalAmount: 800,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing checkIn", () => {
    const result = insertBookingSchema.safeParse({
      propertyId: 1,
      guestName: "Jane Doe",
      checkOut: "2025-07-05",
      totalAmount: 800,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing totalAmount", () => {
    const result = insertBookingSchema.safeParse({
      propertyId: 1,
      guestName: "Jane Doe",
      checkIn: "2025-07-01",
      checkOut: "2025-07-05",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for propertyId", () => {
    const result = insertBookingSchema.safeParse({
      propertyId: "not-a-number",
      guestName: "Jane Doe",
      checkIn: "2025-07-01",
      checkOut: "2025-07-05",
      totalAmount: 800,
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for totalAmount", () => {
    const result = insertBookingSchema.safeParse({
      propertyId: 1,
      guestName: "Jane Doe",
      checkIn: "2025-07-01",
      checkOut: "2025-07-05",
      totalAmount: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for guestName", () => {
    const result = insertBookingSchema.safeParse({
      propertyId: 1,
      guestName: 123,
      checkIn: "2025-07-01",
      checkOut: "2025-07-05",
      totalAmount: 800,
    });
    expect(result.success).toBe(false);
  });
});

describe("insertRoomSchema", () => {
  it("accepts valid data", () => {
    const result = insertRoomSchema.safeParse({
      propertyId: 1,
      roomType: "Deluxe",
      roomCount: 3,
      nightlyRate: 150,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing roomType", () => {
    const result = insertRoomSchema.safeParse({
      propertyId: 1,
      roomCount: 3,
      nightlyRate: 150,
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for nightlyRate", () => {
    const result = insertRoomSchema.safeParse({
      propertyId: 1,
      roomType: "Deluxe",
      roomCount: 3,
      nightlyRate: "expensive",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertPropertyLinkSchema", () => {
  it("accepts valid data", () => {
    const result = insertPropertyLinkSchema.safeParse({
      propertyId: 1,
      label: "Airbnb",
      url: "https://airbnb.com/listing/123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing label", () => {
    const result = insertPropertyLinkSchema.safeParse({
      propertyId: 1,
      url: "https://airbnb.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for propertyId", () => {
    const result = insertPropertyLinkSchema.safeParse({
      propertyId: "not-a-number",
      label: "Airbnb",
      url: "https://airbnb.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertConversationSchema", () => {
  it("accepts valid data", () => {
    const result = insertConversationSchema.safeParse({
      guestName: "John",
      propertyName: "Beach House",
      unreadCount: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing guestName", () => {
    const result = insertConversationSchema.safeParse({
      propertyName: "Beach House",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for unreadCount", () => {
    const result = insertConversationSchema.safeParse({
      guestName: "John",
      propertyName: "Beach House",
      unreadCount: "many",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertMessageSchema", () => {
  it("accepts valid data", () => {
    const result = insertMessageSchema.safeParse({
      conversationId: 1,
      senderName: "John",
      senderType: "guest",
      content: "Hello",
      sentAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing content", () => {
    const result = insertMessageSchema.safeParse({
      conversationId: 1,
      senderName: "John",
      sentAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for conversationId", () => {
    const result = insertMessageSchema.safeParse({
      conversationId: "not-a-number",
      senderName: "John",
      content: "Hello",
      sentAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertExpenseSchema", () => {
  it("accepts valid data", () => {
    const result = insertExpenseSchema.safeParse({
      propertyId: 1,
      category: "maintenance",
      amount: 200,
      date: "2025-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing amount", () => {
    const result = insertExpenseSchema.safeParse({
      propertyId: 1,
      category: "maintenance",
      date: "2025-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for amount", () => {
    const result = insertExpenseSchema.safeParse({
      propertyId: 1,
      category: "maintenance",
      amount: "expensive",
      date: "2025-06-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertEnquirySchema", () => {
  it("accepts valid data", () => {
    const result = insertEnquirySchema.safeParse({
      propertyId: 1,
      guestName: "Alice",
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing guestName", () => {
    const result = insertEnquirySchema.safeParse({
      propertyId: 1,
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for propertyId", () => {
    const result = insertEnquirySchema.safeParse({
      propertyId: "abc",
      guestName: "Alice",
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertReviewSchema", () => {
  it("accepts valid data", () => {
    const result = insertReviewSchema.safeParse({
      propertyId: 1,
      guestName: "Bob",
      rating: 4,
      reviewDate: "2025-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing rating", () => {
    const result = insertReviewSchema.safeParse({
      propertyId: 1,
      guestName: "Bob",
      reviewDate: "2025-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for rating", () => {
    const result = insertReviewSchema.safeParse({
      propertyId: 1,
      guestName: "Bob",
      rating: "five stars",
      reviewDate: "2025-06-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertHousekeepingTaskSchema", () => {
  it("accepts valid data", () => {
    const result = insertHousekeepingTaskSchema.safeParse({
      propertyId: 1,
      title: "Clean bathroom",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = insertHousekeepingTaskSchema.safeParse({
      propertyId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for propertyId", () => {
    const result = insertHousekeepingTaskSchema.safeParse({
      propertyId: true,
      title: "Clean bathroom",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertNotificationSchema", () => {
  it("accepts valid data", () => {
    const result = insertNotificationSchema.safeParse({
      type: "booking_status",
      title: "New Booking",
      message: "A new booking was created",
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing type", () => {
    const result = insertNotificationSchema.safeParse({
      title: "New Booking",
      message: "A new booking was created",
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing message", () => {
    const result = insertNotificationSchema.safeParse({
      type: "booking_status",
      title: "New Booking",
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for isRead", () => {
    const result = insertNotificationSchema.safeParse({
      type: "booking_status",
      title: "New Booking",
      message: "A new booking was created",
      isRead: "yes",
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertGalleryImageSchema", () => {
  it("accepts valid data", () => {
    const result = insertGalleryImageSchema.safeParse({
      imageUrl: "https://example.com/photo.jpg",
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing imageUrl", () => {
    const result = insertGalleryImageSchema.safeParse({
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for starRating", () => {
    const result = insertGalleryImageSchema.safeParse({
      imageUrl: "https://example.com/photo.jpg",
      starRating: "five",
      createdAt: "2025-06-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertRevenueDataSchema", () => {
  it("accepts valid data", () => {
    const result = insertRevenueDataSchema.safeParse({
      month: "2025-06",
      revenue: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing month", () => {
    const result = insertRevenueDataSchema.safeParse({
      revenue: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing revenue", () => {
    const result = insertRevenueDataSchema.safeParse({
      month: "2025-06",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for revenue", () => {
    const result = insertRevenueDataSchema.safeParse({
      month: "2025-06",
      revenue: "lots",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertUserPreferencesSchema", () => {
  it("accepts valid data with userId", () => {
    const result = insertUserPreferencesSchema.safeParse({
      userId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts data with all preference fields", () => {
    const result = insertUserPreferencesSchema.safeParse({
      userId: 1,
      emailNotifications: false,
      pushNotifications: true,
      bookingAlerts: false,
      messageAlerts: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing userId", () => {
    const result = insertUserPreferencesSchema.safeParse({
      emailNotifications: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for userId", () => {
    const result = insertUserPreferencesSchema.safeParse({
      userId: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type for emailNotifications", () => {
    const result = insertUserPreferencesSchema.safeParse({
      userId: 1,
      emailNotifications: "yes",
    });
    expect(result.success).toBe(false);
  });
});
