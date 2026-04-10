import { describe, it, expect } from "vitest";
import { DatabaseStorage } from "../server/storage";
import {
  makeUser, makeProperty, makeBooking, makeConversation, makeMessage,
  makeExpense, makeEnquiry, makeReview, makeHousekeepingTask,
  makeNotification, makeRoom, makePropertyLink, makeGalleryImage,
} from "./helpers/factories";

const storage = new DatabaseStorage();

describe("DatabaseStorage - Users", () => {
  it("creates and retrieves a user by id", async () => {
    const user = await storage.createUser(makeUser());
    const found = await storage.getUser(user.id);
    expect(found).toBeDefined();
    expect(found!.username).toBe(user.username);
  });

  it("retrieves a user by username", async () => {
    const user = await storage.createUser(makeUser({ username: "findme" }));
    const found = await storage.getUserByUsername("findme");
    expect(found).toBeDefined();
    expect(found!.id).toBe(user.id);
  });

  it("returns undefined for non-existent user", async () => {
    const found = await storage.getUser(999999);
    expect(found).toBeUndefined();
  });

  it("returns undefined for non-existent username", async () => {
    const found = await storage.getUserByUsername("nonexistent");
    expect(found).toBeUndefined();
  });

  it("updates a user", async () => {
    const user = await storage.createUser(makeUser());
    const updated = await storage.updateUser(user.id, { username: "newname" });
    expect(updated).toBeDefined();
    expect(updated!.username).toBe("newname");
  });
});

describe("DatabaseStorage - Properties", () => {
  it("creates and lists properties", async () => {
    await storage.createProperty(makeProperty());
    await storage.createProperty(makeProperty());
    const result = await storage.getProperties();
    expect(result.data.length).toBe(2);
    expect(result.total).toBe(2);
  });

  it("gets a property by id", async () => {
    const prop = await storage.createProperty(makeProperty({ name: "My Villa" }));
    const found = await storage.getProperty(prop.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("My Villa");
  });

  it("returns undefined for non-existent property", async () => {
    const found = await storage.getProperty(999999);
    expect(found).toBeUndefined();
  });

  it("updates a property", async () => {
    const prop = await storage.createProperty(makeProperty());
    const updated = await storage.updateProperty(prop.id, { name: "Updated Name" });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated Name");
  });

  it("soft-deletes a property", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.deleteProperty(prop.id);
    const found = await storage.getProperty(prop.id);
    expect(found).toBeUndefined();
  });

  it("soft-deletes cascade: bookings are soft-deleted too", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createBooking(makeBooking(prop.id));
    await storage.deleteProperty(prop.id);
    const bookings = await storage.getBookings();
    expect(bookings.data.length).toBe(0);
  });

  it("supports search filtering", async () => {
    await storage.createProperty(makeProperty({ name: "Beach House" }));
    await storage.createProperty(makeProperty({ name: "Mountain Lodge" }));
    const result = await storage.getProperties({ search: "Beach" });
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe("Beach House");
  });

  it("supports pagination", async () => {
    await storage.createProperty(makeProperty());
    await storage.createProperty(makeProperty());
    await storage.createProperty(makeProperty());
    const page1 = await storage.getProperties({ page: 1, limit: 2 });
    expect(page1.data.length).toBe(2);
    expect(page1.total).toBe(3);
    const page2 = await storage.getProperties({ page: 2, limit: 2 });
    expect(page2.data.length).toBe(1);
  });
});

describe("DatabaseStorage - Rooms", () => {
  it("creates and lists rooms by property", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createRoom(makeRoom(prop.id, { roomType: "Standard" }));
    await storage.createRoom(makeRoom(prop.id, { roomType: "Deluxe" }));
    const rooms = await storage.getRoomsByProperty(prop.id);
    expect(rooms.length).toBe(2);
  });

  it("gets a room by id", async () => {
    const prop = await storage.createProperty(makeProperty());
    const room = await storage.createRoom(makeRoom(prop.id));
    const found = await storage.getRoom(room.id);
    expect(found).toBeDefined();
    expect(found!.roomType).toBe("Standard");
  });

  it("updates a room", async () => {
    const prop = await storage.createProperty(makeProperty());
    const room = await storage.createRoom(makeRoom(prop.id));
    const updated = await storage.updateRoom(room.id, { nightlyRate: 200 });
    expect(updated!.nightlyRate).toBe(200);
  });

  it("deletes a room", async () => {
    const prop = await storage.createProperty(makeProperty());
    const room = await storage.createRoom(makeRoom(prop.id));
    await storage.deleteRoom(room.id);
    const found = await storage.getRoom(room.id);
    expect(found).toBeUndefined();
  });
});

