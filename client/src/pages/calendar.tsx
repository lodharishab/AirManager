import { useState, useMemo, useRef } from "react";
import { useBookings, useProperties, useAllRooms } from "@/lib/api";
import { formatCurrency } from "@shared/currency";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isSameMonth,
  parseISO,
  differenceInDays,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import type { Booking, Property, Room } from "@shared/schema";

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  current: { bg: "bg-emerald-500/80", border: "border-emerald-400", text: "text-emerald-400" },
  upcoming: { bg: "bg-blue-500/80", border: "border-blue-400", text: "text-blue-400" },
  completed: { bg: "bg-zinc-500/60", border: "border-zinc-400", text: "text-zinc-400" },
  cancelled: { bg: "bg-red-500/60", border: "border-red-400", text: "text-red-400" },
};

function getStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface CalendarRow {
  id: string;
  label: string;
  sublabel?: string;
  propertyId: number;
  roomId?: number;
  isRoom?: boolean;
  indent?: boolean;
}

interface BookingBar {
  booking: Booking;
  row: CalendarRow;
  startCol: number;
  span: number;
  propertyName: string;
  roomLabel?: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: bookingsResult, isLoading: bookingsLoading } = useBookings({ page: 1, limit: 10000 });
  const { data: propertiesResult, isLoading: propertiesLoading } = useProperties({ page: 1, limit: 10000 });
  const { data: allRooms } = useAllRooms();

  const bookings = bookingsResult?.data || [];
  const properties = propertiesResult?.data || [];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredProperties = useMemo(() => {
    if (!properties.length) return [];
    if (propertyFilter === "all") return properties;
    return properties.filter((p) => String(p.id) === propertyFilter);
  }, [properties, propertyFilter]);

  const roomsByProperty = useMemo(() => {
    const map: Record<number, Room[]> = {};
    if (allRooms) {
      allRooms.forEach((r) => {
        if (!map[r.propertyId]) map[r.propertyId] = [];
        map[r.propertyId].push(r);
      });
    }
    return map;
  }, [allRooms]);

  const rows = useMemo<CalendarRow[]>(() => {
    const result: CalendarRow[] = [];
    filteredProperties.forEach((prop) => {
      const isRoomBased = prop.bookingMode === "room_based";
      const rooms = roomsByProperty[prop.id] || [];

      if (isRoomBased && rooms.length > 0) {
        result.push({
          id: `prop-${prop.id}`,
          label: prop.name,
          sublabel: prop.address,
          propertyId: prop.id,
        });
        rooms.forEach((room) => {
          result.push({
            id: `room-${room.id}`,
            label: room.roomType,
            sublabel: `${formatCurrency(room.nightlyRate, prop.currency)}/night`,
            propertyId: prop.id,
            roomId: room.id,
            isRoom: true,
            indent: true,
          });
        });
      } else {
        result.push({
          id: `prop-${prop.id}`,
          label: prop.name,
          sublabel: prop.address,
          propertyId: prop.id,
        });
      }
    });
    return result;
  }, [filteredProperties, roomsByProperty]);

  const bookingBars = useMemo<BookingBar[]>(() => {
    if (!bookings || !properties) return [];
    const bars: BookingBar[] = [];
    const propMap = new Map(properties.map((p) => [p.id, p]));

    bookings.forEach((booking) => {
      const prop = propMap.get(booking.propertyId);
      if (!prop) return;
      if (propertyFilter !== "all" && String(prop.id) !== propertyFilter) return;

      const checkIn = startOfDay(parseISO(booking.checkIn));
      const checkOut = startOfDay(parseISO(booking.checkOut));

      if (isAfter(checkIn, monthEnd) || !isAfter(checkOut, monthStart)) return;

      const barStart = isBefore(checkIn, monthStart) ? monthStart : checkIn;
      const barEnd = isAfter(checkOut, monthEnd) ? monthEnd : checkOut;

      const startCol = differenceInDays(barStart, monthStart);
      const span = Math.max(1, differenceInDays(barEnd, barStart));

      let targetRow: CalendarRow | undefined;
      const isRoomBased = prop.bookingMode === "room_based";

      if (isRoomBased && booking.roomId) {
        targetRow = rows.find((r) => r.roomId === booking.roomId);
      }
      if (!targetRow) {
        targetRow = rows.find((r) => r.propertyId === prop.id && !r.isRoom);
      }
      if (!targetRow) return;

      const roomData = booking.roomId && allRooms ? allRooms.find((r) => r.id === booking.roomId) : undefined;

      bars.push({
        booking,
        row: targetRow,
        startCol,
        span,
        propertyName: prop.name,
        roomLabel: roomData?.roomType,
      });
    });

    return bars;
  }, [bookings, properties, rows, monthStart, monthEnd, propertyFilter, allRooms]);

  const isLoading = bookingsLoading || propertiesLoading;

  const todayIndex = useMemo(() => {
    const today = startOfDay(new Date());
    if (isSameMonth(today, currentDate)) {
      return differenceInDays(today, monthStart);
    }
    return -1;
  }, [currentDate, monthStart]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const DAY_WIDTH = 40;
  const ROW_HEIGHT = 48;
  const LABEL_WIDTH = 200;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="calendar-loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="calendar-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground" data-testid="text-calendar-title">
            Availability Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            View property availability at a glance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-property-filter">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {(properties || []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={handlePrevMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={handleNextMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={handleToday} data-testid="button-today">
              Today
            </Button>
          </div>

          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-current-month">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {format(currentDate, "MMMM yyyy")}
          </h2>

          <div className="flex items-center gap-3 text-xs">
            {Object.entries(STATUS_COLORS).map(([status, colors]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${colors.bg}`} />
                <span className="text-muted-foreground">{getStatusLabel(status)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto" ref={scrollRef}>
          <div className="relative" style={{ minWidth: LABEL_WIDTH + daysInMonth.length * DAY_WIDTH }}>
            <div className="flex sticky top-0 z-10 bg-card border-b">
              <div
                className="shrink-0 border-r bg-card px-3 py-2 text-xs font-semibold text-muted-foreground sticky left-0 z-20"
                style={{ width: LABEL_WIDTH }}
              >
                Property / Room
              </div>
              {daysInMonth.map((day, i) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isTodayCol = isToday(day);
                return (
                  <div
                    key={i}
                    className={`shrink-0 text-center py-2 border-r text-xs ${
                      isTodayCol
                        ? "bg-primary/10 text-primary font-bold"
                        : isWeekend
                        ? "bg-muted/30 text-muted-foreground"
                        : "text-muted-foreground"
                    }`}
                    style={{ width: DAY_WIDTH }}
                    data-testid={`day-header-${format(day, "yyyy-MM-dd")}`}
                  >
                    <div className="text-[10px] uppercase">{format(day, "EEE")}</div>
                    <div className="font-medium">{format(day, "d")}</div>
                  </div>
                );
              })}
            </div>

            {rows.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground" data-testid="text-no-properties">
                No properties to display
              </div>
            ) : (
              rows.map((row) => {
                const rowBars = bookingBars.filter((b) => b.row.id === row.id);

                return (
                  <div
                    key={row.id}
                    className={`flex border-b relative ${row.isRoom ? "bg-muted/10" : ""}`}
                    style={{ height: ROW_HEIGHT }}
                    data-testid={`calendar-row-${row.id}`}
                  >
                    <div
                      className={`shrink-0 border-r flex flex-col justify-center sticky left-0 z-10 bg-card ${
                        row.indent ? "pl-8 pr-3" : "px-3"
                      }`}
                      style={{ width: LABEL_WIDTH }}
                    >
                      <div className={`text-sm font-medium truncate ${row.isRoom ? "text-muted-foreground" : "text-foreground"}`}>
                        {row.label}
                      </div>
                      {row.sublabel && (
                        <div className="text-[10px] text-muted-foreground truncate">{row.sublabel}</div>
                      )}
                    </div>

                    <div className="flex-1 relative">
                      {daysInMonth.map((day, i) => {
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const isTodayCol = isToday(day);
                        return (
                          <div
                            key={i}
                            className={`absolute top-0 bottom-0 border-r ${
                              isTodayCol
                                ? "bg-primary/5"
                                : isWeekend
                                ? "bg-muted/15"
                                : ""
                            }`}
                            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                          />
                        );
                      })}

                      {todayIndex >= 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-primary z-[5]"
                          style={{ left: todayIndex * DAY_WIDTH + DAY_WIDTH / 2 }}
                        />
                      )}

                      {rowBars.map((bar) => (
                        <BookingBarEl
                          key={bar.booking.id}
                          bar={bar}
                          dayWidth={DAY_WIDTH}
                          rowHeight={ROW_HEIGHT}
                          currency={properties?.find(p => p.id === bar.booking.propertyId)?.currency}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function BookingBarEl({
  bar,
  dayWidth,
  rowHeight,
  currency,
}: {
  bar: BookingBar;
  dayWidth: number;
  rowHeight: number;
  currency?: string;
}) {
  const colors = STATUS_COLORS[bar.booking.status] || STATUS_COLORS.upcoming;
  const left = bar.startCol * dayWidth + 2;
  const width = bar.span * dayWidth - 4;
  const top = (rowHeight - 28) / 2;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`absolute rounded-md ${colors.bg} border ${colors.border} cursor-pointer hover:brightness-110 transition-all z-[3] flex items-center px-2 overflow-hidden`}
          style={{ left, width: Math.max(width, 20), top, height: 28 }}
          data-testid={`booking-bar-${bar.booking.id}`}
        >
          <span className="text-[11px] font-medium text-white truncate">
            {bar.booking.guestName}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" data-testid={`booking-popover-${bar.booking.id}`}>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{bar.booking.guestName}</h3>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${colors.bg} text-white`}
            >
              {bar.booking.status}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Property</span>
              <span className="text-foreground font-medium">{bar.propertyName}</span>
            </div>
            {bar.roomLabel && (
              <div className="flex justify-between">
                <span>Room</span>
                <span className="text-foreground font-medium">{bar.roomLabel}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Check-in</span>
              <span className="text-foreground font-medium">
                {format(parseISO(bar.booking.checkIn), "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Check-out</span>
              <span className="text-foreground font-medium">
                {format(parseISO(bar.booking.checkOut), "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="text-foreground font-medium">
                {formatCurrency(bar.booking.totalAmount, currency)}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
