import { db } from "../server/db";
import {
  properties, rooms, bookings, conversations, messages,
  revenueData, galleryImages, enquiries, reviews,
} from "../shared/schema";

async function seedDemo() {
  console.log("Seeding demo data...");

  // Clear existing data
  await db.delete(reviews);
  await db.delete(enquiries);
  await db.delete(galleryImages);
  await db.delete(messages);
  await db.delete(conversations);
  await db.delete(bookings);
  await db.delete(rooms);
  await db.delete(revenueData);
  await db.delete(properties);

  const now = new Date();

  // Create properties
  const createdProperties = await db.insert(properties).values([
    {
      name: "The Cobblestone Loft",
      address: "14 Rue de Bretagne, Le Marais, Paris, France",
      nightlyRate: 180,
      imageUrl: "/property-1.jpg",
      status: "active",
      occupancyRate: 88,
      monthlyRevenue: 4320,
      description: "A beautifully restored Haussmann-era loft in the heart of Le Marais. Exposed stone walls, high ceilings, and vintage Parisian furnishings meet modern comforts. Steps from the best cafés, galleries, and boutiques Paris has to offer.",
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      squareFeet: 950,
      amenities: ["WiFi", "AC", "Heating", "Kitchen", "Washer", "Dishwasher", "TV", "Balcony", "Coffee Machine", "Iron"],
      checkInTime: "15:00",
      checkOutTime: "11:00",
      minimumStay: 2,
      houseRules: "No smoking. No parties. Quiet hours after 10 PM. Maximum 4 guests.",
      neighborhood: "Le Marais",
      bookingMode: "whole",
      currency: "EUR",
    },
    {
      name: "Santorini Cliffside Villa",
      address: "Oia Village, Santorini, Greece",
      nightlyRate: 420,
      imageUrl: "/property-2.jpg",
      status: "active",
      occupancyRate: 72,
      monthlyRevenue: 9072,
      description: "An iconic whitewashed villa perched on the caldera cliffs of Oia with uninterrupted views of the Aegean Sea and the legendary Santorini sunset. Private infinity pool, outdoor dining terrace, and cave-style bedrooms carved into the volcanic rock.",
      propertyType: "villa",
      bedrooms: 3,
      bathrooms: 3,
      maxGuests: 6,
      squareFeet: 2200,
      amenities: ["WiFi", "Private Pool", "AC", "Kitchen", "BBQ", "Sunset View", "Concierge", "Parking", "Washer", "TV"],
      checkInTime: "16:00",
      checkOutTime: "11:00",
      minimumStay: 3,
      houseRules: "No smoking indoors. Children must be supervised near the pool. No loud music after 11 PM.",
      neighborhood: "Oia",
      bookingMode: "whole",
      currency: "EUR",
    },
    {
      name: "Brooklyn Brownstone Suite",
      address: "247 Pacific Street, Cobble Hill, Brooklyn, NY, USA",
      nightlyRate: 195,
      imageUrl: "/property-3.jpg",
      status: "active",
      occupancyRate: 91,
      monthlyRevenue: 5070,
      description: "A stunning garden-level suite in a landmarked brownstone in Brooklyn's most coveted neighborhood. Exposed brick, original tin ceilings, and a private garden patio. Minutes from the best restaurants in NYC and a short subway ride to Manhattan.",
      propertyType: "apartment",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      squareFeet: 750,
      amenities: ["WiFi", "AC", "Heating", "Kitchen", "Private Garden", "Washer", "TV", "Workspace", "Coffee Machine", "Bike Storage"],
      checkInTime: "14:00",
      checkOutTime: "11:00",
      minimumStay: 2,
      houseRules: "No smoking. No pets. No parties. Please be mindful of neighbors.",
      neighborhood: "Cobble Hill",
      bookingMode: "whole",
      currency: "USD",
    },
    {
      name: "Lisbon Alfama Guesthouse",
      address: "Rua de São Miguel 42, Alfama, Lisbon, Portugal",
      nightlyRate: 85,
      imageUrl: "/property-4.jpg",
      status: "active",
      occupancyRate: 78,
      monthlyRevenue: 1989,
      description: "A charming guesthouse nestled in Lisbon's oldest and most atmospheric neighborhood. Azulejo-tiled walls, handcrafted wooden furniture, and sweeping views of the Tagus River. Hear fado drifting from nearby tascas as you fall asleep.",
      propertyType: "haveli",
      bedrooms: 4,
      bathrooms: 4,
      maxGuests: 8,
      squareFeet: 1800,
      amenities: ["WiFi", "AC", "Shared Kitchen", "River View", "Rooftop Terrace", "Breakfast Included", "Luggage Storage", "Tour Desk"],
      checkInTime: "14:00",
      checkOutTime: "10:00",
      minimumStay: 1,
      houseRules: "No smoking inside. Quiet hours from 11 PM. Please remove shoes at the entrance.",
      neighborhood: "Alfama",
      bookingMode: "room_based",
      currency: "EUR",
    },
  ]).returning();

  // Add rooms for room-based property (Lisbon Guesthouse)
  const lisbonProp = createdProperties[3];
  await db.insert(rooms).values([
    { propertyId: lisbonProp.id, roomType: "River View Double", roomCount: 2, nightlyRate: 95 },
    { propertyId: lisbonProp.id, roomType: "Standard Twin", roomCount: 1, nightlyRate: 75 },
    { propertyId: lisbonProp.id, roomType: "Rooftop Suite", roomCount: 1, nightlyRate: 120 },
  ]);

  // Bookings
  await db.insert(bookings).values([
    {
      propertyId: createdProperties[0].id,
      guestName: "Sophie Beaumont",
      checkIn: new Date(now.getTime() - 2 * 86400000).toISOString(),
      checkOut: new Date(now.getTime() + 3 * 86400000).toISOString(),
      status: "current",
      totalAmount: 900,
    },
    {
      propertyId: createdProperties[1].id,
      guestName: "Marcus & Elena Richter",
      checkIn: new Date(now.getTime() + 5 * 86400000).toISOString(),
      checkOut: new Date(now.getTime() + 12 * 86400000).toISOString(),
      status: "upcoming",
      totalAmount: 2940,
    },
    {
      propertyId: createdProperties[2].id,
      guestName: "Jordan Webb",
      checkIn: new Date(now.getTime() - 10 * 86400000).toISOString(),
      checkOut: new Date(now.getTime() - 5 * 86400000).toISOString(),
      status: "completed",
      totalAmount: 975,
    },
    {
      propertyId: createdProperties[0].id,
      guestName: "Yuki Tanaka",
      checkIn: new Date(now.getTime() + 15 * 86400000).toISOString(),
      checkOut: new Date(now.getTime() + 20 * 86400000).toISOString(),
      status: "upcoming",
      totalAmount: 900,
    },
    {
      propertyId: createdProperties[3].id,
      guestName: "Carlos Mendes",
      checkIn: new Date(now.getTime() - 1 * 86400000).toISOString(),
      checkOut: new Date(now.getTime() + 4 * 86400000).toISOString(),
      status: "current",
      totalAmount: 425,
    },
    {
      propertyId: createdProperties[1].id,
      guestName: "Priya & Arun Nair",
      checkIn: new Date(now.getTime() + 30 * 86400000).toISOString(),
      checkOut: new Date(now.getTime() + 37 * 86400000).toISOString(),
      status: "upcoming",
      totalAmount: 2940,
    },
  ]);

  // Conversations & messages
  const convs = await db.insert(conversations).values([
    {
      guestName: "Sophie Beaumont",
      propertyName: "The Cobblestone Loft",
      lastMessage: "Perfect, see you on the 14th!",
      lastMessageTime: new Date(now.getTime() - 1 * 3600000).toISOString(),
      unreadCount: 0,
    },
    {
      guestName: "Marcus Richter",
      propertyName: "Santorini Cliffside Villa",
      lastMessage: "Is airport pickup possible?",
      lastMessageTime: new Date(now.getTime() - 2 * 3600000).toISOString(),
      unreadCount: 1,
    },
    {
      guestName: "Jordan Webb",
      propertyName: "Brooklyn Brownstone Suite",
      lastMessage: "Loved every moment, thank you!",
      lastMessageTime: new Date(now.getTime() - 3 * 86400000).toISOString(),
      unreadCount: 0,
    },
  ]).returning();

  await db.insert(messages).values([
    { conversationId: convs[0].id, senderName: "Sophie Beaumont", senderType: "guest", content: "Hi! Just checking — is early check-in at 1pm possible?", sentAt: new Date(now.getTime() - 2 * 3600000).toISOString() },
    { conversationId: convs[0].id, senderName: "Host", senderType: "host", content: "Hi Sophie! Yes, 1pm should work great. We'll have it all ready for you.", sentAt: new Date(now.getTime() - 1.5 * 3600000).toISOString() },
    { conversationId: convs[0].id, senderName: "Sophie Beaumont", senderType: "guest", content: "Perfect, see you on the 14th!", sentAt: new Date(now.getTime() - 1 * 3600000).toISOString() },
    { conversationId: convs[1].id, senderName: "Marcus Richter", senderType: "guest", content: "We land at 6pm at Santorini airport. Is airport pickup possible?", sentAt: new Date(now.getTime() - 2 * 3600000).toISOString() },
    { conversationId: convs[2].id, senderName: "Jordan Webb", senderType: "guest", content: "Just checked out. What an incredible stay — the garden patio was my favourite part. Loved every moment, thank you!", sentAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
  ]);

  // Revenue data (12 months)
  await db.insert(revenueData).values([
    { month: "Jan", revenue: 18400 },
    { month: "Feb", revenue: 21200 },
    { month: "Mar", revenue: 24800 },
    { month: "Apr", revenue: 31500 },
    { month: "May", revenue: 38900 },
    { month: "Jun", revenue: 44200 },
    { month: "Jul", revenue: 52100 },
    { month: "Aug", revenue: 49800 },
    { month: "Sep", revenue: 38400 },
    { month: "Oct", revenue: 29700 },
    { month: "Nov", revenue: 22100 },
    { month: "Dec", revenue: 20451 },
  ]);

  // Reviews
  await db.insert(reviews).values([
    { propertyId: createdProperties[0].id, guestName: "Sophie Beaumont", platform: "airbnb", rating: 5, reviewText: "Absolute perfection. The loft exceeded every expectation — stunning interiors, impeccable cleanliness, and a location that can't be beaten in Paris. We're already planning our return trip.", responseText: "Thank you so much, Sophie! It was a pleasure hosting you. Looking forward to welcoming you back!", reviewDate: new Date(now.getTime() - 5 * 86400000).toISOString() },
    { propertyId: createdProperties[1].id, guestName: "Marcus Richter", platform: "booking_com", rating: 5, reviewText: "Words don't do this villa justice. Watching the sunset from the infinity pool was the most breathtaking experience of our lives. The host was attentive and the amenities were flawless.", responseText: "Marcus, your kind words mean everything. We're so glad the sunset views created such a magical memory!", reviewDate: new Date(now.getTime() - 10 * 86400000).toISOString() },
    { propertyId: createdProperties[2].id, guestName: "Jordan Webb", platform: "airbnb", rating: 5, reviewText: "This brownstone suite is a hidden gem. The private garden patio is unbelievable — we had breakfast out there every morning. Perfectly quiet despite being so close to everything.", responseText: "Jordan, thank you! The garden is our favourite feature too. Hope to host you again soon!", reviewDate: new Date(now.getTime() - 6 * 86400000).toISOString() },
    { propertyId: createdProperties[3].id, guestName: "Amelia Torres", platform: "google", rating: 4, reviewText: "A wonderful base for exploring Alfama. The host was incredibly helpful with local tips. The rooftop terrace with river views is simply gorgeous. Minus one star only for the narrow stairs!", responseText: "Thank you Amelia! You're right about the stairs — very authentic Lisbon! So glad you enjoyed the terrace.", reviewDate: new Date(now.getTime() - 15 * 86400000).toISOString() },
    { propertyId: createdProperties[0].id, guestName: "Luca Ferrari", platform: "direct", rating: 5, reviewText: "Our third stay at the Cobblestone Loft and it just gets better every time. The hosts remember our preferences and always go the extra mile. This is our home away from home in Paris.", responseText: "Luca, your loyalty means the world to us! Can't wait for visit number four!", reviewDate: new Date(now.getTime() - 20 * 86400000).toISOString() },
  ]);

  // Enquiries
  await db.insert(enquiries).values([
    { propertyId: createdProperties[1].id, guestName: "Hannah Schmidt", guestEmail: "hannah.schmidt@email.com", guestPhone: "+49 151 2345 6789", message: "We're a family of 5 (3 adults, 2 children aged 8 and 10). Is the villa suitable? Also, are pool safety measures in place?", status: "new", createdAt: new Date(now.getTime() - 2 * 3600000).toISOString() },
    { propertyId: createdProperties[0].id, guestName: "David Park", guestEmail: "david.park@email.com", guestPhone: "+1 646 555 0182", message: "Looking to book for our honeymoon in late June. Is the apartment available 22-29 June? Any special touches you offer for couples?", status: "responded", createdAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { propertyId: createdProperties[3].id, guestName: "Fatima Al-Rashid", guestEmail: "fatima@email.com", guestPhone: "+971 50 123 4567", message: "We're a group of 6 friends visiting Lisbon for a week in October. Do you have availability and any group discounts?", status: "new", createdAt: new Date(now.getTime() - 4 * 3600000).toISOString() },
    { propertyId: createdProperties[2].id, guestName: "Tom & Lisa Bennett", guestEmail: "tom.bennett@email.com", guestPhone: "+44 7911 123456", message: "Hi! We're looking for a quiet base to work remotely for a month in Brooklyn. Is long-stay pricing available?", status: "converted", createdAt: new Date(now.getTime() - 48 * 3600000).toISOString() },
  ]);

  // Gallery images
  await db.insert(galleryImages).values([
    { propertyId: createdProperties[0].id, imageUrl: "/property-1.jpg", title: "Living Area", tags: ["interior", "living room", "luxury"], starRating: 5, source: "manual", createdAt: now.toISOString() },
    { propertyId: createdProperties[1].id, imageUrl: "/property-2.jpg", title: "Infinity Pool at Sunset", tags: ["pool", "sunset", "exterior", "caldera"], starRating: 5, source: "manual", createdAt: now.toISOString() },
    { propertyId: createdProperties[2].id, imageUrl: "/property-3.jpg", title: "Garden Patio", tags: ["garden", "outdoor", "patio"], starRating: 4, source: "manual", createdAt: now.toISOString() },
    { propertyId: createdProperties[3].id, imageUrl: "/property-4.jpg", title: "Rooftop Terrace", tags: ["rooftop", "view", "terrace", "lisbon"], starRating: 5, source: "manual", createdAt: now.toISOString() },
  ]);

  console.log("✓ Demo data seeded successfully!");
  process.exit(0);
}

seedDemo().catch(e => {
  console.error("Seed failed:", e);
  process.exit(1);
});
