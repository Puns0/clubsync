import { useQuery } from "@tanstack/react-query";
import { mockRequest } from "../mock/adapter";
import { endpoints } from "../endpoints";
import type { Club } from "../types";

export const clubKeys = {
  all: ["clubs"] as const,
  lists: () => [...clubKeys.all, "list"] as const,
  details: () => [...clubKeys.all, "detail"] as const,
  detail: (id: string) => [...clubKeys.details(), id] as const,
};

export function useClubs() {
  return useQuery({
    queryKey: clubKeys.lists(),
    queryFn: async () => {
      const res = await mockRequest<{ data: { clubs: Club[] } }>(endpoints.clubs);
      return res.data.clubs;
    },
  });
}

export function useClub(id: string) {
  return useQuery({
    queryKey: clubKeys.detail(id),
    queryFn: async () => {
      const res = await mockRequest<{ data: { club: Club } }>(endpoints.club(id));
      return res.data.club;
    },
    enabled: !!id,
  });
}
