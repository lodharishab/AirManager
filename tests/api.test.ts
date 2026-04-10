import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Server } from "http";
import type { Express } from "express";
import { createTestApp } from "./helpers/test-app";
import { DatabaseStorage } from "../server/storage";
import { makeProperty, makeBooking } from "./helpers/factories";
import bcrypt from "bcrypt";

let app: Express;
let httpServer: Server;
const storage = new DatabaseStorage();

beforeAll(async () => {
  const result = await createTestApp();
  app = result.app;
  httpServer = result.httpServer;
});

afterAll(async () => {
  httpServer.close();
});

async function registerAndLogin(agent: request.SuperAgentTest, username = "testuser", password = "password123") {
  await agent
    .post("/api/auth/register")
    .send({ username, password });
  return agent;
}

describe("Auth Routes", () => {
  it("POST /api/auth/register - creates a new user", async () => {
    const agent = request.agent(app);
    const res = await agent
      .post("/api/auth/register")
      .send({ username: "newuser1", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe("newuser1");
    expect(res.body.id).toBeDefined();
  });

  it("POST /api/auth/register - rejects short username", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "ab", password: "password123" });
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/register - rejects short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "validname", password: "12345" });
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/register - rejects duplicate username", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/register")
      .send({ username: "dupuser", password: "password123" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "dupuser", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("POST /api/auth/register - rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/login - authenticates valid user", async () => {
    const hashed = await bcrypt.hash("mypassword", 12);
    await storage.createUser({ username: "loginuser", password: hashed });
    const agent = request.agent(app);
    const res = await agent
      .post("/api/auth/login")
      .send({ username: "loginuser", password: "mypassword" });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("loginuser");
  });

  it("POST /api/auth/login - rejects wrong password", async () => {
    const hashed = await bcrypt.hash("correct", 12);
    await storage.createUser({ username: "wrongpwuser", password: hashed });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "wrongpwuser", password: "incorrect" });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login - rejects non-existent user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ghost", password: "password123" });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login - rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/logout - logs out", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "logoutuser", "password123");
    const res = await agent.post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
  });

  it("GET /api/auth/me - returns current user when authenticated", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "meuser", "password123");
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("meuser");
  });

  it("GET /api/auth/me - returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("Property Routes", () => {
  it("GET /api/properties - returns 401 without auth", async () => {
    const res = await request(app).get("/api/properties");
    expect(res.status).toBe(401);
  });

  it("GET /api/properties - lists properties when authenticated", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "propuser1", "password123");
    await storage.createProperty(makeProperty());
    const res = await agent.get("/api/properties");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/properties - creates a property", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "propuser2", "password123");
    const res = await agent
      .post("/api/properties")
      .send({
        name: "API Test Property",
        address: "456 API St",
        nightlyRate: 150,
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("API Test Property");
  });

  it("POST /api/properties - rejects invalid data", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "propuser3", "password123");
    const res = await agent
      .post("/api/properties")
      .send({ name: "Missing fields" });
    expect(res.status).toBe(400);
  });

  it("GET /api/properties/:id - gets a property", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "propuser4", "password123");
    const prop = await storage.createProperty(makeProperty({ name: "Fetch Me" }));
    const res = await agent.get(`/api/properties/${prop.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Fetch Me");
  });

  it("GET /api/properties/:id - returns 404 for non-existent", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "propuser5", "password123");
    const res = await agent.get("/api/properties/999999");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/properties/:id - updates a property", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "propuser6", "password123");
    const prop = await storage.createProperty(makeProperty());
    const res = await agent
      .patch(`/api/properties/${prop.id}`)
      .send({ name: "Patched Name" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Patched Name");
  });

  it("DELETE /api/properties/:id - deletes a property", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "propuser7", "password123");
    const prop = await storage.createProperty(makeProperty());
    const res = await agent.delete(`/api/properties/${prop.id}`);
    expect(res.status).toBe(204);
  });

  it("POST /api/properties - returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/properties")
      .send({ name: "No Auth", address: "123 St", nightlyRate: 100 });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/properties/:id - returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/properties/1")
      .send({ name: "No Auth" });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/properties/:id - returns 401 without auth", async () => {
    const res = await request(app).delete("/api/properties/1");
    expect(res.status).toBe(401);
  });
});

describe("Booking Routes", () => {
  it("GET /api/bookings - returns 401 without auth", async () => {
    const res = await request(app).get("/api/bookings");
    expect(res.status).toBe(401);
  });

  it("GET /api/bookings - lists bookings when authenticated", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "bookuser1", "password123");
    const res = await agent.get("/api/bookings");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /api/bookings - creates a booking", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "bookuser2", "password123");
    const prop = await storage.createProperty(makeProperty());
    const res = await agent
      .post("/api/bookings")
      .send({
        propertyId: prop.id,
        guestName: "API Guest",
        checkIn: "2025-08-01",
        checkOut: "2025-08-05",
        totalAmount: 600,
      });
    expect(res.status).toBe(201);
    expect(res.body.guestName).toBe("API Guest");
  });

  it("POST /api/bookings - rejects invalid data", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "bookuser3", "password123");
    const res = await agent
      .post("/api/bookings")
      .send({ guestName: "Missing fields" });
    expect(res.status).toBe(400);
  });

  it("POST /api/bookings - rejects overlapping booking", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "bookuser4", "password123");
    const prop = await storage.createProperty(makeProperty());
    await agent.post("/api/bookings").send({
      propertyId: prop.id,
      guestName: "First Guest",
      checkIn: "2025-09-01",
      checkOut: "2025-09-10",
      totalAmount: 900,
    });
    const res = await agent.post("/api/bookings").send({
      propertyId: prop.id,
      guestName: "Overlap Guest",
      checkIn: "2025-09-05",
      checkOut: "2025-09-15",
      totalAmount: 1000,
    });
    expect(res.status).toBe(409);
  });

  it("POST /api/bookings - rejects non-existent property", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "bookuser5", "password123");
    const res = await agent.post("/api/bookings").send({
      propertyId: 999999,
      guestName: "Ghost Property Guest",
      checkIn: "2025-10-01",
      checkOut: "2025-10-05",
      totalAmount: 400,
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/bookings/:id - updates a booking", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "bookuser6", "password123");
    const prop = await storage.createProperty(makeProperty());
    const booking = await storage.createBooking(makeBooking(prop.id));
    const res = await agent
      .patch(`/api/bookings/${booking.id}`)
      .send({ status: "current" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("current");
  });

  it("PATCH /api/bookings/:id - returns 404 for non-existent", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "bookuser7", "password123");
    const res = await agent
      .patch("/api/bookings/999999")
      .send({ status: "current" });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/bookings/:id - soft-deletes a booking", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, "bookuser8", "password123");
    const prop = await storage.createProperty(makeProperty());
    const booking = await storage.createBooking(makeBooking(prop.id));
    const res = await agent.delete(`/api/bookings/${booking.id}`);
    expect(res.status).toBe(204);
  });

  it("POST /api/bookings - returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .send({ propertyId: 1, guestName: "No Auth", checkIn: "2025-08-01", checkOut: "2025-08-05", totalAmount: 400 });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/bookings/:id - returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/bookings/1")
      .send({ status: "current" });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/bookings/:id - returns 401 without auth", async () => {
    const res = await request(app).delete("/api/bookings/1");
    expect(res.status).toBe(401);
  });
});