describe("DatabaseStorage - PropertyLinks", () => {
  it("creates and lists links for a property", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createPropertyLink(makePropertyLink(prop.id, { label: "Airbnb" }));
    const links = await storage.getPropertyLinks(prop.id);
    expect(links.length).toBe(1);
    expect(links[0].label).toBe("Airbnb");
  });

  it("updates a link", async () => {
    const prop = await storage.createProperty(makeProperty());
    const link = await storage.createPropertyLink(makePropertyLink(prop.id));
    const updated = await storage.updatePropertyLink(link.id, { label: "VRBO" });
    expect(updated).toBeDefined();
    expect(updated!.label).toBe("VRBO");
  });

  it("deletes a link", async () => {
    const prop = await storage.createProperty(makeProperty());
    const link = await storage.createPropertyLink(makePropertyLink(prop.id));
    await storage.deletePropertyLink(link.id);
    const links = await storage.getPropertyLinks(prop.id);
    expect(links.length).toBe(0);
  });
});

describe("DatabaseStorage - Bookings", () => {
  it("creates and lists bookings", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createBooking(makeBooking(prop.id));
    const result = await storage.getBookings();
    expect(result.data.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it("gets a booking by id", async () => {
    const prop = await storage.createProperty(makeProperty());
    const booking = await storage.createBooking(makeBooking(prop.id, { guestName: "Alice" }));
    const found = await storage.getBooking(booking.id);
    expect(found).toBeDefined();
    expect(found!.guestName).toBe("Alice");
  });

  it("returns undefined for non-existent booking", async () => {
    const found = await storage.getBooking(999999);
    expect(found).toBeUndefined();
  });

  it("updates a booking", async () => {
    const prop = await storage.createProperty(makeProperty());
    const booking = await storage.createBooking(makeBooking(prop.id));
    const updated = await storage.updateBooking(booking.id, { status: "current" });
    expect(updated!.status).toBe("current");
  });

  it("soft-deletes a booking", async () => {
    const prop = await storage.createProperty(makeProperty());
    const booking = await storage.createBooking(makeBooking(prop.id));
    await storage.deleteBooking(booking.id);
    const found = await storage.getBooking(booking.id);
    expect(found).toBeUndefined();
  });

  it("detects overlapping bookings", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createBooking(makeBooking(prop.id, {
      checkIn: "2025-07-01",
      checkOut: "2025-07-10",
    }));
    const hasOverlap = await storage.hasOverlappingBooking(prop.id, "2025-07-05", "2025-07-15");
    expect(hasOverlap).toBe(true);
  });

  it("no overlap for non-conflicting dates", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createBooking(makeBooking(prop.id, {
      checkIn: "2025-07-01",
      checkOut: "2025-07-10",
    }));
    const hasOverlap = await storage.hasOverlappingBooking(prop.id, "2025-07-10", "2025-07-15");
    expect(hasOverlap).toBe(false);
  });

  it("excludes a booking from overlap check", async () => {
    const prop = await storage.createProperty(makeProperty());
    const booking = await storage.createBooking(makeBooking(prop.id, {
      checkIn: "2025-07-01",
      checkOut: "2025-07-10",
    }));
    const hasOverlap = await storage.hasOverlappingBooking(prop.id, "2025-07-01", "2025-07-10", booking.id);
    expect(hasOverlap).toBe(false);
  });

  it("getAllBookings returns flat array", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createBooking(makeBooking(prop.id));
    const all = await storage.getAllBookings();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBe(1);
  });
});

