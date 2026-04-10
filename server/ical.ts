import type { Booking, Property } from "@shared/schema";

function formatDateValue(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateIcal(bookings: Booking[], property: Property, baseUrl: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PropertyManager//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcalText(property.name)}`,
  ];

  for (const booking of bookings) {
    const uid = `booking-${booking.id}@propertymanager`;
    const isExternal = booking.source && booking.source !== "manual";
    const summary = isExternal
      ? "Blocked (External)"
      : booking.guestName || "Blocked";
    const dtstart = formatDateValue(booking.checkIn);
    const dtend = formatDateValue(booking.checkOut);
    const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${dtend}`);
    lines.push(`SUMMARY:${escapeIcalText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcalText(`Property: ${property.name}`)}`);
    lines.push(`STATUS:${booking.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export interface ParsedEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
}

export function parseIcal(icalData: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const eventBlocks = icalData.split("BEGIN:VEVENT");

  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i].split("END:VEVENT")[0];
    const lines = unfoldLines(block);

    let uid = "";
    let summary = "Blocked";
    let dtstart = "";
    let dtend = "";

    for (const line of lines) {
      if (line.startsWith("UID:")) {
        uid = line.slice(4).trim();
      } else if (line.startsWith("SUMMARY:")) {
        summary = line.slice(8).trim();
      } else if (line.startsWith("DTSTART")) {
        dtstart = extractDateValue(line);
      } else if (line.startsWith("DTEND")) {
        dtend = extractDateValue(line);
      }
    }

    if (dtstart) {
      if (!dtend) {
        const d = parseDateValue(dtstart);
        d.setDate(d.getDate() + 1);
        dtend = d.toISOString().split("T")[0];
      }
      events.push({
        uid: uid || `imported-${Date.now()}-${i}`,
        summary,
        dtstart: parseDateValue(dtstart).toISOString().split("T")[0],
        dtend: parseDateValue(dtend).toISOString().split("T")[0],
      });
    }
  }

  return events;
}

function unfoldLines(text: string): string[] {
  const raw = text.replace(/\r\n[ \t]/g, "").replace(/\r/g, "");
  return raw.split("\n").map(l => l.trim()).filter(Boolean);
}

function extractDateValue(line: string): string {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return "";
  return line.slice(colonIdx + 1).trim();
}

function parseDateValue(value: string): Date {
  const clean = value.replace(/[TZ]/g, "");
  if (clean.length === 8) {
    const year = parseInt(clean.slice(0, 4));
    const month = parseInt(clean.slice(4, 6)) - 1;
    const day = parseInt(clean.slice(6, 8));
    return new Date(year, month, day);
  }
  return new Date(value);
}
