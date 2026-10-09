import axios from "axios";
import type {
  ApiError,
  Cart,
  Catalog,
  CatalogSearch,
  Collector,
  NFT,
  Order,
  Quote,
  Session,
  User,
  Wallet,
} from "./types";
export const TOKEN_KEY = "kurio:token";
let guest = localStorage.getItem("kurio:guest");
if (!guest) {
  guest = crypto.randomUUID();
  localStorage.setItem("kurio:guest", guest);
}
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 9000,
});
http.interceptors.request.use((config) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  config.headers["X-Guest-ID"] = guest;
  return config;
});
http.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      axios.isAxiosError<ApiError>(error) &&
      error.response?.status === 401 &&
      error.response.data.code === "SESSION_EXPIRED"
    ) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("session-expired"));
    }
    return Promise.reject(error);
  },
);
export function errorMessage(error: unknown) {
  return axios.isAxiosError<ApiError>(error)
    ? error.response?.data.message ||
        (error.code === "ECONNABORTED"
          ? "A resposta demorou. Tente recuperar a operação."
          : "Sem conexão. Verifique a rede e tente novamente.")
    : error instanceof Error
      ? error.message
      : "Ocorreu um erro.";
}
export function fieldErrors(error: unknown) {
  return axios.isAxiosError<ApiError>(error)
    ? error.response?.data.fields || {}
    : {};
}
export function errorCode(error: unknown) {
  return axios.isAxiosError<ApiError>(error) ? error.response?.data.code : "";
}
export const api = {
  session: async () => (await http.get<Session>("/session")).data,
  catalog: async (search: CatalogSearch, signal?: AbortSignal) =>
    (await http.get<Catalog>("/nfts", { params: search, signal })).data,
  nft: async (id: string, signal?: AbortSignal) =>
    (await http.get<NFT>("/nfts/" + id, { signal })).data,
  cart: async (signal?: AbortSignal) =>
    (await http.get<Cart>("/cart", { signal })).data,
  quote: async (network = "Ethereum", signal?: AbortSignal) =>
    (await http.post<Quote>("/quotes", { network }, { signal })).data,
  profile: async () => (await http.get<User>("/profile")).data,
  wallets: async () => (await http.get<Wallet[]>("/wallets")).data,
  favorites: async () => (await http.get<string[]>("/favorites")).data,
  order: async (id: string, signal?: AbortSignal) =>
    (await http.get<Order>("/orders/" + id, { signal })).data,
  orders: async () => (await http.get<Order[]>("/orders")).data,
  createOrder: async (
    input: { quoteId: string; walletId: string; collector: Collector },
    key: string,
  ) =>
    (
      await http.post<Order>("/orders", input, {
        headers: { "Idempotency-Key": key },
      })
    ).data,
};
export function notify(message: string) {
  window.dispatchEvent(new CustomEvent("notice", { detail: message }));
}
