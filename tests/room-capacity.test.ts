import { pool } from "../server/db";
import { describe, expect, it } from 'vitest';
import { DatabaseStorage } from '../server/storage';
import { makeBooking, makeProperty, makeRoom } from './helpers/factories';

const storage = new DatabaseStorage();

describe('Room inventory capacity guard', () => {
  it('rejects shrinking a room type below its allocated reservations and keeps the room intact', async () => {
    const p = await storage.createProperty(makeProperty({ bookingMode: 'room_based' }));
    const room = await storage.createRoom(makeRoom(p.id, { roomType: 'Garden', roomCount: 2 }));
    await storage.createBooking(makeBooking(p.id, { roomId: room.id, roomCount: 2, checkIn: '2099-01-01', checkOut: '2099-01-03' }));
    await expect(storage.updateRoom(room.id, { roomCount: 1 })).rejects.toThrow('oversell');
    expect((await storage.getRoom(room.id))?.roomCount).toBe(2);
  });

  it('rejects deleting a room type that has active reservations', async () => {
    const p = await storage.createProperty(makeProperty({ bookingMode: 'room_based' }));
    const room = await storage.createRoom(makeRoom(p.id, { roomCount: 2 }));
    await storage.createBooking(makeBooking(p.id, { roomId: room.id, roomCount: 1 }));
    await expect(storage.deleteRoom(room.id)).rejects.toThrow('Reassign');
    expect(await storage.getRoom(room.id)).toBeDefined();
  });

  it('rejects deleting a room type when unassigned bookings consume total capacity', async () => {
    const p = await storage.createProperty(makeProperty({ bookingMode: 'room_based' }));
    await storage.createRoom(makeRoom(p.id, { roomType: 'Keep', roomCount: 2 }));
    const spare = await storage.createRoom(makeRoom(p.id, { roomType: 'Spare', roomCount: 1 }));
    await storage.createBooking(makeBooking(p.id, { roomCount: 3, checkIn: '2099-02-01', checkOut: '2099-02-03' }));
    await expect(storage.deleteRoom(spare.id)).rejects.toThrow('oversell');
  });

  it('allows safe inventory changes: growth and a shrink that still fits', async () => {
    const p = await storage.createProperty(makeProperty({ bookingMode: 'room_based' }));
    const room = await storage.createRoom(makeRoom(p.id, { roomCount: 2 }));
    await storage.createBooking(makeBooking(p.id, { roomId: room.id, roomCount: 1, checkIn: '2099-03-01', checkOut: '2099-03-02' }));
    await expect(storage.updateRoom(room.id, { roomCount: 5 })).resolves.toBeDefined();
    await expect(storage.updateRoom(room.id, { roomCount: 1 })).resolves.toBeDefined();
  });

  it('enforces the same rule at the database level when storage is bypassed', async () => {
    const p = await storage.createProperty(makeProperty({ bookingMode: 'room_based' }));
    const room = await storage.createRoom(makeRoom(p.id, { roomCount: 2 }));
    await storage.createBooking(makeBooking(p.id, { roomId: room.id, roomCount: 2, checkIn: '2099-04-01', checkOut: '2099-04-03' }));
    await expect(pool.query('UPDATE rooms SET room_count = 1 WHERE id = $1', [room.id])).rejects.toThrow('ROOM_CAPACITY_VIOLATION');
    expect((await storage.getRoom(room.id))?.roomCount).toBe(2);
  });

  it('allows re-creating a soft-deleted property with the same name and address', async () => {
    const props = makeProperty({ name: 'Dup Property', address: '1 Dup Street' });
    const p = await storage.createProperty(props);
    await storage.deleteProperty(p.id);
    const again = await storage.createProperty({ ...props });
    expect(again.id).not.toBe(p.id);
    await expect(storage.createProperty({ ...props })).rejects.toThrow();
  });
});
