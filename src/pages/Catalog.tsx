import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Empty, ErrorState, NFTCard, Skeleton } from "../components/shared";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { api, notify } from "../lib/api";
import type { CatalogSearch } from "../lib/types";
const categories = [
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
export default function CatalogPage() {
  const search = useSearch({ strict: false }) as CatalogSearch;
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const update = (patch: Partial<CatalogSearch>) =>
    void navigate({
      to: "/",
      search: { ...search, ...patch, page: patch.page ?? 1 },
    });
  const query = useQuery({
    queryKey: ["nfts", search],
    queryFn: ({ signal }) => api.catalog(search, signal),
  });
  const filters = (
    <>
      <h2>Coleções</h2>
      <div className="filter-options">
        {categories.map((c, i) => (
          <button
            key={c}
            aria-pressed={search.category === c}
            onClick={() => update({ category: search.category === c ? "" : c })}
          >
            {c}
            <span>({i === 0 ? 12 : 3})</span>
          </button>
        ))}
      </div>
      <h2>Faixa de preço</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const min = String(f.get("min") || ""),
            max = String(f.get("max") || "");
          if (
            (min && !/^\d+(\.\d{1,18})?$/.test(min)) ||
            (max && !/^\d+(\.\d{1,18})?$/.test(max))
          ) {
            notify("Use valores decimais positivos.");
            return;
          }
          update({ min, max });
        }}
        key={`${search.min}-${search.max}`}
      >
        <div className="price-inputs">
          <label>
            Mínimo
            <input
              name="min"
              inputMode="decimal"
              defaultValue={search.min}
              placeholder="0.00"
              aria-label="Preço mínimo"
            />
          </label>
          <label>
            Máximo
            <input
              name="max"
              inputMode="decimal"
              defaultValue={search.max}
              placeholder="12.30"
              aria-label="Preço máximo"
            />
          </label>
        </div>
        <Button size="sm" type="submit">
          Aplicar
        </Button>
      </form>
      <h2>Rede</h2>
      <div className="filter-options">
        {["Ethereum", "Polygon", "Solana"].map((n) => (
          <button
            aria-pressed={search.network === n}
            key={n}
            onClick={() => update({ network: search.network === n ? "" : n })}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        className="text-link"
        onClick={() =>
          update({
            q: "",
            category: "",
            network: "",
            min: "",
            max: "",
            tab: "all",
            sort: "recent",
          })
        }
      >
        Limpar filtros
      </button>
    </>
  );
  return (
    <>
      <div className="mobile-search">
        <Search size={19} />
        <input
          value={search.q}
          onChange={(e) => update({ q: e.target.value })}
          aria-label="Buscar NFTs"
          placeholder="Explorar coleções"
        />
        <Button
          size="icon"
          aria-label="Abrir filtros"
          onClick={() => setDrawer(true)}
        >
          <SlidersHorizontal size={20} />
        </Button>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Bem-vindo à Kurio</p>
          <h1>
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </h1>
          <p className="muted">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara e tenha uma parte da cultura da
            internet.
          </p>
          <Button asChild>
            <a href="#catalogo">
              EXPLORAR <ArrowRight size={16} />
            </a>
          </Button>
          <div className="hero-dots" aria-hidden="true">
            ● ● ●
          </div>
        </div>
        <img
          className="hero-art"
          src="/assets/emerald.webp"
          width="600"
          height="540"
          alt="Emerald Ape de jaqueta verde e óculos dourados"
          fetchPriority="high"
        />
      </section>
      <section
        id="catalogo"
        className="catalog-layout"
        aria-label="Catálogo de NFTs"
      >
        <h2 className="sr-only">Catálogo de NFTs</h2>
        <aside>
          <div className="filters">{filters}</div>
          <div className="spotlight">
            <strong>NFT EM DESTAQUE</strong>
            <p>OFERTA LIMITADA</p>
            <img
              src="/assets/sage.webp"
              alt="Sage Nomad em destaque"
              width="450"
              height="450"
              loading="lazy"
            />
          </div>
        </aside>
        <div className="catalog-main">
          <div className="catalog-toolbar">
            <div className="tabs" aria-label="Seleção de NFTs">
              {(
                [
                  ["all", "Todos os NFTs"],
                  ["new", "Novos lançamentos"],
                  ["trending", "Em alta"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={search.tab === value}
                  className={search.tab === value ? "active" : ""}
                  onClick={() => update({ tab: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="sort">
              Ordenar por:
              <select
                aria-label="Ordenar NFTs"
                value={search.sort}
                onChange={(e) =>
                  update({ sort: e.target.value as CatalogSearch["sort"] })
                }
              >
                <option value="recent">Listados recentemente</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
          </div>
          <form className="desktop-search" onSubmit={(e) => e.preventDefault()}>
            <Search size={18} />
            <input
              aria-label="Buscar NFTs"
              placeholder="Buscar no catálogo…"
              value={search.q}
              onChange={(e) => update({ q: e.target.value })}
            />
          </form>
          {query.isPending ? (
            <Skeleton />
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : query.data.items.length === 0 ? (
            <Empty title="Nenhum NFT encontrado">
              <p>Tente outra busca ou limpe os filtros.</p>
              <Button
                onClick={() =>
                  update({
                    q: "",
                    category: "",
                    network: "",
                    min: "",
                    max: "",
                    tab: "all",
                  })
                }
              >
                Limpar filtros
              </Button>
            </Empty>
          ) : (
            <>
              <p className="result-count" role="status">
                {query.data.total} NFTs encontrados
                {query.isFetching ? " · Atualizando…" : ""}
              </p>
              <div className="nft-grid">
                {query.data.items.map((n, index) => (
                  <NFTCard key={n.id} nft={n} priority={index < 2} />
                ))}
              </div>
              <nav className="pagination" aria-label="Paginação">
                {Array.from({ length: query.data.pages }, (_, i) => (
                  <button
                    key={i}
                    aria-current={search.page === i + 1 ? "page" : undefined}
                    onClick={() => update({ page: i + 1 })}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            </>
          )}
        </div>
      </section>
      <section className="promos">
        <div>
          <img
            src="/assets/emerald.webp"
            alt=""
            loading="lazy"
            width="450"
            height="450"
          />
          <div>
            <h2>Lançamentos gênesis de edição limitada</h2>
            <p>Colecione edições especiais. Descubra sua próxima história.</p>
            <a href="#catalogo" className="text-link">
              Explorar →
            </a>
          </div>
        </div>
        <div>
          <img
            src="/assets/ivory.webp"
            alt=""
            loading="lazy"
            width="450"
            height="450"
          />
          <div>
            <h2>Arte digital selecionada e muito mais</h2>
            <p>Novos artistas, coleções verificadas e cultura digital.</p>
            <a href="#catalogo" className="text-link">
              Explorar →
            </a>
          </div>
        </div>
      </section>
      <section className="journal">
        <h2>Diário da Cunhagem</h2>
        <p className="muted">
          Histórias, guias e insights para colecionadores.
        </p>
        <div>
          {[
            "Como funciona a propriedade de NFTs",
            "10 artistas digitais para acompanhar",
            "Raridade, atributos e procedência",
            "Como proteger sua carteira",
          ].map((t, i) => (
            <article key={t}>
              <img
                src={`/assets/${["ivory", "emerald", "sage", "golden"][i]}.webp`}
                width="450"
                height="450"
                loading="lazy"
                alt=""
              />
              <div>
                <small>Curadoria Kurio</small>
                <h3>{t}</h3>
                <p className="muted">Conteúdo editorial em breve.</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Dialog
        open={drawer}
        onOpenChange={setDrawer}
        title="Filtros do catálogo"
      >
        <div className="filters drawer-filters">{filters}</div>
        <Button className="w-full" onClick={() => setDrawer(false)}>
          Ver resultados
        </Button>
      </Dialog>
    </>
  );
}
