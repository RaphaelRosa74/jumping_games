import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { errorMessage, http, notify } from "../lib/api";
import { invalidateCart, useCart, useQuote } from "../lib/query";
import type { QuoteItem } from "../lib/types";
import { money } from "../lib/money";
import {
  Breadcrumb,
  Empty,
  ErrorState,
  Quantity,
  Skeleton,
  Totals,
} from "../components/shared";
import { Button } from "../components/ui/button";
export default function CartPage() {
  const cart = useCart(),
    quote = useQuote();
  const [code, setCode] = useState("");
  const change = useMutation({
    mutationFn: async ({
      item,
      quantity,
    }: {
      item: QuoteItem;
      quantity: number;
    }) => {
      await http.request({
        method: quantity ? "PATCH" : "DELETE",
        url: "/cart",
        data: { nftId: item.nftId, edition: item.edition, quantity },
      });
    },
    onSuccess: () => invalidateCart(),
    onError: (e) => notify(errorMessage(e)),
  });
  const coupon = useMutation({
    mutationFn: async (value: string) => {
      await http.post("/cart/coupon", { code: value });
    },
    onSuccess: () => {
      void invalidateCart();
      setCode("");
      notify("Cupom atualizado.");
    },
    onError: (e) => notify(errorMessage(e)),
  });
  return (
    <>
      <Breadcrumb title="Carrinho de NFTs" />
      <h1 className="page-heading">Carrinho de NFTs</h1>
      {cart.isPending || quote.isPending ? (
        <Skeleton kind="summary" />
      ) : cart.isError || quote.isError ? (
        <ErrorState
          error={cart.error || quote.error}
          retry={() => {
            void cart.refetch();
            void quote.refetch();
          }}
        />
      ) : quote.data.items.length === 0 ? (
        <Empty title="Seu carrinho está vazio">
          <Button asChild>
            <Link to="/">Explorar NFTs</Link>
          </Button>
        </Empty>
      ) : (
        <div className="cart-layout">
          <section aria-label="Itens do carrinho">
            <div className="cart-head">
              <span>NFT</span>
              <span>Preço</span>
              <span>Edição / quantidade</span>
              <span>Total</span>
            </div>
            {quote.data.items.map((i) => (
              <article className="cart-row" key={i.nftId + i.edition}>
                <Link to="/nft/$id" params={{ id: i.nftId }}>
                  <img src={i.image} width="100" height="100" alt={i.name} />
                  <div>
                    <h2>{i.name}</h2>
                    <p className="muted">Edição: {i.edition}</p>
                  </div>
                </Link>
                <span className="unit-price price">{money(i.price)}</span>
                <Quantity
                  value={i.quantity}
                  max={i.available}
                  disabled={change.isPending}
                  onChange={(n) => change.mutate({ item: i, quantity: n })}
                />
                <strong className="line-total price">
                  {money(i.lineTotal)}
                </strong>
                <button
                  aria-label={`Remover ${i.name}`}
                  disabled={change.isPending}
                  onClick={() => change.mutate({ item: i, quantity: 0 })}
                >
                  <Trash2 size={18} />
                </button>
                {i.quantity > i.available && (
                  <p className="field-error">
                    Disponibilidade alterada. Reduza a quantidade ou remova o
                    item.
                  </p>
                )}
              </article>
            ))}
          </section>
          <aside className="cart-summary">
            <h2>Resumo do carrinho</h2>
            <form
              className="coupon-form"
              onSubmit={(e) => {
                e.preventDefault();
                coupon.mutate(code);
              }}
            >
              <label className="sr-only" htmlFor="coupon">
                Código promocional
              </label>
              <input
                id="coupon"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Código promocional"
              />
              <Button type="submit" size="sm" disabled={coupon.isPending}>
                Aplicar
              </Button>
            </form>
            {quote.data.coupon && (
              <p>
                {quote.data.coupon}{" "}
                <button className="text-link" onClick={() => coupon.mutate("")}>
                  Remover cupom
                </button>
              </p>
            )}
            <Totals quote={quote.data} />
            <Button asChild className="w-full">
              <Link to="/pagamento">Conectar e finalizar</Link>
            </Button>
            <p className="muted small mt-3">
              Compra e conexão de carteira simuladas. Nenhum valor real será
              cobrado.
            </p>
            {quote.isFetching && <p role="status">Atualizando cotação…</p>}
          </aside>
        </div>
      )}
    </>
  );
}
