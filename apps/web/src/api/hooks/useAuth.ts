import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mockRequest } from "../mock/adapter";
import { endpoints } from "../endpoints";
import type { LoginPayload, User } from "../types";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        const res = await mockRequest<{ data: { user: User } }>(endpoints.me);
        return res.data.user;
      } catch (error) {
        return null;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await mockRequest<{ data: { user: User } }>(endpoints.login, {
        method: "POST",
        body: payload,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me, data.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await mockRequest(endpoints.logout, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null);
      queryClient.clear(); // Clear all other caches on logout
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}
