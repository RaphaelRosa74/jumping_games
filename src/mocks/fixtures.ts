import type { NFT, User, Wallet } from "../lib/types";
export const users: User[] = [
  {
    id: "u1",
    name: "Nova Sato",
    username: "nova",
    email: "nova@kurio.test",
    avatar: "/assets/emerald.webp",
    bio: "Colecionando histórias digitais.",
  },
  {
    id: "u2",
    name: "Alex Lima",
    username: "alex",
    email: "alex@kurio.test",
    avatar: "/assets/sage.webp",
    bio: "",
  },
];
const names = [
  "Emerald Ape #042",
  "Sage Nomad #009",
  "Neon Vessel #552",
  "Cosmic Bloom #118",
  "Violet Nomad #314",
  "Ivory Baron #088",
  "Golden Beat #207",
  "Golden Echo #210",
  "Golden Signal #160",
];
const images = [
  "emerald",
  "sage",
  "ivory",
  "sage",
  "sage",
  "ivory",
  "golden",
  "golden",
  "golden",
];
const prices = [
  "1.19",
  "1.69",
  "1.99",
  "1.29",
  "1.39",
  "1.79",
  "0.99",
  "1.49",
  "0.39",
];
export const categories = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
];
export const nfts: NFT[] = Array.from({ length: 36 }, (_, i) => ({
  id: i === 0 ? "emerald-042" : `nft-${i + 1}`,
  name: i < 9 ? names[i] : `${names[i % 9].split(" #")[0]} #${600 + i}`,
  image: `/assets/${images[i % 9]}.webp`,
  price: prices[i % 9],
  category: i < 9 ? "Arte digital" : categories[(i - 9) % 9],
  network:
    i < 9 ? "Ethereum" : (["Ethereum", "Polygon", "Solana"] as const)[i % 3],
  attributes: ["Raro", "Kurio Editions", "Arte digital"],
  editions: { "1/1": 0, "1/10": 3, "1/50": 12, Aberta: 30 },
  version: 1,
  featured: i % 3 === 0,
  created: 100 - i,
}));
export const wallets: Wallet[] = [
  {
    id: "w1",
    label: "Principal",
    address: "0xA91F00000000000000000000000000000000E82C",
    network: "Ethereum",
    provider: "MetaMask",
    primary: true,
  },
  {
    id: "w2",
    label: "Reserva",
    address: "nova.kurio.eth",
    network: "Polygon",
    provider: "Coinbase Wallet",
    primary: false,
  },
];
