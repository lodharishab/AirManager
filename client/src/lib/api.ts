import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";
import type { Property, Booking, Conversation, Message, RevenueData } from "@shared/schema";

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
    mutationFn: async (data: Omit<Property, "id">) => {
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
