import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, errorCode, errorMessage, http, notify } from "../lib/api";
import { queryClient, useQuote, useSession } from "../lib/query";
import { collectorSchema } from "../lib/validation";
import type { Collector, Quote, User, Wallet } from "../lib/types";
import {
  Breadcrumb,
  Empty,
  ErrorState,
  Field,
  Select,
  Skeleton,
  Totals,
} from "../components/shared";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { money } from "../lib/money";
interface Attempt {
  key: string;
  input: { quoteId: string; walletId: string; collector: Collector };
}
function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
function CheckoutForm({ user, wallets }: { user: User; wallets: Wallet[] }) {
  const navigate = useNavigate();
  const draftKey = "kurio:checkout:" + user.id,
    attemptKey = "kurio:attempt:" + user.id;
  const [draft] = useState(() => read<Collector>(draftKey));
  const [walletId, setWalletId] = useState(
    wallets.find((w) => w.primary)?.id || wallets[0]?.id || "",
  );
  const wallet = wallets.find((w) => w.id === walletId);
  const [network, setNetwork] = useState(wallet?.network || "Ethereum");
  const [connected, setConnected] = useState("");
  const quote = useQuote(network);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCollector, setShowCollector] = useState(false);
  const [review, setReview] = useState<{
    quote: Quote;
    collector: Collector;
  } | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(() =>
    read(attemptKey),
  );
  const guard = useRef(false);
  const [requiresReview, setRequiresReview] = useState(false);
  const connect = useMutation({
    mutationFn: async (refuse: boolean) =>
      (await http.post("/wallets/connect", { walletId, refuse })).data,
    onSuccess: () => {
      setConnected(walletId);
      notify("Carteira conectada na simulação.");
    },
    onError: (e) => notify(errorMessage(e)),
  });
  const order = useMutation({
    mutationFn: (a: Attempt) => api.createOrder(a.input, a.key),
    onSuccess: async (result) => {
      localStorage.removeItem(attemptKey);
      localStorage.removeItem(draftKey);
      setAttempt(null);
      queryClient.setQueryData(["order", user.id, result.id], result);
      await navigate({ to: "/pedido/$id", params: { id: result.id } });
    },
    onError: (e) => {
      if (
        ["QUOTE_CHANGED", "STOCK_CONFLICT", "FORBIDDEN", "VALIDATION"].includes(
          errorCode(e) || "",
        )
      ) {
        localStorage.removeItem(attemptKey);
        setAttempt(null);
        setReview(null);
        setRequiresReview(true);
        void quote.refetch();
      }
      notify(errorMessage(e));
    },
    onSettled: () => {
      guard.current = false;
    },
  });
  const submit = (a: Attempt) => {
    if (guard.current) return;
    guard.current = true;
    setAttempt(a);
    localStorage.setItem(attemptKey, JSON.stringify(a));
    order.mutate(a);
  };
  if (quote.isPending) return <Skeleton kind="summary" />;
  if (quote.isError)
    return (
      <ErrorState error={quote.error} retry={() => void quote.refetch()} />
    );
  if (!wallets.length)
    return (
      <Empty title="Cadastre uma carteira para continuar">
        <Button asChild>
          <Link to="/carteiras">Cadastrar carteira</Link>
        </Button>
        <p>Seu carrinho está preservado.</p>
      </Empty>
    );
  if (!quote.data.items.length && !attempt)
    return (
      <Empty title="Seu carrinho está vazio">
        <Button asChild>
          <Link to="/">Explorar NFTs</Link>
        </Button>
      </Empty>
    );
  const q = quote.data,
    changed =
      !!review && !attempt && review.quote.fingerprint !== q.fingerprint;
  return (
    <>
      <Breadcrumb title="Mercado / Pagamento" />
      <h1 className="page-heading">Pagamento com carteira</h1>
      {attempt && (
        <div role="status" className="recovery-banner">
          <h2>Uma compra precisa ser recuperada</h2>
          <p>
            A resposta anterior pode ter se perdido. Recuperar consulta a mesma
            tentativa e não cria uma segunda compra.
          </p>
          <Button onClick={() => submit(attempt)} disabled={order.isPending}>
            Recuperar pedido
          </Button>
          <Link to="/pedidos" className="text-link">
            Ver meus pedidos
          </Link>
        </div>
      )}
      {requiresReview && (
        <p role="alert" className="notice-inline">
          A cotação mudou. Confira os valores atualizados e revise novamente.
        </p>
      )}
      <form
        className="checkout-layout"
        noValidate
        onChange={(e) => {
          const form = e.currentTarget;
          const values = Object.fromEntries(new FormData(form));
          localStorage.setItem(draftKey, JSON.stringify(values));
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (attempt) {
            notify(
              "Recupere a tentativa anterior antes de iniciar outra compra.",
            );
            return;
          }
          const result = collectorSchema.safeParse(
            Object.fromEntries(new FormData(e.currentTarget)),
          );
          if (!result.success) {
            setShowCollector(true);
            setErrors(
              Object.fromEntries(
                result.error.issues.map((i) => [String(i.path[0]), i.message]),
              ),
            );
            return;
          }
          setErrors({});
          if (connected !== walletId) {
            notify("Conecte a carteira para continuar.");
            return;
          }
          if (network !== wallet?.network) {
            notify("Selecione a mesma rede da carteira.");
            return;
          }
          setReview({ quote: q, collector: result.data });
          setRequiresReview(false);
        }}
      >
        <section>
          <div className="collector-block">
            <button
              type="button"
              className="collector-toggle"
              aria-expanded={showCollector}
              aria-controls="collector-fields"
              onClick={() => setShowCollector(!showCollector)}
            >
              Dados do colecionador · {showCollector ? "Recolher" : "Editar"}
            </button>
            <div
              id="collector-fields"
              className={
                showCollector ? "collector-fields expanded" : "collector-fields"
              }
            >
              <h2>Perfil do colecionador</h2>
              <div className="form-grid">
                <Field
                  label="Nome de exibição"
                  name="name"
                  required
                  defaultValue={draft?.name || user.name}
                  error={errors.name}
                />
                <Field
                  label="Nome de usuário"
                  name="username"
                  required
                  defaultValue={draft?.username || user.username}
                  error={errors.username}
                />
                <Field
                  label="Nome do perfil"
                  name="profile"
                  required
                  defaultValue={draft?.profile || user.username}
                  error={errors.profile}
                />
                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  required
                  defaultValue={draft?.email || user.email}
                  error={errors.email}
                />
                <Field
                  label="Código de indicação"
                  name="referral"
                  required
                  defaultValue={draft?.referral || "KURIO"}
                  error={errors.referral}
                />
                <Field
                  label="Nome ENS"
                  name="ens"
                  required
                  defaultValue={draft?.ens || user.username + ".eth"}
                  error={errors.ens}
                />
              </div>
              <div className="field">
                <label htmlFor="note">
                  Observação do colecionador (opcional)
                </label>
                <textarea
                  id="note"
                  name="note"
                  maxLength={500}
                  defaultValue={draft?.note || ""}
                />
              </div>
            </div>
          </div>
          <h2 className="wallet-title mt-8">Suas carteiras</h2>
          <div className="wallet-choices">
            {wallets.map((w) => (
              <label key={w.id} className={walletId === w.id ? "selected" : ""}>
                <input
                  type="radio"
                  name="selectedWallet"
                  value={w.id}
                  checked={walletId === w.id}
                  onChange={() => {
                    setWalletId(w.id);
                    setNetwork(w.network);
                    setConnected("");
                  }}
                />
                <span>
                  <strong>{w.label}</strong>
                  <small>{w.address}</small>
                  <small>
                    Rede {w.network} · {w.provider}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <Link to="/carteiras" className="text-link">
            Gerenciar carteiras
          </Link>
          <Select
            label="Rede da transação"
            id="transaction-network"
            value={network}
            onChange={(e) => {
              setNetwork(e.target.value as Wallet["network"]);
              setConnected("");
            }}
          >
            <option>Ethereum</option>
            <option>Polygon</option>
            <option>Solana</option>
          </Select>
          <div className="connection-actions">
            {connected === walletId ? (
              <>
                <p role="status">✓ Carteira conectada (simulação)</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConnected("");
                    notify("Carteira desconectada.");
                  }}
                >
                  Desconectar
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={connect.isPending}
                  onClick={() => connect.mutate(false)}
                >
                  Conectar carteira
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => connect.mutate(true)}
                >
                  Simular recusa
                </Button>
              </>
            )}
          </div>
        </section>
        <aside className="checkout-summary">
          <h2>Seus NFTs</h2>
          {q.items.map((i) => (
            <div key={i.nftId + i.edition} className="checkout-item">
              <img src={i.image} width="72" height="72" alt="" />
              <span>
                <strong>{i.name}</strong>
                <small>
                  Edição {i.edition} × {i.quantity}
                </small>
              </span>
              <strong className="price">{money(i.lineTotal)}</strong>
            </div>
          ))}
          <Totals quote={q} />
          {q.issues.length > 0 && (
            <div role="alert" className="field-error">
              {q.issues.map((s) => (
                <p key={s}>{s}</p>
              ))}
              <Link to="/carrinho">Corrigir carrinho</Link>
            </div>
          )}
          <p className="muted small">
            {wallet?.provider} · {network}
            <br />A cotação será revalidada antes do envio.
          </p>
          <Button
            type="submit"
            className="w-full mt-6"
            disabled={!q.valid || order.isPending || !!attempt}
          >
            Revisar compra
          </Button>
          {order.isError && <ErrorState error={order.error} />}
        </aside>
      </form>
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!order.isPending && !open) setReview(null);
        }}
        title="Revise sua compra"
        description="Todos os valores e a transação são simulados."
      >
        {review && (
          <>
            <p className="mt-4">
              {review.collector.name} · {wallet?.label}
            </p>
            <Totals quote={changed ? q : review.quote} />
            {changed && (
              <p role="alert" className="field-error">
                Preço ou disponibilidade alterado. Atualize a revisão antes de
                confirmar.
              </p>
            )}
            {changed ? (
              <Button
                onClick={() => setReview({ ...review, quote: q })}
                disabled={!q.valid}
              >
                Atualizar revisão
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={
                  order.isPending || !!attempt || connected !== walletId
                }
                onClick={() =>
                  submit({
                    key: crypto.randomUUID(),
                    input: {
                      quoteId: review.quote.id,
                      walletId,
                      collector: review.collector,
                    },
                  })
                }
              >
                {order.isPending ? "Enviando…" : "Confirmar compra"}
              </Button>
            )}
            {order.isError && <ErrorState error={order.error} />}
          </>
        )}
      </Dialog>
    </>
  );
}
export default function CheckoutPage() {
  const user = useSession().data?.user;
  const wallets = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: api.wallets,
    enabled: !!user,
  });
  return !user || wallets.isPending ? (
    <Skeleton kind="summary" />
  ) : wallets.isError ? (
    <ErrorState error={wallets.error} retry={() => void wallets.refetch()} />
  ) : (
    <CheckoutForm key={user.id} user={user} wallets={wallets.data} />
  );
}
