import { useQuery } from "@tanstack/react-query";
import { mockRequest } from "../mock/adapter";
import { endpoints } from "../endpoints";
import type { ClubEvent } from "../types";

export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: string) => [...eventKeys.lists(), { filters }] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
};

export function useEvents(params?: { section?: string; club?: string; q?: string }) {
  return useQuery({
    queryKey: eventKeys.list(JSON.stringify(params || {})),
    queryFn: async () => {
      const res = await mockRequest<{ data: { events: ClubEvent[] } }>(endpoints.events, {
        params: params as Record<string, string>,
      });
      return res.data.events;
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async () => {
      const res = await mockRequest<{ data: { event: ClubEvent } }>(endpoints.event(id));
      return res.data.event;
    },
    enabled: !!id,
  });
}
