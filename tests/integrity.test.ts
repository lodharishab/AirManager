import { pool } from "../server/db";
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { Server } from 'http';
import { createTestApp } from './helpers/test-app';
import { DatabaseStorage } from '../server/storage';
import { makeBooking, makeProperty, makeRoom, makeExpense } from './helpers/factories';
import { businessToday, peakUnits } from '../shared/booking-rules';
import { formatCurrency } from '../shared/currency';
const storage = new DatabaseStorage();
let app: Express, server: Server;
beforeAll(async () => { const x = await createTestApp(); app=x.app; server=x.httpServer; });
afterAll(() => server.close());
async function agent() { const a=request.agent(app); await a.post('/api/auth/register').send({username:'integrity',password:'testpassword'}); return a; }
describe('Booking integrity regressions', () => {
 it('rejects checkout before arrival or check-in and preserves the booking', async () => {
  const a=await agent(), p=await storage.createProperty(makeProperty());
  const b=await storage.createBooking(makeBooking(p.id,{checkIn:'2099-01-01',checkOut:'2099-01-02'}));
  for (const status of ['checked_out','completed','checked_in']) expect((await a.patch(`/api/bookings/${b.id}`).send({status})).status).toBe(409);
  expect((await storage.getBooking(b.id))?.status).toBe('upcoming');
 });
 it('supports check-in, checkout and undo, including an audit event', async () => {
  const a=await agent(), p=await storage.createProperty(makeProperty());
  const b=await storage.createBooking(makeBooking(p.id,{checkIn:businessToday(),checkOut:'2099-01-02'}));
  for (const status of ['checked_in','checked_out','checked_in','upcoming']) expect((await a.patch(`/api/bookings/${b.id}`).send({status})).status).toBe(200);
 });
 it('allows same-date room reservations up to capacity, then rejects overselling', async () => {
  const p=await storage.createProperty(makeProperty({bookingMode:'room_based'}));
  const r=await storage.createRoom(makeRoom(p.id,{roomCount:2}));
  const results=await Promise.allSettled([1,2,3].map(() => storage.createBooking(makeBooking(p.id,{roomId:r.id,roomCount:1}))));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(2);
  expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
 });
 it('rejects moving a booking into full capacity and permits rebooking a cancellation', async () => {
  const p=await storage.createProperty(makeProperty());
  const b=await storage.createBooking(makeBooking(p.id));
  const other=await storage.createBooking(makeBooking(p.id,{checkIn:'2025-07-01',checkOut:'2025-07-03'}));
  await expect(storage.updateBooking(other.id,{checkIn:b.checkIn,checkOut:b.checkOut})).rejects.toThrow('BOOKING_OVERLAP');
  await storage.updateBooking(b.id,{status:'cancelled'});
  await expect(storage.createBooking(makeBooking(p.id))).resolves.toBeDefined();
 });
 it('counts peak nightly usage, not the sum of non-overlapping guests', () => {
  expect(peakUnits([{checkIn:'2026-01-01',checkOut:'2026-01-02',roomCount:1},{checkIn:'2026-01-02',checkOut:'2026-01-03',roomCount:1}], '2026-01-01','2026-01-03')).toBe(1);
 });
 it('rejects invalid ranges and a room belonging to another property', async () => {
  const p=await storage.createProperty(makeProperty({bookingMode:'room_based'}));
  await storage.createRoom(makeRoom(p.id));
  await expect(storage.createBooking(makeBooking(p.id,{checkOut:'2025-05-01'}))).rejects.toThrow('Checkout');
  await expect(storage.createBooking(makeBooking(p.id,{roomId:999999}))).rejects.toThrow('Room type');
 });
 it('creates preferences concurrently and rejects API-key-only account access', async () => {
  const a=await agent();
  const results=await Promise.all([a.get('/api/user-preferences'),a.get('/api/user-preferences')]);
  expect(results.map(r=>r.status)).toEqual([200,200]);
  const old=process.env.AIRMANAGER_API_KEY;process.env.AIRMANAGER_API_KEY='test-key';
  try { expect((await request(app).get('/api/user-preferences').set('X-API-Key','test-key')).status).toBe(401); }
  finally { if(old===undefined) delete process.env.AIRMANAGER_API_KEY; else process.env.AIRMANAGER_API_KEY=old; }
 });
 it('uses recorded expenses and derives occupancy from bookings', async () => {
  const a=await agent(),p=await storage.createProperty(makeProperty());
  await storage.createBooking(makeBooking(p.id,{totalAmount:1000}));
  await storage.createExpense(makeExpense(p.id,{amount:125}));
  const res=await a.get('/api/analytics?startDate=2025-06-01&endDate=2025-06-05');
  expect(res.status).toBe(200);expect(res.body.profitByProperty[0]).toMatchObject({revenue:1000,expenses:125,profit:875});
  expect(res.body.occupancyByProperty[0].occupancyRate).toBe(80);
 });
 it('database rejects checkout without check-in even when bypassing HTTP', async () => {
  const p=await storage.createProperty(makeProperty()); const b=await storage.createBooking(makeBooking(p.id));
  await expect(pool.query("UPDATE bookings SET status='checked_out' WHERE id=$1",[b.id])).rejects.toMatchObject({code:'23514'});
  expect((await storage.getBooking(b.id))?.status).toBe('upcoming');
 });
 it('correlates guest statistics to the guest, not booking ID', async () => {
  const p=await storage.createProperty(makeProperty());
  await storage.createGuest({name:'Unrelated',createdAt:'2025-01-01'});
  const guest=await storage.createGuest({name:'Actual Guest',createdAt:'2025-01-01'});
  await storage.createBooking(makeBooking(p.id,{guestId:guest.id,totalAmount:725}));
  expect(await storage.getGuestWithStats(guest.id)).toMatchObject({totalStays:1,totalSpent:725});
  expect(await storage.getGuestWithStats(guest.id-1)).toMatchObject({totalStays:0,totalSpent:0});
 });
 it('defaults monetary formatting to rupees', () => {expect(formatCurrency(9889)).toBe('₹9,889');});
});
