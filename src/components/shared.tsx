import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { errorMessage } from "../lib/api";
import { money } from "../lib/money";
import type { NFT, Quote } from "../lib/types";
export function Field({
  label,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const fieldId = id || props.name;
  return (
    <div className="field">
      <label htmlFor={fieldId}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        {...props}
        id={fieldId}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? fieldId + "-error" : undefined}
      />
      {error && (
        <p id={fieldId + "-error"} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function Select({
  label,
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} {...props}>
        {children}
      </select>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <p>{errorMessage(error)}</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function Skeleton({
  kind = "catalog",
}: {
  kind?: "catalog" | "detail" | "summary";
}) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={
        kind === "catalog"
          ? "nft-grid"
          : kind === "detail"
            ? "detail-skeleton"
            : "summary-skeleton"
      }
    >
      <span className="sr-only">Carregando conteúdo…</span>
      {Array.from(
        { length: kind === "catalog" ? 9 : kind === "detail" ? 2 : 4 },
        (_, i) => (
          <div key={i} className="skeleton">
            <div />
          </div>
        ),
      )}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {children || (
        <p className="muted">Explore a coleção e encontre sua próxima peça.</p>
      )}
    </div>
  );
}
export function NFTCard({
  nft,
  priority = false,
}: {
  nft: NFT;
  priority?: boolean;
}) {
  return (
    <article className="nft-card">
      <Link to="/nft/$id" params={{ id: nft.id }}>
        <div className="nft-image">
          <img
            src={nft.image}
            width="450"
            height="450"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            alt={nft.name}
          />
          {nft.featured && <span className="rarity">RARO</span>}
        </div>
        <h3>{nft.name}</h3>
        <p className="price">{money(nft.price)}</p>
      </Link>
    </article>
  );
}
export function Totals({ quote }: { quote: Quote }) {
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{money(quote.subtotal)}</dd>
      </div>
      <div>
        <dt>Desconto do lançamento</dt>
        <dd>− {money(quote.discount)}</dd>
      </div>
      <div>
        <dt>Taxa de rede</dt>
        <dd>{money(quote.fee)}</dd>
      </div>
      <div className="total">
        <dt>Total</dt>
        <dd data-testid="total">{money(quote.total)}</dd>
      </div>
    </dl>
  );
}
export function Quantity({
  value,
  max,
  onChange,
  disabled = false,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
      >
        −
      </button>
      <span aria-label={`Quantidade: ${value}`}>{value}</span>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
      >
        +
      </button>
    </div>
  );
}
export function Breadcrumb({ title }: { title: string }) {
  return (
    <nav aria-label="Localização" className="breadcrumb">
      <Link to="/">Início</Link>
      <span>/</span>
      <span>{title}</span>
    </nav>
  );
}
