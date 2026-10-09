import { nfts, users, wallets } from "./fixtures";
import type {
  Cart,
  CartItem,
  MockConfig,
  NFT,
  Order,
  Quote,
  User,
  Wallet,
} from "../lib/types";
import { eth, wei } from "../lib/money";
const KEY = "kurio:database:v1";
interface Password {
  salt: string;
  hash: string;
}
interface DB {
  users: User[];
  passwords: Record<string, Password>;
  tokens: Record<string, { userId: string; expiresAt: number }>;
  nfts: NFT[];
  carts: Record<string, Cart>;
  favorites: Record<string, string[]>;
  wallets: Record<string, Wallet[]>;
  quotes: Record<string, { owner: string; quote: Quote }>;
  orders: Record<string, Order>;
  idempotency: Record<string, { hash: string; orderId: string }>;
  config: MockConfig;
}
const empty = (): DB => ({
  users: structuredClone(users),
  passwords: {},
  tokens: {},
  nfts: structuredClone(nfts),
  carts: {},
  favorites: { u1: [], u2: [] },
  wallets: {
    u1: structuredClone(wallets),
    u2: [{ ...wallets[0], id: "w3", label: "Alex principal" }],
  },
  quotes: {},
  orders: {},
  idempotency: {},
  config: { scenario: "success", latency: 120, seed: 1 },
});
export let db: DB = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null") || empty();
  } catch {
    return empty();
  }
})();
export function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
}
export async function hashPassword(
  password: string,
  salt: string = crypto.randomUUID(),
): Promise<Password> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return {
    salt,
    hash: Array.from(new Uint8Array(bits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  };
}
export async function initialize() {
  for (const u of db.users) {
    if (!db.passwords[u.id])
      db.passwords[u.id] = await hashPassword("Kurio123!");
  }
  save();
}
export async function reset() {
  db = empty();
  await initialize();
}
export function cart(owner: string) {
  return (
    db.carts[owner] ?? (db.carts[owner] = { items: [], coupon: "", version: 1 })
  );
}
export function itemKey(item: CartItem) {
  return item.nftId + ":" + item.edition;
}
export function mergeCart(guest: string, user: string) {
  const g = cart(guest),
    u = cart(user);
  for (const line of g.items) {
    const nft = db.nfts.find((n) => n.id === line.nftId);
    if (!nft) continue;
    const existing = u.items.find((i) => itemKey(i) === itemKey(line));
    const quantity = Math.min(
      nft.editions[line.edition],
      line.quantity + (existing?.quantity ?? 0),
    );
    if (quantity > 0) {
      if (existing) existing.quantity = quantity;
      else u.items.push({ ...line, quantity });
    }
  }
  u.coupon = u.coupon || g.coupon;
  u.version++;
  db.carts[guest] = { items: [], coupon: "", version: 1 };
  save();
}
export function quote(owner: string, network = "Ethereum"): Quote {
  const c = cart(owner),
    issues: string[] = [];
  const items = c.items.flatMap((item) => {
    const n = db.nfts.find((n) => n.id === item.nftId);
    if (!n) {
      issues.push("NFT não encontrado.");
      return [];
    }
    if (item.quantity > n.editions[item.edition])
      issues.push(
        `${n.name}: edição indisponível ou quantidade acima do estoque.`,
      );
    if (network !== n.network)
      issues.push(`${n.name}: selecione uma carteira na rede ${n.network}.`);
    return [
      {
        ...item,
        name: n.name,
        image: n.image,
        price: n.price,
        lineTotal: eth(wei(n.price) * BigInt(item.quantity)),
        available: n.editions[item.edition],
        nftVersion: n.version,
      },
    ];
  });
  if (!items.length) issues.push("Seu carrinho está vazio.");
  const subtotal = items.reduce((s, i) => s + wei(i.lineTotal), 0n);
  let discount = 0n;
  if (c.coupon === "KURIO10") discount = subtotal / 10n;
  else if (c.coupon)
    issues.push(c.coupon === "EXPIRED" ? "Cupom expirado." : "Cupom inválido.");
  const fee = items.length
    ? wei(
        network === "Polygon"
          ? "0.002"
          : network === "Solana"
            ? "0.001"
            : "0.016",
      )
    : 0n;
  const fingerprint = JSON.stringify({
    items,
    coupon: c.coupon,
    fee: eth(fee),
    discount: eth(discount),
    network,
  });
  const q: Quote = {
    id: crypto.randomUUID(),
    fingerprint,
    items,
    subtotal: eth(subtotal),
    discount: eth(discount),
    fee: eth(fee),
    total: eth(subtotal - discount + fee),
    coupon: c.coupon,
    valid: issues.length === 0,
    issues,
    expiresAt: Date.now() + 120000,
  };
  db.quotes[q.id] = { owner, quote: q };
  save();
  return q;
}
export function updateNFT(
  id: string,
  change: Partial<Pick<NFT, "price" | "editions">>,
) {
  const nft = db.nfts.find((n) => n.id === id);
  if (!nft) throw Error("NFT inexistente");
  Object.assign(nft, change);
  nft.version++;
  save();
  return structuredClone(nft);
}
export function settle(order: Order) {
  if (order.status !== "pending" || Date.now() < order.settleAt) return false;
  order.status = order.decline ? "declined" : "confirmed";
  order.version++;
  if (order.status === "confirmed") {
    const c = cart(order.userId);
    for (const bought of order.quote.items) {
      const current = c.items.find((i) => itemKey(i) === itemKey(bought));
      if (current)
        current.quantity = Math.max(0, current.quantity - bought.quantity);
    }
    c.items = c.items.filter((i) => i.quantity > 0);
    c.version++;
  } else {
    for (const item of order.quote.items) {
      const nft = db.nfts.find((n) => n.id === item.nftId);
      if (nft) {
        nft.editions[item.edition] += item.quantity;
        nft.version++;
      }
    }
  }
  save();
  return true;
}
