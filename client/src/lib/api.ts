import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";
import type { Property, PropertyLink, Booking, InsertBooking, Conversation, Message, RevenueData, GalleryImage, Expense, InsertExpense, Enquiry, Room, Review, HousekeepingTask, Notification, Guest, ExternalCalendar, FollowUp, FollowUpRule, PriceRecommendation } from "@shared/schema";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function useProperties(params?: { page?: number; limit?: number; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  const queryString = searchParams.toString();
  const url = `/api/properties${queryString ? `?${queryString}` : ""}`;
  return useQuery<PaginatedResult<Property>>({
    queryKey: ["/api/properties", params?.page, params?.limit, params?.search],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export function useBookings(params?: { page?: number; limit?: number; search?: string; status?: string; startDate?: string; endDate?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status && params.status !== "all") searchParams.set("status", params.status);
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  const queryString = searchParams.toString();
  const url = `/api/bookings${queryString ? `?${queryString}` : ""}`;
  return useQuery<PaginatedResult<Booking>>({
    queryKey: ["/api/bookings", params?.page, params?.limit, params?.search, params?.status, params?.startDate, params?.endDate],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });
}

export function useMessages(conversationId: number | undefined) {
  return useQuery<Message[]>({
    queryKey: ["/api/conversations", String(conversationId), "messages"],
    enabled: !!conversationId,
  });
}

export function useRevenueData() {
  return useQuery<RevenueData[]>({
    queryKey: ["/api/revenue"],
  });
}

export function useRevenueChartData() {
  return useQuery<{ month: string; revenue: number }[]>({
    queryKey: ["/api/dashboard/revenue-chart"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/revenue-chart");
      return res.json();
    },
  });
}

export function useDashboardStats() {
  return useQuery<{
    totalProperties: number;
    activeProperties: number;
    currentBookings: number;
    upcomingBookings: number;
    totalMonthlyRevenue: number;
    averageOccupancy: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });
}

export function useCreateProperty() {
  return useMutation({
    mutationFn: async (data: Partial<Omit<Property, "id">> & { name: string; address: string; nightlyRate: number }) => {
      const res = await apiRequest("POST", "/api/properties", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });
}

export function useUpdateProperty() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Property> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/properties/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });
}

export function useDeleteProperty() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });
}

export function useProperty(id: number | undefined) {
  return useQuery<Property & { links: PropertyLink[]; bookings: Booking[]; rooms: Room[]; externalCalendars: ExternalCalendar[] }>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });
}

export function useGenerateIcalToken() {
  return useMutation({
    mutationFn: async (propertyId: number) => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/generate-ical-token`);
      return res.json() as Promise<{ icalToken: string }>;
    },
    onSuccess: (_data, propertyId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId] });
    },
  });
}

export function useImportCalendar() {
  return useMutation({
    mutationFn: async ({ propertyId, url, name }: { propertyId: number; url: string; name?: string }) => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/import-calendar`, { url, name });
      return res.json() as Promise<{ imported: number; total: number; calendar: ExternalCalendar }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId] });
    },
  });
}

export function useDeleteExternalCalendar() {
  return useMutation({
    mutationFn: async ({ calendarId, propertyId }: { calendarId: number; propertyId: number }) => {
      await apiRequest("DELETE", `/api/properties/${propertyId}/external-calendars/${calendarId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId] });
    },
  });
}

export function useCreatePropertyLink() {
  return useMutation({
    mutationFn: async ({ propertyId, ...data }: { propertyId: number; label: string; url: string; linkType: string }) => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/links`, data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId] });
    },
  });
}

export function useDeletePropertyLink() {
  return useMutation({
    mutationFn: async ({ linkId, propertyId }: { linkId: number; propertyId: number }) => {
      await apiRequest("DELETE", `/api/property-links/${linkId}`);
      return propertyId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId] });
    },
  });
}

export function useAllRooms() {
  return useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });
}

export function useRoomsByProperty(propertyId: number | undefined) {
  return useQuery<Room[]>({
    queryKey: ["/api/properties", propertyId, "rooms"],
    enabled: !!propertyId,
  });
}

