import { describe, it, expect } from "vitest";
import { DatabaseStorage } from "../server/storage";
import { runTriage } from "../server/tickets/engine";
import { makeProperty, makeEnquiry, makeReview } from "./helpers/factories";

const storage = new DatabaseStorage();

describe("Ticket triage engine", () => {
  it("creates a ticket from a new enquiry with a created event, and does not duplicate on re-run", async () => {
    const property = await storage.createProperty(makeProperty());
    const enquiry = await storage.createEnquiry(
      makeEnquiry(property.id, { status: "new", message: "Hi, is the pool heated?" }),
    );

    const firstRun = await runTriage();
    expect(firstRun.enquiriesTriaged).toBe(1);

    const tickets = await storage.getTickets();
    expect(tickets).toHaveLength(1);
    const ticket = tickets[0];
    expect(ticket.channel).toBe("enquiry");
    expect(ticket.sourceRefId).toBe(enquiry.id);
    expect(ticket.status).toBe("open");
    expect(ticket.needsHost).toBe(false);

    const events = await storage.getTicketEvents(ticket.id);
    expect(events.some((e) => e.type === "created")).toBe(true);
    expect(events.some((e) => e.type === "triaged")).toBe(true);

    // second run: already triaged, no duplicate
    const secondRun = await runTriage();
    expect(secondRun.enquiriesTriaged).toBe(0);
    expect(await storage.getTickets()).toHaveLength(1);
  });

  it("escalates urgent-sounding enquiries to the host", async () => {
    const property = await storage.createProperty(makeProperty());
    await storage.createEnquiry(
      makeEnquiry(property.id, { status: "new", message: "EMERGENCY: guest is locked out and there is a water leak everywhere!" }),
    );

    const result = await runTriage();
    expect(result.enquiriesTriaged).toBe(1);

    const tickets = await storage.getTickets();
    expect(tickets[0].priority).toBe("urgent");
    expect(tickets[0].needsHost).toBe(true);
    expect(tickets[0].status).toBe("escalated");
    const events = await storage.getTicketEvents(tickets[0].id);
    expect(events.some((e) => e.type === "escalated")).toBe(true);
  });

  it("auto-creates an escalated ticket for a low review and always flags needs_host", async () => {
    const property = await storage.createProperty(makeProperty());
    await storage.createReview(
      makeReview(property.id, {
        guestName: "Unhappy Guest",
        platform: "airbnb",
        rating: 2,
        reviewText: "Place was dirty and the AC was broken.",
      }),
    );

    const result = await runTriage();
    expect(result.reviewsTriaged).toBe(1);

    const tickets = await storage.getTickets();
    expect(tickets).toHaveLength(1);
    const ticket = tickets[0];
    expect(ticket.channel).toBe("review");
    expect(ticket.priority).toBe("high");
    expect(ticket.needsHost).toBe(true);
    expect(ticket.status).toBe("escalated");

    // no duplicate on second run
    const second = await runTriage();
    expect(second.reviewsTriaged).toBe(0);
    expect(await storage.getTickets()).toHaveLength(1);
  });

  it("ignores high-rating reviews (no ticket)", async () => {
    const property = await storage.createProperty(makeProperty());
    await storage.createReview(
      makeReview(property.id, {
        guestName: "Happy Guest",
        platform: "airbnb",
        rating: 5,
        reviewText: "Loved it!",
      }),
    );

    const result = await runTriage();
    expect(result.reviewsTriaged).toBe(0);
    expect(await storage.getTickets()).toHaveLength(0);
  });

  it("resolve flow sets resolvedAt and clears needsHost", async () => {
    const property = await storage.createProperty(makeProperty());
    await storage.createEnquiry(
      makeEnquiry(property.id, { status: "new", message: "Question about parking" }),
    );
    await runTriage();

    const ticket = (await storage.getTickets())[0];
    await storage.updateTicket(ticket.id, {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      needsHost: false,
    });
    await storage.addTicketEvent({ ticketId: ticket.id, type: "resolved", body: "Resolved" });

    const resolved = await storage.getTickets("resolved");
    expect(resolved).toHaveLength(1);
    expect(resolved[0].resolvedAt).toBeTruthy();
    expect(resolved[0].needsHost).toBe(false);
  });
});
