import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { notify, TOKEN_KEY } from "./api";
import { queryClient } from "./query";
import type { NFT, Order, ResourceEvent } from "./types";
export function useRealtime(userId?: string) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let active = true;
    const versions = new Map<string, number>();
    const seen = new Set<string>();
    const token = localStorage.getItem(TOKEN_KEY) || "";
    let socket: Socket | undefined;
    const online = () => {
      socket?.connect();
      reconcile();
    };
    const reconcile = () => {
      for (const key of ["nfts", "nft", "cart", "quote", "order", "orders"])
        void queryClient.invalidateQueries({ queryKey: [key] });
    };
    void import("socket.io-client")
      .then(({ io }) => {
        if (!active) return;
        socket = io(import.meta.env.VITE_SOCKET_URL || location.origin, {
          transports: ["websocket"],
          query: { token },
          reconnectionDelay: 500,
          reconnectionDelayMax: 2000,
        });
        socket.on("connect", () => {
          if (!active) return;
          setConnected(true);
          reconcile();
        });
        socket.on("disconnect", () => {
          if (active) setConnected(false);
        });
        socket.on("connect_error", () => {
          if (active) setConnected(false);
        });
        const accept = (name: string, e: ResourceEvent) => {
          if (!active || seen.has(e.id) || (e.userId && e.userId !== userId))
            return false;
          const key = name + ":" + e.resourceId;
          const current =
            name === "order"
              ? queryClient.getQueryData<Order>(["order", userId, e.resourceId])
                  ?.version
              : queryClient.getQueryData<NFT>(["nft", e.resourceId])?.version;
          const floor = Math.max(versions.get(key) ?? 0, current ?? 0);
          if (e.version <= floor) return false;
          seen.add(e.id);
          versions.set(key, e.version);
          if (seen.size > 1000) seen.clear();
          return true;
        };
        socket.on("nft.updated", (e: ResourceEvent) => {
          if (!accept("nft", e)) return;
          notify(
            "Preço ou disponibilidade atualizado. Confira os valores antes de comprar.",
          );
          for (const key of ["nfts", "nft", "cart", "quote"])
            void queryClient.invalidateQueries({ queryKey: [key] });
        });
        socket.on("order.updated", (e: ResourceEvent) => {
          if (!accept("order", e)) return;
          const cached = queryClient.getQueryData<Order>([
            "order",
            userId,
            e.resourceId,
          ]);
          if (cached && cached.status !== "pending") return;
          if (e.data)
            queryClient.setQueryData(["order", userId, e.resourceId], e.data);
          for (const key of ["orders", "cart", "quote"])
            void queryClient.invalidateQueries({ queryKey: [key] });
        });
        window.addEventListener("online", online);
      })
      .catch(() => {
        if (active) setConnected(false);
      });
    return () => {
      active = false;
      socket?.removeAllListeners();
      socket?.disconnect();
      window.removeEventListener("online", online);
    };
  }, [userId]);
  return connected;
}
