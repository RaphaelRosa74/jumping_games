import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { db, save, settle } from "./database";
import type { NFT, Order, ResourceEvent } from "../lib/types";
const link = ws.link(new URL(location.origin).origin.replace(/^http/, "ws"));
const peers = new Set<{ io: ReturnType<typeof toSocketIo>; token: string }>();
export const socketHandler = link.addEventListener(
  "connection",
  (connection) => {
    const io = toSocketIo(connection);
    const token =
      new URL(connection.client.url).searchParams.get("token") || "";
    const peer = { io, token };
    peers.add(peer);
    const heartbeat = setInterval(() => connection.client.send("2"), 15000);
    connection.client.addEventListener("close", () => {
      clearInterval(heartbeat);
      peers.delete(peer);
    });
  },
);
export function publish(
  name: "nft.updated" | "order.updated",
  data: NFT | Order,
  options: { version?: number; duplicate?: boolean } = {},
) {
  const event: ResourceEvent = {
    id: crypto.randomUUID(),
    resourceId: data.id,
    version: options.version ?? data.version,
    data: structuredClone(data),
    ...("userId" in data ? { userId: data.userId } : {}),
  };
  for (const p of peers) {
    if (event.userId) {
      const s = db.tokens[p.token];
      if (!s || s.expiresAt <= Date.now() || s.userId !== event.userId)
        continue;
    }
    p.io.client.emit(name, event);
    if (options.duplicate) p.io.client.emit(name, event);
  }
}
export function disconnect() {
  for (const p of peers) p.io.rawClient.close(4001, "Interrupção simulada");
}
export function settleOrders() {
  for (const order of Object.values(db.orders)) {
    if (settle(order)) {
      publish("order.updated", order);
      for (const item of order.quote.items) {
        const n = db.nfts.find((n) => n.id === item.nftId);
        if (n) publish("nft.updated", n);
      }
    }
  }
}
export function finishPending() {
  for (const o of Object.values(db.orders))
    if (o.status === "pending") o.settleAt = Date.now();
  save();
  settleOrders();
}
export function startClock() {
  setInterval(settleOrders, 350);
}