export function useCreateRoom() {
  return useMutation({
    mutationFn: async ({ propertyId, ...data }: { propertyId: number; roomType: string; roomCount: number; nightlyRate: number }) => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/rooms`, data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId, "rooms"] });
    },
  });
}

export function useUpdateRoom() {
  return useMutation({
    mutationFn: async ({ id, propertyId, ...data }: { id: number; propertyId: number; roomType?: string; roomCount?: number; nightlyRate?: number }) => {
      const res = await apiRequest("PATCH", `/api/rooms/${id}`, data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId, "rooms"] });
    },
  });
}

export function useDeleteRoom() {
  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: number; propertyId: number }) => {
      await apiRequest("DELETE", `/api/rooms/${id}`);
      return propertyId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", variables.propertyId, "rooms"] });
    },
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (data: InsertBooking) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue-chart"] });
    },
  });
}

export function useCheckIns() {
  return useQuery<{
    arrivals: Booking[];
    departures: Booking[];
    todayArrivals: number;
    todayDepartures: number;
    overdueArrivals: number;
    overdueDepartures: number;
  }>({
    queryKey: ["/api/check-ins"],
  });
}

export function useUpdateBooking() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Booking> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/bookings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue-chart"] });
    },
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: async (data: { conversationId: number; senderName: string; senderType: string; content: string; sentAt: string }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", String(variables.conversationId), "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });
}


export function useGalleryImages(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const queryString = searchParams.toString();
  const url = `/api/gallery${queryString ? `?${queryString}` : ""}`;
  return useQuery<PaginatedResult<GalleryImage>>({
    queryKey: ["/api/gallery", params?.page, params?.limit],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export function useCreateGalleryImage() {
  return useMutation({
    mutationFn: async (data: { imageUrl: string; title?: string; tags?: string[]; starRating?: number; propertyId?: number; source?: string }) => {
      const res = await apiRequest("POST", "/api/gallery", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
  });
}

export function useUpdateGalleryImage() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<GalleryImage>) => {
      const res = await apiRequest("PATCH", `/api/gallery/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
  });
}

export function useDeleteGalleryImage() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
  });
}

export function useUploadImages() {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Upload failed");
      }
      return res.json() as Promise<{
        uploaded: { url: string; originalName: string }[];
        errors: { file: string; error: string }[];
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
  });
}

export function useImportFromDrive() {
  return useMutation({
    mutationFn: async (data: { folderUrl: string; propertyId?: number }) => {
      const res = await apiRequest("POST", "/api/gallery/import-drive", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
  });
}

export function useExpenses(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const queryString = searchParams.toString();
  const url = `/api/expenses${queryString ? `?${queryString}` : ""}`;
  return useQuery<PaginatedResult<Expense>>({
    queryKey: ["/api/expenses", params?.page, params?.limit],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export function useCreateExpense() {
  return useMutation({
    mutationFn: async (data: InsertExpense) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
  });
}

export function useUpdateExpense() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Expense> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/expenses/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
  });
}

export function useDeleteExpense() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
  });
}

export function useEnquiries(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const queryString = searchParams.toString();
  const url = `/api/enquiries${queryString ? `?${queryString}` : ""}`;
  return useQuery<PaginatedResult<Enquiry>>({
    queryKey: ["/api/enquiries", params?.page, params?.limit],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export function useCreateEnquiry() {
  return useMutation({
    mutationFn: async (data: Omit<Enquiry, "id" | "createdAt">) => {
      const res = await apiRequest("POST", "/api/enquiries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
    },
  });
}

export function useUpdateEnquiry() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Enquiry> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/enquiries/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
    },
  });
}

export function useDeleteEnquiry() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/enquiries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
    },
  });
}

export function useReviews(params?: { page?: number; limit?: number; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  const queryString = searchParams.toString();
  const url = `/api/reviews${queryString ? `?${queryString}` : ""}`;
  return useQuery<PaginatedResult<Review>>({
    queryKey: ["/api/reviews", params?.page, params?.limit, params?.search],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export function useReviewsByProperty(propertyId: number | undefined) {
  return useQuery<Review[]>({
    queryKey: ["/api/reviews/property", propertyId],
    enabled: !!propertyId,
  });
}

export function useCreateReview() {
  return useMutation({
    mutationFn: async (data: Omit<Review, "id">) => {
      const res = await apiRequest("POST", "/api/reviews", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/property"] });
    },
  });
}

export function useUpdateReview() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Review> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/reviews/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/property"] });
    },
  });
}

export function useDeleteReview() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/property"] });
    },
  });
}

export function useHousekeepingTasks(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const queryString = searchParams.toString();
  const url = `/api/housekeeping-tasks${queryString ? `?${queryString}` : ""}`;
  return useQuery<PaginatedResult<HousekeepingTask>>({
    queryKey: ["/api/housekeeping-tasks", params?.page, params?.limit],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export function useCreateHousekeepingTask() {
  return useMutation({
    mutationFn: async (data: Omit<HousekeepingTask, "id">) => {
      const res = await apiRequest("POST", "/api/housekeeping-tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/housekeeping-tasks"] });
    },
  });
}

export function useUpdateHousekeepingTask() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<HousekeepingTask> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/housekeeping-tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/housekeeping-tasks"] });
    },
  });
}

export function useDeleteHousekeepingTask() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/housekeeping-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/housekeeping-tasks"] });
    },
  });
}

