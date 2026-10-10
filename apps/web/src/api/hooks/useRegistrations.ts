import { useQuery } from "@tanstack/react-query";
import { mockRequest } from "../mock/adapter";
import { endpoints } from "../endpoints";
import type { Registration } from "../types";

export const registrationKeys = {
  all: ["registrations"] as const,
  my: () => [...registrationKeys.all, "my"] as const,
};

export function useMyRegistrations() {
  return useQuery({
    queryKey: registrationKeys.my(),
    queryFn: async () => {
      const res = await mockRequest<{ data: { registrations: Registration[] } }>(endpoints.myRegistrations);
      return res.data.registrations;
    },
  });
}
