import { addDays, subDays } from "date-fns";

export const mockProperties = [
  {
    id: "1",
    name: "Modern Downtown Loft",
    address: "123 Main St, Seattle, WA",
    nightlyRate: 150,
    image: "/src/assets/property-1.jpg",
    status: "active",
    occupancyRate: 85,
    monthlyRevenue: 3825,
  },
  {
    id: "2",
    name: "Cozy Mountain Cabin",
    address: "456 Pine Rd, Leavenworth, WA",
    nightlyRate: 220,
    image: "/src/assets/property-2.jpg",
    status: "active",
    occupancyRate: 60,
    monthlyRevenue: 3960,
  },
  {
    id: "3",
    name: "Luxury Waterfront Villa",
    address: "789 Ocean Dr, Miami, FL",
    nightlyRate: 550,
    image: "/src/assets/property-3.jpg",
    status: "maintenance",
    occupancyRate: 40,
    monthlyRevenue: 6600,
  },
  {
    id: "4",
    name: "Sunny Beach House",
    address: "101 Sand St, San Diego, CA",
    nightlyRate: 300,
    image: "/src/assets/property-4.jpg",
    status: "active",
    occupancyRate: 90,
    monthlyRevenue: 8100,
  }
];

export const mockBookings = [
  {
    id: "b1",
    propertyId: "1",
    guestName: "Sarah Jenkins",
    checkIn: subDays(new Date(), 2).toISOString(),
    checkOut: addDays(new Date(), 3).toISOString(),
    status: "current", // upcoming, current, completed, cancelled
    totalAmount: 750,
  },
  {
    id: "b2",
    propertyId: "2",
    guestName: "Michael Chen",
    checkIn: addDays(new Date(), 5).toISOString(),
    checkOut: addDays(new Date(), 10).toISOString(),
    status: "upcoming",
    totalAmount: 1100,
  },
  {
    id: "b3",
    propertyId: "4",
    guestName: "Emily Davis",
    checkIn: subDays(new Date(), 10).toISOString(),
    checkOut: subDays(new Date(), 5).toISOString(),
    status: "completed",
    totalAmount: 1500,
  },
  {
    id: "b4",
    propertyId: "1",
    guestName: "James Wilson",
    checkIn: addDays(new Date(), 12).toISOString(),
    checkOut: addDays(new Date(), 15).toISOString(),
    status: "upcoming",
    totalAmount: 450,
  },
  {
    id: "b5",
    propertyId: "3",
    guestName: "Robert Taylor",
    checkIn: addDays(new Date(), 20).toISOString(),
    checkOut: addDays(new Date(), 27).toISOString(),
    status: "upcoming",
    totalAmount: 3850,
  }
];

export const monthlyRevenueData = [
  { month: 'Jan', revenue: 18500 },
  { month: 'Feb', revenue: 22000 },
  { month: 'Mar', revenue: 21500 },
  { month: 'Apr', revenue: 26800 },
  { month: 'May', revenue: 29000 },
  { month: 'Jun', revenue: 34500 },
];
