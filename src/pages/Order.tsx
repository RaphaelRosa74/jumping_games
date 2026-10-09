import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { api, notify } from "../lib/api";
import { useScope } from "../lib/query";
import { ErrorState, Skeleton, Totals } from "../components/shared";
import { Button } from "../components/ui/button";
import { money } from "../lib/money";
export default function OrderPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const scope = useScope();
  const q = useQuery({
    queryKey: ["order", scope, id],
    queryFn: ({ signal }) => api.order(id, signal),
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1500 : false,
  });
  if (q.isPending) return <Skeleton kind="summary" />;
  if (q.isError)
    return <ErrorState error={q.error} retry={() => void q.refetch()} />;
  const o = q.data;
  return (
    <section className="receipt">
      <div className="receipt-icon">
        {o.status === "confirmed" ? (
          <CheckCircle2 size={48} />
        ) : o.status === "declined" ? (
          <XCircle size={48} />
        ) : (
          <Clock size={48} />
        )}
      </div>
      <h1>
        {o.status === "confirmed"
          ? "Seus NFTs agora estão na sua carteira!"
          : o.status === "declined"
            ? "Pagamento recusado"
            : "Pedido pendente"}
      </h1>
      <p role="status" className="muted">
        {o.status === "confirmed"
          ? "Compra confirmada pela simulação."
          : o.status === "declined"
            ? "Nenhuma compra foi concluída. Seus itens estão preservados no carrinho."
            : "Estamos aguardando a simulação. Você pode atualizar esta página sem criar outra compra."}
      </p>
      <p className="receipt-id">
        Pedido: <span data-testid="order-id">{o.id}</span>
      </p>
      {o.status === "confirmed" && (
        <>
          <p className="receipt-id">Transação: {o.transaction}</p>
          <button
            className="text-link"
            onClick={() =>
              notify(
                "Referência simulada. Não existe uma transação em explorador de blockchain.",
              )
            }
          >
            Ver referência simulada ↗
          </button>
        </>
      )}
      <h2 className="mt-6">
        {o.status === "confirmed" ? "Recibo da compra" : "Resumo do pedido"}
      </h2>
      {o.quote.items.map((i) => (
        <div className="checkout-item" key={i.nftId + i.edition}>
          <img src={i.image} alt="" width="60" height="60" />
          <span>
            <strong>{i.name}</strong>
            <small>
              {i.edition} × {i.quantity}
            </small>
          </span>
          <strong>{money(i.lineTotal)}</strong>
        </div>
      ))}
      <Totals quote={o.quote} />
      <p className="muted small">
        {o.wallet.label} · {o.wallet.network}
        <br />
        {o.wallet.address}
      </p>
      {o.status === "declined" ? (
        <Button asChild>
          <Link to="/carrinho">Voltar ao carrinho</Link>
        </Button>
      ) : o.status === "confirmed" ? (
        <Button asChild>
          <Link to="/">Voltar ao marketplace</Link>
        </Button>
      ) : (
        <Button variant="outline" onClick={() => void q.refetch()}>
          Atualizar pedido
        </Button>
      )}
    </section>
  );
}
