export type Network = "Ethereum" | "Polygon" | "Solana";
export type Edition = "1/1" | "1/10" | "1/50" | "Aberta";
export interface NFT {
  id: string;
  name: string;
  image: string;
  price: string;
  category: string;
  network: Network;
  attributes: string[];
  editions: Record<Edition, number>;
  version: number;
  featured: boolean;
  created: number;
}
export interface CatalogSearch {
  q: string;
  category: string;
  network: string;
  sort: "recent" | "price-asc" | "price-desc";
  page: number;
  min: string;
  max: string;
  tab: "all" | "new" | "trending";
}
export interface Catalog {
  items: NFT[];
  total: number;
  page: number;
  pages: number;
}
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
}
export interface Session {
  user: User | null;
  expiresAt: number | null;
}
export interface CartItem {
  nftId: string;
  edition: Edition;
  quantity: number;
}
export interface Cart {
  items: CartItem[];
  coupon: string;
  version: number;
}
export interface QuoteItem extends CartItem {
  name: string;
  image: string;
  price: string;
  lineTotal: string;
  available: number;
  nftVersion: number;
}
export interface Quote {
  id: string;
  fingerprint: string;
  items: QuoteItem[];
  subtotal: string;
  discount: string;
  fee: string;
  total: string;
  coupon: string;
  valid: boolean;
  issues: string[];
  expiresAt: number;
}
export interface Wallet {
  id: string;
  label: string;
  address: string;
  network: Network;
  provider: "MetaMask" | "WalletConnect" | "Coinbase Wallet";
  primary: boolean;
}
export interface Collector {
  name: string;
  username: string;
  email: string;
  profile: string;
  referral: string;
  ens: string;
  note: string;
}
export interface Order {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "declined";
  quote: Quote;
  wallet: Wallet;
  collector: Collector;
  transaction: string;
  version: number;
  createdAt: number;
  settleAt: number;
  decline: boolean;
}
export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}
export interface ResourceEvent {
  id: string;
  resourceId: string;
  version: number;
  userId?: string;
  data?: NFT | Order;
}
export type Scenario =
  | "success"
  | "empty"
  | "slow"
  | "out-of-order"
  | "offline"
  | "server-error"
  | "unauthorized"
  | "expired"
  | "validation"
  | "favorite-error"
  | "price-change"
  | "sold-out"
  | "order-timeout"
  | "payment-declined"
  | "pending";
export interface MockConfig {
  scenario: Scenario;
  latency: number;
  seed: number;
}
