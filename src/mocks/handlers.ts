import { delay, http, HttpResponse } from "msw";
import { z } from "zod";
import { eth, wei } from "../lib/money";
import type { CartItem, Collector, Order, User } from "../lib/types";
import {
  collectorSchema,
  loginSchema,
  passwordSchema,
  profileSchema,
  signupSchema,
  walletSchema,
} from "../lib/validation";
import {
  cart,
  db,
  hashPassword,
  itemKey,
  mergeCart,
  quote,
  reset,
  save,
  updateNFT,
} from "./database";
import { disconnect, finishPending, publish, settleOrders } from "./realtime";
class Failure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
function fail(status: number, code: string, message: string): never {
  throw new Failure(status, code, message);
}
function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success)
    throw new Failure(
      422,
      "VALIDATION",
      "Verifique os campos informados.",
      Object.fromEntries(
        result.error.issues.map((i) => [String(i.path[0]), i.message]),
      ),
    );
  return result.data;
}
function token(request: Request) {
  return request.headers.get("Authorization")?.replace("Bearer ", "") || "";
}
function session(request: Request, required = true) {
  const s = db.tokens[token(request)];
  if (
    !s ||
    s.expiresAt <= Date.now() ||
    ["expired", "unauthorized"].includes(db.config.scenario)
  ) {
    if (required)
      fail(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente para continuar.",
      );
    return null;
  }
  return db.users.find((u) => u.id === s.userId) ?? null;
}
function owner(request: Request) {
  if (token(request)) return session(request)!.id;
  return "guest:" + request.headers.get("X-Guest-ID");
}
async function body(request: Request) {
  return request.json();
}
const cartSchema = z.object({
  nftId: z.string(),
  edition: z.enum(["1/1", "1/10", "1/50", "Aberta"]),
  quantity: z.number().int().min(1).max(99),
});
let requestCount = 0;
export const handlers = [
  http.all("*/api/*", async ({ request }) => {
    const url = new URL(request.url),
      path = url.pathname.replace(/^.*\/api/, "");
    const method = request.method;
    try {
      if (path.startsWith("/__mock")) {
        if (path === "/__mock/reset") {
          await reset();
          return HttpResponse.json({ ok: true });
        }
        if (path === "/__mock/config") {
          if (method === "GET") return HttpResponse.json(db.config);
          const value = await body(request);
          Object.assign(db.config, value);
          save();
          return HttpResponse.json(db.config);
        }
        if (path === "/__mock/control") {
          const action = await body(request);
          if (action.type === "expire") {
            for (const s of Object.values(db.tokens)) s.expiresAt = 0;
            save();
          }
          if (action.type === "disconnect") disconnect();
          if (action.type === "settle") finishPending();
          if (action.type === "price" || action.type === "sold-out") {
            const n = db.nfts.find(
              (n) => n.id === (action.id || "emerald-042"),
            )!;
            updateNFT(
              n.id,
              action.type === "price"
                ? { price: eth(wei(n.price) + wei("0.1")) }
                : { editions: { ...n.editions, "1/50": 0 } },
            );
            publish("nft.updated", n);
          }
          if (action.type === "duplicate" || action.type === "old") {
            const n = db.nfts.find(
              (n) => n.id === (action.id || "emerald-042"),
            )!;
            publish(
              "nft.updated",
              action.type === "old" ? { ...n, price: "0.01" } : n,
              {
                duplicate: action.type === "duplicate",
                version: action.type === "old" ? 0 : n.version,
              },
            );
          }
          return HttpResponse.json({ ok: true });
        }
        return HttpResponse.json(
          { message: "Controle inexistente" },
          { status: 404 },
        );
      }
      requestCount++;
      const scenario = db.config.scenario;
      await delay(
        scenario === "slow"
          ? 2200
          : scenario === "out-of-order"
            ? url.searchParams.get("q")?.length === 1
              ? 1300
              : 100
            : db.config.latency +
              (scenario === "success" ? 0 : (requestCount * 137) % 80),
      );
      if (scenario === "offline") return HttpResponse.error();
      if (scenario === "server-error")
        fail(
          503,
          "TRANSIENT",
          "Serviço temporariamente indisponível. Tente novamente.",
        );
      settleOrders();
      if (path === "/session" && method === "GET") {
        const u = session(request, false);
        if (token(request) && !u)
          fail(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.");
        return HttpResponse.json({
          user: u,
          expiresAt: u ? db.tokens[token(request)].expiresAt : null,
        });
      }
      if (path === "/auth/login" || path === "/auth/register") {
        const values = await body(request);
        let user: User;
        if (path === "/auth/register") {
          const v = validate(signupSchema, values);
          if (
            db.users.some(
              (u) => u.email === v.email || u.username === v.username,
            )
          )
            fail(
              409,
              "ACCOUNT_EXISTS",
              "E-mail ou nome de usuário já cadastrado.",
            );
          user = {
            id: crypto.randomUUID(),
            name: v.name,
            username: v.username,
            email: v.email,
            bio: "",
            avatar: "",
          };
          db.users.push(user);
          db.passwords[user.id] = await hashPassword(v.password);
          db.wallets[user.id] = [];
          db.favorites[user.id] = [];
        } else {
          const v = validate(loginSchema, values);
          const found = db.users.find((u) => u.email === v.email);
          if (!found)
            fail(401, "BAD_CREDENTIALS", "E-mail ou senha incorretos.");
          const p = db.passwords[found.id];
          if ((await hashPassword(v.password, p.salt)).hash !== p.hash)
            fail(401, "BAD_CREDENTIALS", "E-mail ou senha incorretos.");
          user = found;
        }
        const t = crypto.randomUUID(),
          expiresAt = Date.now() + 1800000;
        db.tokens[t] = { userId: user.id, expiresAt };
        if (["expired", "unauthorized"].includes(db.config.scenario))
          db.config.scenario = "success";
        mergeCart("guest:" + request.headers.get("X-Guest-ID"), user.id);
        save();
        return HttpResponse.json({ token: t, user, expiresAt });
      }
      if (path === "/auth/logout") {
        delete db.tokens[token(request)];
        save();
        return HttpResponse.json({ ok: true });
      }
      if (path === "/auth/expire") {
        const s = db.tokens[token(request)];
        if (s) s.expiresAt = 0;
        save();
        return HttpResponse.json({ ok: true });
      }
      if (path === "/nfts" && method === "GET") {
        let data = [...db.nfts];
        const p = url.searchParams,
          q = (p.get("q") || "").toLocaleLowerCase();
        if (q) data = data.filter((n) => n.name.toLowerCase().includes(q));
        for (const key of ["category", "network"] as const) {
          if (p.get(key)) data = data.filter((n) => n[key] === p.get(key));
        }
        for (const key of ["min", "max"] as const) {
          const v = p.get(key);
          if (v) {
            let amount: bigint;
            try {
              amount = wei(v);
            } catch {
              fail(422, "VALIDATION", "Filtro de preço inválido.");
            }
            data = data.filter((n) =>
              key === "min" ? wei(n.price) >= amount : wei(n.price) <= amount,
            );
          }
        }
        if (p.get("tab") === "trending") data = data.filter((n) => n.featured);
        if (p.get("tab") === "new") data = data.filter((n) => n.created >= 80);
        data.sort((a, b) =>
          p.get("sort") === "price-asc"
            ? wei(a.price) < wei(b.price)
              ? -1
              : wei(a.price) > wei(b.price)
                ? 1
                : 0
            : p.get("sort") === "price-desc"
              ? wei(a.price) > wei(b.price)
                ? -1
                : wei(a.price) < wei(b.price)
                  ? 1
                  : 0
              : b.created - a.created,
        );
        if (scenario === "empty") data = [];
        const page = Math.max(1, Number(p.get("page")) || 1),
          total = data.length;
        return HttpResponse.json({
          items: data.slice((page - 1) * 9, page * 9),
          total,
          page,
          pages: Math.ceil(total / 9),
        });
      }
      if (path.startsWith("/nfts/") && method === "GET") {
        const nft = db.nfts.find((n) => n.id === path.split("/")[2]);
        if (!nft) fail(404, "NOT_FOUND", "NFT não encontrado.");
        return HttpResponse.json(nft);
      }
      if (path === "/favorites") {
        const user = session(request)!;
        const list = (db.favorites[user.id] ??= []);
        if (method === "GET") return HttpResponse.json(list);
        if (scenario === "favorite-error")
          fail(503, "TRANSIENT", "Não foi possível atualizar os favoritos.");
        const v = await body(request);
        if (!db.nfts.some((n) => n.id === v.nftId))
          fail(404, "NOT_FOUND", "NFT não encontrado.");
        db.favorites[user.id] =
          method === "POST"
            ? [...new Set([...list, v.nftId])]
            : list.filter((id) => id !== v.nftId);
        save();
        return HttpResponse.json(db.favorites[user.id]);
      }
      if (path === "/cart") {
        const c = cart(owner(request));
        if (method === "GET") return HttpResponse.json(c);
        const v = await body(request);
        if (method === "POST" || method === "PATCH") {
          const line = validate(cartSchema, v),
            nft = db.nfts.find((n) => n.id === line.nftId);
          if (!nft) fail(404, "NOT_FOUND", "NFT não encontrado.");
          const item = c.items.find((i) => itemKey(i) === itemKey(line));
          const quantity =
            method === "POST"
              ? line.quantity + (item?.quantity ?? 0)
              : line.quantity;
          if (quantity > nft.editions[line.edition])
            fail(
              409,
              "STOCK_CONFLICT",
              "Quantidade indisponível para esta edição.",
            );
          if (item) item.quantity = quantity;
          else c.items.push({ ...line, quantity });
        } else if (method === "DELETE")
          c.items = c.items.filter(
            (i) => itemKey(i) !== itemKey(v as CartItem),
          );
        c.version++;
        save();
        return HttpResponse.json(c);
      }
      if (path === "/cart/coupon") {
        const c = cart(owner(request));
        const v = await body(request);
        const code = String(v.code || "")
          .trim()
          .toUpperCase();
        if (code && code !== "KURIO10")
          fail(
            422,
            code === "EXPIRED" ? "COUPON_EXPIRED" : "COUPON_INVALID",
            code === "EXPIRED"
              ? "Cupom expirado."
              : "Cupom inválido. Experimente KURIO10.",
          );
        c.coupon = code;
        c.version++;
        save();
        return HttpResponse.json(c);
      }
      if (path === "/quotes") {
        const v = await body(request);
        return HttpResponse.json(
          quote(owner(request), v.network || "Ethereum"),
        );
      }
      if (path === "/profile") {
        const u = session(request)!;
        if (method === "GET") return HttpResponse.json(u);
        const v = validate(profileSchema, await body(request));
        if (scenario === "validation")
          throw new Failure(422, "VALIDATION", "Revise os dados.", {
            name: "Este nome não está disponível.",
          });
        if (
          db.users.some(
            (x) =>
              x.id !== u.id &&
              (x.email === v.email || x.username === v.username),
          )
        )
          fail(409, "ACCOUNT_EXISTS", "E-mail ou usuário já utilizado.");
        Object.assign(u, v);
        save();
        return HttpResponse.json(u);
      }
      if (path === "/profile/password") {
        const u = session(request)!;
        const v = validate(passwordSchema, await body(request)),
          p = db.passwords[u.id];
        if ((await hashPassword(v.current, p.salt)).hash !== p.hash)
          throw new Failure(422, "VALIDATION", "Senha atual incorreta.", {
            current: "Senha atual incorreta.",
          });
        db.passwords[u.id] = await hashPassword(v.password);
        for (const [t, s] of Object.entries(db.tokens))
          if (s.userId === u.id && t !== token(request)) delete db.tokens[t];
        save();
        return HttpResponse.json({ ok: true });
      }
      if (path === "/wallets" || path.startsWith("/wallets/")) {
        const u = session(request)!,
          list = (db.wallets[u.id] ??= []);
        if (method === "GET") return HttpResponse.json(list);
        if (path.endsWith("/connect")) {
          const v = await body(request);
          if (!list.some((w) => w.id === v.walletId))
            fail(403, "FORBIDDEN", "Carteira não pertence à sua conta.");
          if (v.refuse)
            fail(
              409,
              "WALLET_REFUSED",
              "Conexão recusada pela carteira simulada.",
            );
          return HttpResponse.json({ connected: true });
        }
        const v = validate(walletSchema, await body(request));
        if (scenario === "validation")
          throw new Failure(422, "VALIDATION", "Carteira inválida.", {
            address: "Endereço recusado pela simulação.",
          });
        const id = path.split("/")[2];
        if (v.primary) list.forEach((w) => (w.primary = false));
        if (method === "PATCH") {
          const w = list.find((w) => w.id === id);
          if (!w) fail(404, "NOT_FOUND", "Carteira não encontrada.");
          Object.assign(w, v);
        } else {
          if (list.length >= 2)
            fail(
              409,
              "WALLET_LIMIT",
              "Você já possui duas carteiras. Edite uma delas.",
            );
          list.push({
            ...v,
            id: crypto.randomUUID(),
            primary: list.length === 0 || v.primary,
          });
        }
        db.wallets[u.id] = list;
        save();
        return HttpResponse.json(list);
      }
      if (path === "/orders" && method === "POST") {
        const user = session(request)!,
          v = await body(request),
          key = request.headers.get("Idempotency-Key");
        if (!key)
          fail(
            422,
            "IDEMPOTENCY_REQUIRED",
            "Chave de idempotência obrigatória.",
          );
        const hash = JSON.stringify(v),
          scope = user.id + ":" + key;
        const existing = db.idempotency[scope];
        if (existing) {
          if (existing.hash !== hash)
            fail(
              409,
              "IDEMPOTENCY_CONFLICT",
              "Chave já utilizada com conteúdo diferente.",
            );
          return HttpResponse.json(db.orders[existing.orderId]);
        }
        const collector: Collector = validate(collectorSchema, v.collector),
          wallet = db.wallets[user.id]?.find((w) => w.id === v.walletId);
        if (!wallet)
          fail(403, "FORBIDDEN", "Selecione uma carteira da sua conta.");
        const previous = db.quotes[v.quoteId];
        if (!previous || previous.owner !== user.id)
          fail(403, "FORBIDDEN", "Cotação não pertence à sessão.");
        if (scenario === "price-change" || scenario === "sold-out") {
          const n = db.nfts.find((n) => n.id === cart(user.id).items[0]?.nftId);
          if (n) {
            updateNFT(
              n.id,
              scenario === "price-change"
                ? { price: eth(wei(n.price) + wei("0.1")) }
                : { editions: { ...n.editions, "1/50": 0 } },
            );
            publish("nft.updated", n);
          }
          db.config.scenario = "success";
        }
        const current = quote(user.id, wallet.network);
        if (!current.valid)
          fail(409, "STOCK_CONFLICT", current.issues.join(" "));
        if (
          previous.quote.fingerprint !== current.fingerprint ||
          previous.quote.expiresAt < Date.now()
        )
          fail(
            409,
            "QUOTE_CHANGED",
            "Valores alterados ou cotação expirada. Revise e confirme novamente.",
          );
        const order: Order = {
          id: crypto.randomUUID(),
          userId: user.id,
          status: "pending",
          quote: structuredClone(current),
          wallet: structuredClone(wallet),
          collector,
          transaction: "SIM-" + crypto.randomUUID(),
          version: 1,
          createdAt: Date.now(),
          settleAt: Date.now() + (scenario === "pending" ? 86400000 : 2200),
          decline: scenario === "payment-declined",
        };
        for (const item of current.items) {
          const n = db.nfts.find((n) => n.id === item.nftId)!;
          n.editions[item.edition] -= item.quantity;
          n.version++;
          publish("nft.updated", n);
        }
        db.orders[order.id] = order;
        db.idempotency[scope] = { hash, orderId: order.id };
        save();
        if (scenario === "order-timeout") {
          await delay(13000);
        }
        return HttpResponse.json(order, { status: 201 });
      }
      if (path === "/orders" && method === "GET") {
        const user = session(request)!;
        return HttpResponse.json(
          Object.values(db.orders)
            .filter((o) => o.userId === user.id)
            .sort((a, b) => b.createdAt - a.createdAt),
        );
      }
      if (path.startsWith("/orders/") && method === "GET") {
        const user = session(request)!,
          order = db.orders[path.split("/")[2]];
        if (!order) fail(404, "NOT_FOUND", "Pedido não encontrado.");
        if (order.userId !== user.id)
          fail(403, "FORBIDDEN", "Pedido não pertence à sua conta.");
        return HttpResponse.json(order);
      }
      fail(404, "NOT_FOUND", "Recurso não encontrado.");
    } catch (error) {
      if (error instanceof Failure)
        return HttpResponse.json(
          { code: error.code, message: error.message, fields: error.fields },
          { status: error.status },
        );
      console.error(error);
      return HttpResponse.json(
        {
          code: "INTERNAL",
          message: "Não foi possível processar a solicitação.",
        },
        { status: 500 },
      );
    }
  }),
];
