import type { Booking, Property } from "@shared/schema";

// Date-only values must never round-trip through a timezone-dependent Date:
// `new Date("YYYY-MM-DD")` is UTC midnight, so getFullYear()/getMonth() shift the
// date by one day on any host running east of UTC (e.g. Asia/Kolkata), and local
// midnight construction shifts it back when converted with toISOString().
function isoDateFromIcal(value: string): string {
  const v = value.trim();
  const compact = v.match(/^(\d{4})(\d{2})(\d{2})(?:[T\s]|$)/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const dashed = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;
  // Values carrying a time component carry their own timezone semantics; UTC
  // conversion is correct for those.
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return v;
}

function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function formatDateValue(dateStr: string): string {
  const iso = isoDateFromIcal(dateStr);
  return iso.replaceAll("-", "");
}

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateIcal(bookings: Booking[], property: Property, _baseUrl: string): string {
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
        dtend = addDaysIso(isoDateFromIcal(dtstart), 1);
      }
      events.push({
        uid: uid || `imported-${Date.now()}-${i}`,
        summary,
        dtstart: isoDateFromIcal(dtstart),
        dtend: isoDateFromIcal(dtend),
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
