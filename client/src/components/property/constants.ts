import React from "react";
import {
  Wifi, Wind, Waves, Dumbbell, Car, Tv, UtensilsCrossed, Shield,
} from "lucide-react";

export const LINK_TYPE_ICONS: Record<string, string> = {
  airbnb: "🏠",
  booking: "🅱️",
  maps: "📍",
  photos: "📸",
  ota: "🌐",
  tour: "🎥",
  cleaning: "🧹",
  maintenance: "🔧",
  insurance: "🛡️",
  other: "🔗",
};

export const LINK_TYPE_OPTIONS = [
  { value: "airbnb", label: "Airbnb" },
  { value: "booking", label: "Booking.com" },
  { value: "maps", label: "Google Maps" },
  { value: "photos", label: "Photo Gallery" },
  { value: "ota", label: "OTA / Travel Site" },
  { value: "tour", label: "Virtual Tour" },
  { value: "cleaning", label: "Cleaning Service" },
  { value: "maintenance", label: "Maintenance" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

export const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "WiFi": React.createElement(Wifi, { className: "h-4 w-4" }),
  "AC": React.createElement(Wind, { className: "h-4 w-4" }),
  "Pool": React.createElement(Waves, { className: "h-4 w-4" }),
  "Gym": React.createElement(Dumbbell, { className: "h-4 w-4" }),
  "Parking": React.createElement(Car, { className: "h-4 w-4" }),
  "TV": React.createElement(Tv, { className: "h-4 w-4" }),
  "Kitchen": React.createElement(UtensilsCrossed, { className: "h-4 w-4" }),
  "Security": React.createElement(Shield, { className: "h-4 w-4" }),
};

export const FIELD_LABELS: Record<string, string> = {
  name: "Property Name",
  description: "Description",
  propertyType: "Property Type",
  nightlyRate: "Nightly Rate ($)",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  maxGuests: "Max Guests",
  squareFeet: "Area (sq ft)",
  amenities: "Amenities",
  checkInTime: "Check-in Time",
  checkOutTime: "Check-out Time",
  minimumStay: "Min Stay (nights)",
  houseRules: "House Rules",
  neighborhood: "Neighbourhood",
  address: "Address",
};
