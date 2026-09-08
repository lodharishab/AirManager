import { useProperty } from "@/lib/api";
import { useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { Booking, Room } from "@shared/schema";
import { formatCurrency } from "@shared/currency";

function generateInvoiceNumber(bookingId: number, checkInDate: string): string {
  const date = parseISO(checkInDate);
  const year = date.getFullYear();
  const paddedId = String(bookingId).padStart(4, "0");
  return `INV-${year}-${paddedId}`;
}

function formatAmount(amount: number, currency?: string): string {
  return formatCurrency(amount, currency || "INR");
}

export default function Invoice() {
  const [, params] = useRoute("/invoice/:bookingId");
  const bookingId = params?.bookingId ? Number(params.bookingId) : undefined;

  const { data: booking, isLoading: bookingLoading } = useQuery<Booking>({
    queryKey: ["/api/bookings", bookingId],
    enabled: !!bookingId,
  });

  const { data: property, isLoading: propertyLoading } = useProperty(booking?.propertyId);

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    enabled: !!booking?.roomId,
  });

  const room = useMemo(() => {
    if (!booking?.roomId || !rooms) return null;
    return rooms.find(r => r.id === booking.roomId) || null;
  }, [booking?.roomId, rooms]);

  const nights = useMemo(() => {
    if (!booking) return 0;
    return Math.max(1, differenceInCalendarDays(parseISO(booking.checkOut), parseISO(booking.checkIn)));
  }, [booking]);

  const nightlyRate = useMemo(() => {
    if (room) return room.nightlyRate;
    if (property && nights > 0) return Math.round(booking!.totalAmount / nights);
    return 0;
  }, [room, property, nights, booking]);

  const invoiceNumber = useMemo(() => {
    if (!booking) return "";
    return generateInvoiceNumber(booking.id, booking.checkIn);
  }, [booking]);

  const isLoading = bookingLoading || propertyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen print:hidden">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking || !property) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 print:hidden">
        <p className="text-muted-foreground">Booking not found.</p>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-container, .invoice-container * { visibility: visible; }
          .invoice-container { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
          .no-print { display: none !important; }
          nav, aside, header, footer, [data-testid="sidebar"], [class*="sidebar"], [class*="app-layout"] { display: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="no-print flex items-center justify-between mb-6">
          <Button data-testid="button-back-from-invoice" variant="outline" className="rounded-xl" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button data-testid="button-print-invoice" className="rounded-xl text-primary-foreground" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print Invoice
          </Button>
        </div>

        <div className="invoice-container bg-white text-gray-900 rounded-2xl border shadow-sm p-8 sm:p-12" data-testid="invoice-container">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900" data-testid="text-business-name">HostSpace</h1>
              <p className="text-sm text-gray-500 mt-1">Property Management</p>
              <p className="text-sm text-gray-500">GST: 29AABCU9603R1ZM</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wider">Invoice</h2>
              <p className="text-sm text-gray-600 mt-1 font-mono" data-testid="text-invoice-number">{invoiceNumber}</p>
              <p className="text-sm text-gray-500" data-testid="text-invoice-date">
                Date: {format(new Date(), "dd MMM yyyy")}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 my-6" />

          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3>
              <p className="font-semibold text-gray-900" data-testid="text-guest-name">{booking.guestName}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Property</h3>
              <p className="font-semibold text-gray-900" data-testid="text-property-name">{property.name}</p>
              <p className="text-sm text-gray-500" data-testid="text-property-address">{property.address}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10 bg-gray-50 rounded-xl p-5">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Check-in</h3>
              <p className="font-medium text-gray-900" data-testid="text-check-in">{format(parseISO(booking.checkIn), "dd MMM yyyy")}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Check-out</h3>
              <p className="font-medium text-gray-900" data-testid="text-check-out">{format(parseISO(booking.checkOut), "dd MMM yyyy")}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Duration</h3>
              <p className="font-medium text-gray-900" data-testid="text-nights">{nights} night{nights !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <table className="w-full mb-8" data-testid="table-invoice-items">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                <th className="text-center py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Qty</th>
                <th className="text-center py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nights</th>
                <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rate</th>
                <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {room ? (
                <tr className="border-b border-gray-100" data-testid="row-invoice-item-room">
                  <td className="py-4">
                    <p className="font-medium text-gray-900">{room.roomType}</p>
                    <p className="text-sm text-gray-500">at {property.name}</p>
                  </td>
                  <td className="py-4 text-center text-gray-700">{booking.roomCount || 1}</td>
                  <td className="py-4 text-center text-gray-700">{nights}</td>
                  <td className="py-4 text-right text-gray-700">{formatAmount(room.nightlyRate, property?.currency)}</td>
                  <td className="py-4 text-right font-medium text-gray-900">{formatAmount(booking.totalAmount, property?.currency)}</td>
                </tr>
              ) : (
                <tr className="border-b border-gray-100" data-testid="row-invoice-item-property">
                  <td className="py-4">
                    <p className="font-medium text-gray-900">Accommodation</p>
                    <p className="text-sm text-gray-500">{property.name}</p>
                  </td>
                  <td className="py-4 text-center text-gray-700">1</td>
                  <td className="py-4 text-center text-gray-700">{nights}</td>
                  <td className="py-4 text-right text-gray-700">{formatAmount(nightlyRate, property?.currency)}</td>
                  <td className="py-4 text-right font-medium text-gray-900">{formatAmount(booking.totalAmount, property?.currency)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-end mb-10">
            <div className="w-64">
              <div className="flex justify-between py-2 text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatAmount(booking.totalAmount, property?.currency)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-gray-900 text-lg font-bold text-gray-900" data-testid="text-total-amount">
                <span>Total</span>
                <span>{formatAmount(booking.totalAmount, property?.currency)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-400">Thank you for choosing HostSpace</p>
            <p className="text-xs text-gray-300 mt-1">This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </div>
      </div>
    </>
  );
}