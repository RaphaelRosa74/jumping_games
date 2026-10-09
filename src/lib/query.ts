import { QueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { api } from "./api";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20000,
      gcTime: 300000,
      retry: (count, error) =>
        count < 1 &&
        (!axios.isAxiosError(error) ||
          !error.response ||
          error.response.status >= 500),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
export const sessionOptions = queryOptions({
  queryKey: ["session"],
  queryFn: api.session,
  retry: false,
  staleTime: 0,
});
export function useSession() {
  return useQuery({ ...sessionOptions, refetchInterval: 30000 });
}
export function useScope() {
  return useSession().data?.user?.id || "guest";
}
export function useCart() {
  const scope = useScope();
  return useQuery({
    queryKey: ["cart", scope],
    queryFn: ({ signal }) => api.cart(signal),
  });
}
export function useQuote(network = "Ethereum") {
  const scope = useScope();
  return useQuery({
    queryKey: ["quote", scope, network],
    queryFn: ({ signal }) => api.quote(network, signal),
    staleTime: 5000,
  });
}
export async function invalidateCart() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["cart"] }),
    queryClient.invalidateQueries({ queryKey: ["quote"] }),
  ]);
}