export function useNotifications(unreadOnly?: boolean) {
  return useQuery<Notification[]>({
    queryKey: ["/api/notifications", unreadOnly ? "unread" : "all"],
    queryFn: async () => {
      const url = unreadOnly ? "/api/notifications?unread=true" : "/api/notifications";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/notifications/mark-all-read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}

export interface AnalyticsData {
  revenueByProperty: { propertyId: number; propertyName: string; revenue: number }[];
  monthlyRevenueTrend: { month: string; revenue: number }[];
  occupancyByProperty: { propertyId: number; propertyName: string; occupancyRate: number; avgBookingDuration: number; bookingCount: number }[];
  bookingStatusBreakdown: { status: string; count: number }[];
  busiestMonths: { month: string; bookings: number }[];
  avgBookingValue: number;
  profitByProperty: { propertyId: number; propertyName: string; revenue: number; expenses: number; profit: number }[];
  topEarningProperties: { propertyId: number; propertyName: string; revenue: number }[];
  totalBookings: number;
  totalRevenue: number;
}

export function useAnalytics(params?: { startDate?: string; endDate?: string; propertyId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  if (params?.propertyId) searchParams.set("propertyId", params.propertyId);
  const queryString = searchParams.toString();
  const url = `/api/analytics${queryString ? `?${queryString}` : ""}`;
  return useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", params?.startDate, params?.endDate, params?.propertyId],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export interface GuestWithStats extends Guest {
  totalStays: number;
  totalSpent: number;
  lastVisit: string | null;
}

export interface GuestDetail extends GuestWithStats {
  bookings: Booking[];
  reviews: Review[];
}

export function useGuests(params?: { page?: number; limit?: number; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  const queryString = searchParams.toString();
  const url = `/api/guests${queryString ? `?${queryString}` : ""}`;
  return useQuery<PaginatedResult<GuestWithStats>>({
    queryKey: ["/api/guests", params?.page, params?.limit, params?.search],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export function useGuest(id: number | undefined) {
  return useQuery<GuestDetail>({
    queryKey: ["/api/guests", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/guests/${id}`);
      return res.json();
    },
    enabled: !!id,
  });
}

export function useTopGuests(limit?: number) {
  return useQuery<GuestWithStats[]>({
    queryKey: ["/api/guests/top", limit],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/guests/top${limit ? `?limit=${limit}` : ""}`);
      return res.json();
    },
  });
}

export function useCreateGuest() {
  return useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; nationality?: string; notes?: string; tags?: string[] }) => {
      const res = await apiRequest("POST", "/api/guests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
    },
  });
}

export function useUpdateGuest() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; email?: string; phone?: string; nationality?: string; notes?: string; tags?: string[] }) => {
      const res = await apiRequest("PATCH", `/api/guests/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
    },
  });
}

export function useDeleteGuest() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/guests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
    },
  });
}

export function useFollowUps() {
  return useQuery<(FollowUp & { guestName: string | null; propertyName: string | null })[]>({
    queryKey: ["/api/follow-ups"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/follow-ups");
      return res.json();
    },
  });
}

export function useFollowUpStats() {
  return useQuery<{ pending: number; sent: number; failed: number; sentToday: number }>({
    queryKey: ["/api/follow-ups/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/follow-ups/stats");
      return res.json();
    },
  });
}

export function useRunFollowUps() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/follow-ups/run", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
    },
  });
}

export function useCancelFollowUp() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/follow-ups/${id}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
    },
  });
}

export function useFollowUpRules() {
  return useQuery<FollowUpRule[]>({
    queryKey: ["/api/follow-up-rules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/follow-up-rules");
      return res.json();
    },
  });
}

export function useCreateFollowUpRule() {
  return useMutation({
    mutationFn: async (data: Omit<FollowUpRule, "id" | "createdAt">) => {
      const res = await apiRequest("POST", "/api/follow-up-rules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-rules"] });
    },
  });
}

export function useUpdateFollowUpRule() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FollowUpRule> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/follow-up-rules/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-rules"] });
    },
  });
}

export function useDeleteFollowUpRule() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/follow-up-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-rules"] });
    },
  });
}

export function usePriceRecommendations() {
  return useQuery<
    (PriceRecommendation & { propertyName: string | null; propertyCurrency: string | null })[]
  >({
    queryKey: ["/api/price-recommendations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/price-recommendations");
      return res.json();
    },
  });
}

export function useRunPricingRecommendations() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/price-recommendations/run", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-recommendations"] });
    },
  });
}

export function useApprovePriceRecommendation() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/price-recommendations/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    },
  });
}

export function useRejectPriceRecommendation() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/price-recommendations/${id}/reject`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-recommendations"] });
    },
  });
}