describe("DatabaseStorage - Conversations & Messages", () => {
  it("creates and lists conversations", async () => {
    await storage.createConversation(makeConversation());
    const all = await storage.getConversations();
    expect(all.length).toBe(1);
  });

  it("gets a conversation by id", async () => {
    const conv = await storage.createConversation(makeConversation({ guestName: "Bob" }));
    const found = await storage.getConversation(conv.id);
    expect(found).toBeDefined();
    expect(found!.guestName).toBe("Bob");
  });

  it("creates and lists messages for a conversation", async () => {
    const conv = await storage.createConversation(makeConversation());
    await storage.createMessage(makeMessage(conv.id, { content: "Hi" }));
    await storage.createMessage(makeMessage(conv.id, { content: "Hello" }));
    const msgs = await storage.getMessages(conv.id);
    expect(msgs.length).toBe(2);
  });
});

describe("DatabaseStorage - Expenses", () => {
  it("creates and lists expenses", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createExpense(makeExpense(prop.id));
    const result = await storage.getExpenses();
    expect(result.data.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it("gets an expense by id", async () => {
    const prop = await storage.createProperty(makeProperty());
    const expense = await storage.createExpense(makeExpense(prop.id, { amount: 300 }));
    const found = await storage.getExpense(expense.id);
    expect(found).toBeDefined();
    expect(found!.amount).toBe(300);
  });

  it("updates an expense", async () => {
    const prop = await storage.createProperty(makeProperty());
    const expense = await storage.createExpense(makeExpense(prop.id));
    const updated = await storage.updateExpense(expense.id, { amount: 500 });
    expect(updated!.amount).toBe(500);
  });

  it("deletes an expense", async () => {
    const prop = await storage.createProperty(makeProperty());
    const expense = await storage.createExpense(makeExpense(prop.id));
    await storage.deleteExpense(expense.id);
    const found = await storage.getExpense(expense.id);
    expect(found).toBeUndefined();
  });
});

describe("DatabaseStorage - Enquiries", () => {
  it("creates and lists enquiries", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createEnquiry(makeEnquiry(prop.id));
    const result = await storage.getEnquiries();
    expect(result.data.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it("gets an enquiry by id", async () => {
    const prop = await storage.createProperty(makeProperty());
    const enquiry = await storage.createEnquiry(makeEnquiry(prop.id));
    const found = await storage.getEnquiry(enquiry.id);
    expect(found).toBeDefined();
  });

  it("updates an enquiry", async () => {
    const prop = await storage.createProperty(makeProperty());
    const enquiry = await storage.createEnquiry(makeEnquiry(prop.id));
    const updated = await storage.updateEnquiry(enquiry.id, { status: "responded" });
    expect(updated!.status).toBe("responded");
  });

  it("deletes an enquiry", async () => {
    const prop = await storage.createProperty(makeProperty());
    const enquiry = await storage.createEnquiry(makeEnquiry(prop.id));
    await storage.deleteEnquiry(enquiry.id);
    const found = await storage.getEnquiry(enquiry.id);
    expect(found).toBeUndefined();
  });
});

describe("DatabaseStorage - Reviews", () => {
  it("creates and lists reviews", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createReview(makeReview(prop.id));
    const result = await storage.getReviews();
    expect(result.data.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it("gets reviews by property", async () => {
    const prop1 = await storage.createProperty(makeProperty());
    const prop2 = await storage.createProperty(makeProperty());
    await storage.createReview(makeReview(prop1.id));
    await storage.createReview(makeReview(prop2.id));
    const reviews = await storage.getReviewsByProperty(prop1.id);
    expect(reviews.length).toBe(1);
  });

  it("gets a review by id", async () => {
    const prop = await storage.createProperty(makeProperty());
    const review = await storage.createReview(makeReview(prop.id, { rating: 3 }));
    const found = await storage.getReview(review.id);
    expect(found!.rating).toBe(3);
  });

  it("updates a review", async () => {
    const prop = await storage.createProperty(makeProperty());
    const review = await storage.createReview(makeReview(prop.id));
    const updated = await storage.updateReview(review.id, { rating: 2 });
    expect(updated!.rating).toBe(2);
  });

  it("deletes a review", async () => {
    const prop = await storage.createProperty(makeProperty());
    const review = await storage.createReview(makeReview(prop.id));
    await storage.deleteReview(review.id);
    const found = await storage.getReview(review.id);
    expect(found).toBeUndefined();
  });
});

describe("DatabaseStorage - HousekeepingTasks", () => {
  it("creates and lists tasks", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createHousekeepingTask(makeHousekeepingTask(prop.id));
    const result = await storage.getHousekeepingTasks();
    expect(result.data.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it("gets a task by id", async () => {
    const prop = await storage.createProperty(makeProperty());
    const task = await storage.createHousekeepingTask(makeHousekeepingTask(prop.id, { title: "Mop floor" }));
    const found = await storage.getHousekeepingTask(task.id);
    expect(found!.title).toBe("Mop floor");
  });

  it("updates a task", async () => {
    const prop = await storage.createProperty(makeProperty());
    const task = await storage.createHousekeepingTask(makeHousekeepingTask(prop.id));
    const updated = await storage.updateHousekeepingTask(task.id, { status: "completed" });
    expect(updated!.status).toBe("completed");
  });

  it("deletes a task", async () => {
    const prop = await storage.createProperty(makeProperty());
    const task = await storage.createHousekeepingTask(makeHousekeepingTask(prop.id));
    await storage.deleteHousekeepingTask(task.id);
    const found = await storage.getHousekeepingTask(task.id);
    expect(found).toBeUndefined();
  });
});

describe("DatabaseStorage - Notifications", () => {
  it("creates and lists notifications", async () => {
    await storage.createNotification(makeNotification());
    const all = await storage.getNotifications();
    expect(all.length).toBe(1);
  });

  it("gets only unread notifications", async () => {
    await storage.createNotification(makeNotification({ isRead: 0 }));
    await storage.createNotification(makeNotification({ isRead: 1 }));
    const unread = await storage.getNotifications(true);
    expect(unread.length).toBe(1);
  });

  it("marks a notification as read", async () => {
    const notif = await storage.createNotification(makeNotification());
    const updated = await storage.markNotificationRead(notif.id);
    expect(updated!.isRead).toBe(1);
  });

  it("marks all notifications as read", async () => {
    await storage.createNotification(makeNotification());
    await storage.createNotification(makeNotification());
    await storage.markAllNotificationsRead();
    const unread = await storage.getNotifications(true);
    expect(unread.length).toBe(0);
  });

  it("counts unread notifications", async () => {
    await storage.createNotification(makeNotification({ isRead: 0 }));
    await storage.createNotification(makeNotification({ isRead: 0 }));
    await storage.createNotification(makeNotification({ isRead: 1 }));
    const count = await storage.getUnreadNotificationCount();
    expect(count).toBe(2);
  });
});

describe("DatabaseStorage - GalleryImages", () => {
  it("creates and lists gallery images", async () => {
    await storage.createGalleryImage(makeGalleryImage());
    const result = await storage.getGalleryImages();
    expect(result.data.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it("gets images by property", async () => {
    const prop = await storage.createProperty(makeProperty());
    await storage.createGalleryImage(makeGalleryImage({ propertyId: prop.id }));
    await storage.createGalleryImage(makeGalleryImage());
    const images = await storage.getGalleryImagesByProperty(prop.id);
    expect(images.length).toBe(1);
  });

  it("updates a gallery image", async () => {
    const img = await storage.createGalleryImage(makeGalleryImage());
    const updated = await storage.updateGalleryImage(img.id, { title: "New Title" });
    expect(updated!.title).toBe("New Title");
  });

  it("deletes a gallery image", async () => {
    const img = await storage.createGalleryImage(makeGalleryImage());
    await storage.deleteGalleryImage(img.id);
    const found = await storage.getGalleryImage(img.id);
    expect(found).toBeUndefined();
  });
});

describe("DatabaseStorage - UserPreferences", () => {
  it("creates preferences for a user", async () => {
    const user = await storage.createUser(makeUser());
    const prefs = await storage.upsertUserPreferences(user.id, { emailNotifications: false });
    expect(prefs.emailNotifications).toBe(false);
    expect(prefs.userId).toBe(user.id);
  });

  it("updates existing preferences", async () => {
    const user = await storage.createUser(makeUser());
    await storage.upsertUserPreferences(user.id, {});
    const updated = await storage.upsertUserPreferences(user.id, { pushNotifications: false });
    expect(updated.pushNotifications).toBe(false);
  });

  it("returns undefined for user without preferences", async () => {
    const found = await storage.getUserPreferences(999999);
    expect(found).toBeUndefined();
  });
});
