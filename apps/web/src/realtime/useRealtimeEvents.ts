import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { mockSocket } from "../api/mock/socket";
import { eventKeys } from "../api/hooks/useEvents";
import { registrationKeys } from "../api/hooks/useRegistrations";
import { useAuth } from "../api/hooks/useAuth";

export function useRealtimeEvents() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const handleSeatUpdated = (data: { eventId: string; taken: number; capacity: number }) => {
      // Invalidate both lists and detail for this event
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    };

    const handleWaitlistMoved = (data: { eventId: string; registrationId: string; position: number }) => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.eventId) });
    };

    const handlePromotionOffered = (data: { registrationId: string; eventId: string }) => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.eventId) });
    };

    const handlePromotionExpired = (data: { registrationId: string; eventId: string }) => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.eventId) });
    };

    // Subscribe to mock socket
    mockSocket.on("seat:updated", handleSeatUpdated);
    mockSocket.on("waitlist:moved", handleWaitlistMoved);
    mockSocket.on("promotion:offered", handlePromotionOffered);
    mockSocket.on("promotion:expired", handlePromotionExpired);

    return () => {
      mockSocket.off("seat:updated", handleSeatUpdated);
      mockSocket.off("waitlist:moved", handleWaitlistMoved);
      mockSocket.off("promotion:offered", handlePromotionOffered);
      mockSocket.off("promotion:expired", handlePromotionExpired);
    };
  }, [queryClient, user]);
}
