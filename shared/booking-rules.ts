import type { Booking, InsertBooking, Room } from './schema';

export function businessToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function bookingError(message: string, status = 409): never {
  throw Object.assign(new Error(message), { status });
}
export function validateDates(booking: Pick<InsertBooking, 'checkIn' | 'checkOut'>) {
  for (const value of [booking.checkIn, booking.checkOut]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) bookingError('Use valid dates in YYYY-MM-DD format.', 400);
  }
  if (booking.checkOut <= booking.checkIn) bookingError('Checkout must be after check-in.', 400);
}
export function validateTransition(existing: Booking, next: InsertBooking, today = businessToday()) {
  if (!["upcoming", "checked_in", "current", "checked_out", "completed", "cancelled", "blocked"].includes(next.status || "upcoming")) bookingError("Invalid booking status.", 400);
  if (existing.status === next.status) return;
  const transitions: Record<string, string[]> = {
    upcoming: ['checked_in', 'current', 'cancelled', 'blocked'],
    checked_in: ['checked_out', 'upcoming'], current: ['checked_out', 'upcoming'],
    checked_out: ['checked_in', 'completed'], completed: [],
    cancelled: ['upcoming'], blocked: ['upcoming', 'cancelled'],
  };
  if (!(transitions[existing.status] || []).includes(next.status || 'upcoming')) bookingError('Invalid booking status change. A guest must check in before checking out.');
  if (['checked_in', 'current'].includes(next.status || '') && next.checkIn > today) bookingError('Cannot check in before the arrival date. Update the reservation dates for an early arrival.');
}
export function peakUnits(bookings: Pick<Booking, 'checkIn' | 'checkOut' | 'roomCount'>[], start: string, end: string) {
  const events = new Map<string, number>();
  for (const b of bookings) {
    const a = b.checkIn > start ? b.checkIn : start;
    const z = b.checkOut < end ? b.checkOut : end;
    if (a >= z) continue;
    const units = b.roomCount ?? 1;
    events.set(a, (events.get(a) || 0) + units);
    events.set(z, (events.get(z) || 0) - units);
  }
  let peak = 0, count = 0;
  for (const [, delta] of Array.from(events).sort(([a], [b]) => a.localeCompare(b))) { count += delta; peak = Math.max(peak, count); }
  return peak;
}
export function validateCapacity(candidate: InsertBooking, mode: string, rooms: Room[], others: Booking[]) {
  if (candidate.status === 'cancelled') return;
  const overlaps = others.filter(b => b.status !== 'cancelled' && b.checkIn < candidate.checkOut && b.checkOut > candidate.checkIn);
  if (mode === 'whole') {
    if (overlaps.length) bookingError('BOOKING_OVERLAP');
    return;
  }
  const units = candidate.roomCount ?? 1;
  if (!Number.isInteger(units) || units < 1) bookingError('Room count must be a positive integer.', 400);
  const capacity = rooms.reduce((n, r) => n + r.roomCount, 0);
  if (peakUnits(overlaps, candidate.checkIn, candidate.checkOut) + units > capacity) bookingError('BOOKING_OVERLAP');
  if (candidate.roomId != null) {
    const room = rooms.find(r => r.id === candidate.roomId);
    if (!room) bookingError('Room type does not belong to this property.', 400);
    // Unassigned reservations still consume property capacity, checked above.
    if (peakUnits(overlaps.filter(b => b.roomId === room.id), candidate.checkIn, candidate.checkOut) + units > room.roomCount) bookingError('BOOKING_OVERLAP');
  }
}
export function occupancyPercent(bookings: Booking[], capacity: number, start: string, end: string) {
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (days <= 0 || capacity <= 0) return 0;
  let nights = 0;
  for (const b of bookings) {
    if (['cancelled', 'blocked'].includes(b.status)) continue;
    const a = Math.max(Date.parse(start), Date.parse(b.checkIn));
    const z = Math.min(Date.parse(end), Date.parse(b.checkOut));
    nights += Math.max(0, (z - a) / 86400000) * (b.roomCount ?? 1);
  }
  return Math.round(nights / (capacity * days) * 100);
}
