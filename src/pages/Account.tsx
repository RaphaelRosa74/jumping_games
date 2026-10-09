import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, fieldErrors, http, notify } from "../lib/api";
import { queryClient, useScope } from "../lib/query";
import { passwordSchema, profileSchema, walletSchema } from "../lib/validation";
import type { User, Wallet } from "../lib/types";
import { Button } from "../components/ui/button";
import {
  Empty,
  ErrorState,
  Field,
  NFTCard,
  Select,
  Skeleton,
} from "../components/shared";
import { money } from "../lib/money";
export function AccountNav() {
  return (
    <aside className="account-nav">
      <h2>Meu perfil</h2>
      <Link to="/perfil">Perfil do colecionador</Link>
      <Link to="/carteiras">Carteiras</Link>
      <Link to="/favoritos">Lista de interesse</Link>
      <Link to="/pedidos">Meus pedidos</Link>
      <p className="muted small">Sua coleção começa com uma história.</p>
    </aside>
  );
}
function ProfileForm({ user }: { user: User }) {
  const [avatar, setAvatar] = useState(user.avatar),
    [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: async (values: unknown) =>
      (await http.patch<User>("/profile", values)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", user.id], data);
      void queryClient.invalidateQueries({ queryKey: ["session"] });
      notify("Perfil atualizado.");
    },
    onError: (e) => setErrors(fieldErrors(e)),
  });
  const password = useMutation({
    mutationFn: async (values: unknown) => {
      await http.post("/profile/password", values);
    },
    onSuccess: () =>
      notify("Senha alterada. As outras sessões foram encerradas."),
    onError: (e) => setErrors(fieldErrors(e)),
  });
  return (
    <>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const values = {
            ...Object.fromEntries(new FormData(e.currentTarget)),
            avatar,
          };
          const result = profileSchema.safeParse(values);
          if (!result.success) {
            setErrors(
              Object.fromEntries(
                result.error.issues.map((i) => [String(i.path[0]), i.message]),
              ),
            );
            return;
          }
          setErrors({});
          mutation.mutate(result.data);
        }}
      >
        <h1>Perfil do colecionador</h1>
        <div className="form-grid">
          <Field
            label="Nome de exibição"
            name="name"
            defaultValue={user.name}
            error={errors.name}
            required
          />
          <Field
            label="Nome de usuário"
            name="username"
            defaultValue={user.username}
            error={errors.username}
            required
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            defaultValue={user.email}
            error={errors.email}
            required
          />
          <div className="field">
            <label htmlFor="bio">Biografia</label>
            <textarea
              id="bio"
              name="bio"
              maxLength={300}
              defaultValue={user.bio}
            />
          </div>
        </div>
        <div className="avatar-edit">
          {avatar && (
            <img src={avatar} width="72" height="72" alt="Seu avatar" />
          )}
          <div>
            <label htmlFor="avatar">
              Avatar (PNG, JPEG ou WebP, até 200 KB)
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (
                  f.size > 200000 ||
                  !["image/png", "image/jpeg", "image/webp"].includes(f.type)
                ) {
                  setErrors({
                    ...errors,
                    avatar: "Use PNG, JPEG ou WebP de até 200 KB.",
                  });
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setAvatar(String(reader.result));
                  setErrors({ ...errors, avatar: "" });
                };
                reader.readAsDataURL(f);
              }}
            />
            {errors.avatar && (
              <p role="alert" className="field-error">
                {errors.avatar}
              </p>
            )}
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => setAvatar("")}
          >
            Remover
          </button>
        </div>
        {mutation.isError && <ErrorState error={mutation.error} />}
        <Button type="submit" disabled={mutation.isPending}>
          Salvar perfil
        </Button>
      </form>
      <form
        className="password-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const result = passwordSchema.safeParse(
            Object.fromEntries(new FormData(form)),
          );
          if (!result.success) {
            setErrors(
              Object.fromEntries(
                result.error.issues.map((i) => [String(i.path[0]), i.message]),
              ),
            );
            return;
          }
          setErrors({});
          password.mutate(result.data, { onSuccess: () => form.reset() });
        }}
      >
        <h2>Alteração de senha</h2>
        <Field
          label="Senha atual"
          name="current"
          type="password"
          autoComplete="current-password"
          error={errors.current}
          required
        />
        <Field
          label="Nova senha"
          name="password"
          type="password"
          autoComplete="new-password"
          error={errors.password}
          required
        />
        <Field
          label="Confirmar nova senha"
          name="confirm"
          type="password"
          autoComplete="new-password"
          error={errors.confirm}
          required
        />
        {password.isError && <ErrorState error={password.error} />}
        <Button type="submit" disabled={password.isPending}>
          Alterar senha
        </Button>
      </form>
    </>
  );
}
export function ProfilePage() {
  const scope = useScope(),
    q = useQuery({ queryKey: ["profile", scope], queryFn: api.profile });
  return (
    <div className="account-layout">
      <AccountNav />
      <section>
        {q.isPending ? (
          <Skeleton kind="summary" />
        ) : q.isError ? (
          <ErrorState error={q.error} retry={() => void q.refetch()} />
        ) : (
          <ProfileForm key={q.data.id} user={q.data} />
        )}
      </section>
    </div>
  );
}
function WalletForm({ wallet, index }: { wallet?: Wallet; index: number }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: async (values: unknown) => {
      await http.request({
        method: wallet ? "PATCH" : "POST",
        url: "/wallets" + (wallet ? "/" + wallet.id : ""),
        data: values,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wallets"] });
      notify("Carteira salva.");
    },
    onError: (e) => setErrors(fieldErrors(e)),
  });
  return (
    <form
      className="wallet-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const raw = Object.fromEntries(new FormData(e.currentTarget));
        const result = walletSchema.safeParse({
          ...raw,
          primary: raw.primary === "on",
        });
        if (!result.success) {
          setErrors(
            Object.fromEntries(
              result.error.issues.map((i) => [String(i.path[0]), i.message]),
            ),
          );
          return;
        }
        setErrors({});
        mutation.mutate(result.data);
      }}
    >
      <h2>Carteira {index === 0 ? "principal" : "secundária"}</h2>
      <p className="muted">Endereço usado para receber os NFTs na simulação.</p>
      <div className="form-grid">
        <Field
          label="Nome da carteira"
          id={`label-${index}`}
          name="label"
          defaultValue={wallet?.label || ""}
          error={errors.label}
          required
        />
        <Select
          label="Rede"
          id={`network-${index}`}
          name="network"
          defaultValue={wallet?.network || "Ethereum"}
        >
          <option>Ethereum</option>
          <option>Polygon</option>
          <option>Solana</option>
        </Select>
        <Field
          label="Endereço da carteira"
          id={`address-${index}`}
          name="address"
          defaultValue={wallet?.address || ""}
          placeholder="0x… ou nome.eth"
          error={errors.address}
          required
        />
        <Select
          label="Tipo de carteira"
          id={`provider-${index}`}
          name="provider"
          defaultValue={wallet?.provider || "MetaMask"}
        >
          <option>MetaMask</option>
          <option>WalletConnect</option>
          <option>Coinbase Wallet</option>
        </Select>
      </div>
      <label className="check-label">
        <input
          name="primary"
          type="checkbox"
          defaultChecked={wallet?.primary ?? index === 0}
        />{" "}
        Usar como carteira principal
      </label>
      {mutation.isError && <ErrorState error={mutation.error} />}
      <Button type="submit" disabled={mutation.isPending}>
        {wallet ? "Salvar carteira" : "Cadastrar carteira"}
      </Button>
    </form>
  );
}
export function WalletsPage() {
  const scope = useScope(),
    q = useQuery({ queryKey: ["wallets", scope], queryFn: api.wallets });
  return (
    <div className="account-layout">
      <AccountNav />
      <section>
        <h1>Minhas carteiras</h1>
        {q.isPending ? (
          <Skeleton kind="summary" />
        ) : q.isError ? (
          <ErrorState error={q.error} retry={() => void q.refetch()} />
        ) : (
          <>
            {q.data.map((w, i) => (
              <WalletForm key={w.id + String(w.primary)} wallet={w} index={i} />
            ))}
            {q.data.length < 2 && (
              <WalletForm key={"new" + q.data.length} index={q.data.length} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
export function FavoritesPage() {
  const scope = useScope();
  const favorites = useQuery({
    queryKey: ["favorites", scope],
    queryFn: api.favorites,
  });
  return (
    <div className="account-layout">
      <AccountNav />
      <section>
        <h1>Lista de interesse</h1>
        {favorites.isPending ? (
          <Skeleton />
        ) : favorites.isError ? (
          <ErrorState error={favorites.error} />
        ) : !favorites.data.length ? (
          <Empty title="Seus favoritos aparecerão aqui" />
        ) : (
          <div className="nft-grid">
            {favorites.data.map((id) => (
              <FavoriteItem key={id} id={id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
function FavoriteItem({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["nft", id],
    queryFn: ({ signal }) => api.nft(id, signal),
  });
  return q.data ? <NFTCard nft={q.data} /> : null;
}
export function OrdersPage() {
  const scope = useScope(),
    q = useQuery({ queryKey: ["orders", scope], queryFn: api.orders });
  return (
    <div className="account-layout">
      <AccountNav />
      <section>
        <h1>Meus pedidos</h1>
        {q.isPending ? (
          <Skeleton kind="summary" />
        ) : q.isError ? (
          <ErrorState error={q.error} />
        ) : !q.data.length ? (
          <Empty title="Você ainda não tem pedidos" />
        ) : (
          q.data.map((o) => (
            <Link
              className="order-list-item"
              key={o.id}
              to="/pedido/$id"
              params={{ id: o.id }}
            >
              <span>Pedido {o.id.slice(0, 8)}</span>
              <span>
                {o.status === "confirmed"
                  ? "Confirmado"
                  : o.status === "declined"
                    ? "Recusado"
                    : "Pendente"}
              </span>
              <strong className="price">{money(o.quote.total)}</strong>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
