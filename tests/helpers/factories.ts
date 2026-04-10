import type {
  InsertUser, InsertProperty, InsertBooking, InsertConversation,
  InsertMessage, InsertExpense, InsertEnquiry, InsertReview,
  InsertHousekeepingTask, InsertNotification, InsertRoom, InsertPropertyLink,
  InsertGalleryImage,
} from "@shared/schema";

let counter = 0;
function uid() {
  return ++counter;
}

export function makeUser(overrides: Partial<InsertUser> = {}): InsertUser {
  const id = uid();
  return {
    username: `testuser${id}`,
    password: `hashedpassword${id}`,
    ...overrides,
  };
}

export function makeProperty(overrides: Partial<InsertProperty> = {}): InsertProperty {
  const id = uid();
  return {
    name: `Test Property ${id}`,
    address: `${id} Test Street`,
    nightlyRate: 100,
    status: "active",
    occupancyRate: 0,
    monthlyRevenue: 0,
    bookingMode: "whole",
    ...overrides,
  };
}

export function makeRoom(propertyId: number, overrides: Partial<InsertRoom> = {}): InsertRoom {
  return {
    propertyId,
    roomType: "Standard",
    roomCount: 5,
    nightlyRate: 80,
    ...overrides,
  };
}

export function makePropertyLink(propertyId: number, overrides: Partial<InsertPropertyLink> = {}): InsertPropertyLink {
  return {
    propertyId,
    label: "Booking Link",
    url: "https://example.com",
    linkType: "other",
    ...overrides,
  };
}

export function makeBooking(propertyId: number, overrides: Partial<InsertBooking> = {}): InsertBooking {
  const id = uid();
  return {
    propertyId,
    guestName: `Guest ${id}`,
    checkIn: "2025-06-01",
    checkOut: "2025-06-05",
    status: "upcoming",
    totalAmount: 400,
    ...overrides,
  };
}

export function makeConversation(overrides: Partial<InsertConversation> = {}): InsertConversation {
  const id = uid();
  return {
    guestName: `Guest ${id}`,
    propertyName: `Property ${id}`,
    unreadCount: 0,
    ...overrides,
  };
}

export function makeMessage(conversationId: number, overrides: Partial<InsertMessage> = {}): InsertMessage {
  return {
    conversationId,
    senderName: "Test Sender",
    senderType: "guest",
    content: "Hello there!",
    sentAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeExpense(propertyId: number, overrides: Partial<InsertExpense> = {}): InsertExpense {
  return {
    propertyId,
    category: "maintenance",
    amount: 150,
    date: "2025-06-01",
    description: "Test expense",
    ...overrides,
  };
}

export function makeEnquiry(propertyId: number, overrides: Partial<InsertEnquiry> = {}): InsertEnquiry {
  const id = uid();
  return {
    propertyId,
    guestName: `Enquirer ${id}`,
    guestEmail: `enquirer${id}@test.com`,
    message: "I have a question",
    status: "new",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeReview(propertyId: number, overrides: Partial<InsertReview> = {}): InsertReview {
  const id = uid();
  return {
    propertyId,
    guestName: `Reviewer ${id}`,
    platform: "direct",
    rating: 5,
    reviewText: "Great stay!",
    reviewDate: "2025-06-01",
    ...overrides,
  };
}

export function makeHousekeepingTask(propertyId: number, overrides: Partial<InsertHousekeepingTask> = {}): InsertHousekeepingTask {
  return {
    propertyId,
    type: "cleaning",
    title: "Clean room",
    status: "pending",
    priority: "medium",
    ...overrides,
  };
}

export function makeNotification(overrides: Partial<InsertNotification> = {}): InsertNotification {
  return {
    type: "booking_status",
    title: "Test Notification",
    message: "Something happened",
    isRead: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeGalleryImage(overrides: Partial<InsertGalleryImage> = {}): InsertGalleryImage {
  return {
    imageUrl: "https://example.com/image.jpg",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
