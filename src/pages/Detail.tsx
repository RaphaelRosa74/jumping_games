import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart, ShoppingCart, ZoomIn, Share2 } from "lucide-react";
import { api, errorMessage, http, notify } from "../lib/api";
import { invalidateCart, queryClient, useSession } from "../lib/query";
import { money } from "../lib/money";
import type { Edition } from "../lib/types";
import {
  Breadcrumb,
  ErrorState,
  NFTCard,
  Quantity,
  Skeleton,
} from "../components/shared";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
export default function DetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const user = useSession().data?.user;
  const [edition, setEdition] = useState<Edition>("1/50"),
    [quantity, setQuantity] = useState(1),
    [zoom, setZoom] = useState(false),
    [tab, setTab] = useState("details");
  const nft = useQuery({
    queryKey: ["nft", id],
    queryFn: ({ signal }) => api.nft(id, signal),
  });
  const related = useQuery({
    queryKey: ["nfts", "related"],
    queryFn: ({ signal }) =>
      api.catalog(
        {
          q: "",
          category: "",
          network: "",
          sort: "recent",
          page: 1,
          min: "",
          max: "",
          tab: "all",
        },
        signal,
      ),
  });
  const fav = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: api.favorites,
    enabled: !!user,
  });
  const favorite = !!fav.data?.includes(id);
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      await http.request({
        method: favorite ? "DELETE" : "POST",
        url: "/favorites",
        data: { nftId: id },
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["favorites", user?.id] });
      const previous = queryClient.getQueryData<string[]>([
        "favorites",
        user?.id,
      ]);
      queryClient.setQueryData<string[]>(["favorites", user?.id], (old) =>
        favorite ? (old || []).filter((x) => x !== id) : [...(old || []), id],
      );
      return { previous };
    },
    onError: (error, _v, context) => {
      queryClient.setQueryData(["favorites", user?.id], context?.previous);
      notify(errorMessage(error));
    },
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });
  const add = useMutation({
    mutationFn: async (buy: boolean) => {
      await http.post("/cart", { nftId: id, edition, quantity });
      return buy;
    },
    onSuccess: async (buy) => {
      await invalidateCart();
      notify("NFT adicionado ao carrinho.");
      if (buy) void navigate({ to: "/carrinho" });
    },
    onError: (e) => notify(errorMessage(e)),
  });
  if (nft.isPending) return <Skeleton kind="detail" />;
  if (nft.isError)
    return <ErrorState error={nft.error} retry={() => void nft.refetch()} />;
  const n = nft.data,
    max = n.editions[edition];
  return (
    <>
      <Breadcrumb title="Mercado / Detalhes do NFT" />
      <section className="detail-layout">
        <div className="gallery">
          <div className="thumbnails">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => setZoom(true)}
                aria-label={`Ampliar imagem ${i + 1}`}
              >
                <img src={n.image} alt="" width="100" height="100" />
              </button>
            ))}
          </div>
          <button
            className="gallery-main"
            onClick={() => setZoom(true)}
            aria-label="Ampliar NFT"
          >
            <img
              src={n.image}
              alt={n.name}
              width="600"
              height="600"
              fetchPriority="high"
            />
            <ZoomIn size={24} />
          </button>
        </div>
        <div className="detail-info">
          <h1>{n.name}</h1>
          <div className="detail-price">
            <strong className="price">{money(n.price)}</strong>
            <span>
              ★ 4.8 <span className="muted">(19 avaliações)</span>
            </span>
          </div>
          <h2>Sobre este NFT:</h2>
          <p className="muted">
            Um colecionável digital finalizado à mão da coleção Kurio Editions,
            verificado na {n.network}, com arte desbloqueável e acesso para
            colecionadores.
          </p>
          <fieldset>
            <legend>Edição:</legend>
            <div className="editions">
              {(Object.keys(n.editions) as Edition[]).map((e) => (
                <button
                  key={e}
                  aria-pressed={edition === e}
                  aria-label={`Edição ${e}${n.editions[e] === 0 ? " indisponível" : ""}`}
                  disabled={n.editions[e] === 0}
                  onClick={() => {
                    setEdition(e);
                    setQuantity(1);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="muted stock">{max} unidades disponíveis nesta edição</p>
          <div className="buy-actions">
            <Quantity value={quantity} max={max} onChange={setQuantity} />
            <Button
              onClick={() => add.mutate(true)}
              disabled={add.isPending || max < quantity}
            >
              Comprar NFT
            </Button>
            <Button
              variant="outline"
              aria-label="Adicionar ao carrinho"
              disabled={add.isPending || max < quantity}
              onClick={() => add.mutate(false)}
            >
              <ShoppingCart size={18} />
            </Button>
          </div>
          <Button
            variant="outline"
            className="favorite-button"
            aria-pressed={favorite}
            disabled={favoriteMutation.isPending}
            onClick={() =>
              user
                ? favoriteMutation.mutate()
                : void navigate({
                    to: "/login",
                    search: { returnTo: location.pathname },
                  })
            }
          >
            <Heart size={18} fill={favorite ? "currentColor" : "none"} />
            {favorite ? "Favoritado" : "Favoritar"}
          </Button>
          <div className="detail-meta">
            <p>ID do token: {n.id}</p>
            <p>Coleção: Kurio Apes</p>
            <p>Atributos: {n.attributes.join(", ")}</p>
          </div>
          <button
            className="text-link"
            onClick={() =>
              void navigator.clipboard.writeText(location.href).then(
                () => notify("Link copiado."),
                () =>
                  notify("Copie o endereço desta página para compartilhar."),
              )
            }
          >
            <Share2 size={16} /> Compartilhar este NFT
          </button>
        </div>
      </section>
      <section className="nft-description">
        <div className="tabs">
          <button
            className={tab === "details" ? "active" : ""}
            onClick={() => setTab("details")}
          >
            Detalhes do NFT
          </button>
          <button
            className={tab === "reviews" ? "active" : ""}
            onClick={() => setTab("reviews")}
          >
            Avaliações de colecionadores (19)
          </button>
        </div>
        {tab === "details" ? (
          <>
            <p>
              {n.name} é uma obra digital da coleção Kurio Editions. A obra
              explora identidade, movimento e luz em um mundo digital sem
              fronteiras.
            </p>
            <p>
              A propriedade inclui a arte em alta resolução e acesso à
              comunidade. Esta é uma demonstração: nenhum ativo é cunhado ou
              transferido.
            </p>
            <h3>Rede:</h3>
            <p>{n.network} · Dados de procedência simulados.</p>
            <h3>Direitos autorais:</h3>
            <p>
              5% de royalties ilustrativos. Não há contrato real neste ambiente.
            </p>
          </>
        ) : (
          <p>
            “Uma coleção cheia de personalidade.” — Nova, avaliação
            demonstrativa. As 19 avaliações do layout são ilustrativas;
            publicação de avaliações não está disponível.
          </p>
        )}
      </section>
      <section className="related">
        <h2>Mais desta coleção</h2>
        <div>
          {related.data?.items
            .filter((x) => x.id !== id)
            .slice(0, 5)
            .map((x) => (
              <NFTCard key={x.id} nft={x} />
            ))}
        </div>
      </section>
      <Dialog open={zoom} onOpenChange={setZoom} title={n.name}>
        <img className="zoom-image" src={n.image} alt={n.name} />
      </Dialog>
    </>
  );
}
