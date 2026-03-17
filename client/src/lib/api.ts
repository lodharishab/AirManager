import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";
import type { Property, PropertyLink, Booking, Conversation, Message, RevenueData, GalleryImage, Enquiry, Room } from "@shared/schema";

export function useProperties() {
  return useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });
}

export function useBookings() {
  return useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
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
  return useQuery<Property & { links: PropertyLink[]; bookings: Booking[]; rooms: Room[] }>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
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
    mutationFn: async (data: Omit<Booking, "id">) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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

export function useSeedData() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useGalleryImages() {
  return useQuery<GalleryImage[]>({
    queryKey: ["/api/gallery"],
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

export function useEnquiries() {
  return useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
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
