import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Heart,
  Home,
  LogIn,
  ShoppingCart,
  SlidersHorizontal,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage, http, notify, TOKEN_KEY } from "../lib/api";
import { queryClient, useCart, useSession } from "../lib/query";
import { useRealtime } from "../lib/realtime";
import { logout } from "../lib/session";
import type { MockConfig, Scenario } from "../lib/types";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
export function Layout() {
  const location = useLocation(),
    navigate = useNavigate(),
    session = useSession(),
    cart = useCart();
  const connected = useRealtime(session.data?.user?.id);
  const [notice, setNotice] = useState("");
  const auth = ["/login", "/cadastro"].includes(location.pathname);

  useEffect(() => {
    const onNotice = (e: Event) => setNotice((e as CustomEvent<string>).detail);
    const expire = () => {
      void queryClient.cancelQueries();
      queryClient.clear();
      notify("Sua sessão expirou. Entre novamente para retomar.");
      if (
        ["/pagamento", "/perfil", "/carteiras", "/favoritos", "/pedidos"].some(
          (p) => window.location.pathname.startsWith(p),
        ) ||
        window.location.pathname.startsWith("/pedido/")
      )
        void navigate({
          to: "/login",
          search: {
            returnTo: window.location.pathname + window.location.search,
          },
        });
    };
    const out = () =>
      void navigate({ to: "/login", search: { returnTo: "/" } });
    const storage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        void queryClient.cancelQueries();
        queryClient.clear();
        void navigate({ to: "/login", search: { returnTo: "/" } });
      }
    };
    window.addEventListener("notice", onNotice);
    window.addEventListener("session-expired", expire);
    window.addEventListener("signed-out", out);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("notice", onNotice);
      window.removeEventListener("session-expired", expire);
      window.removeEventListener("signed-out", out);
      window.removeEventListener("storage", storage);
    };
  }, [navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const titles: Record<string, string> = {
      "/": "Marketplace de NFTs",
      "/login": "Entrar",
      "/cadastro": "Criar conta",
      "/carrinho": "Carrinho de NFTs",
      "/pagamento": "Pagamento",
      "/perfil": "Perfil do colecionador",
      "/carteiras": "Carteiras",
    };
    document.title = `${titles[location.pathname] || "Coleção digital"} | Kurio`;
  }, [location.pathname]);

  const count = cart.data?.items.reduce((sum, i) => sum + i.quantity, 0) || 0;

  useEffect(() => {
    setTimeout(() => {
      setNotice("")
    }, 3000)
  }, [notice]);

  return (
    <div className={auth ? "app auth-layout" : "app"}>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <Link to="/" className="logo" aria-label="Kurio início">
          KURIO
        </Link>
        <nav aria-label="Navegação principal">
          <Link
            to="/"
            activeProps={{ className: "active" }}
            activeOptions={{ exact: true }}
          >
            Início
          </Link>
          <Link to="/" search={{ tab: "all" }} hash="catalogo">
            Mercado
          </Link>
          <button
            onClick={() =>
              notify(
                "Perfis de criadores estão fora do escopo desta demonstração.",
              )
            }
          >
            Criadores
          </button>
          <button
            onClick={() =>
              notify(
                "Conteúdos educativos estarão disponíveis em uma próxima versão.",
              )
            }
          >
            Aprenda
          </button>
        </nav>
        <div className="header-actions">
          <Link
            to="/carrinho"
            className="cart-link"
            aria-label={`Carrinho, ${count} itens`}
          >
            <ShoppingCart size={22} />
            <span>{count}</span>
          </Link>
          {session.data?.user ? (
            <>
              <Link
                to="/perfil"
                className="profile-link"
                aria-label="Meu perfil"
              >
                <UserRound size={20} />
                <span>{session.data.user.username}</span>
              </Link>
              <button className="text-link" onClick={() => void logout()}>
                Sair
              </button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/login" search={{ returnTo: location.pathname }}>
                <LogIn size={17} /> Entrar
              </Link>
            </Button>
          )}
        </div>
      </header>
      <div className="connection-badge" role="status">
        {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
        <span>
          {connected ? "Tempo real conectado" : "Reconectando tempo real…"}
        </span>
        <span>· Ambiente simulado</span>
      </div>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      {!auth && <Footer />}
      {!auth && (
        <nav className="mobile-nav" aria-label="Navegação mobile">
          <Link to="/" aria-label="Início">
            <Home size={21} />
          </Link>
          <Link to="/favoritos" aria-label="Favoritos">
            <Heart size={21} />
          </Link>
          <Link to="/carrinho" aria-label={`Carrinho mobile, ${count} itens`}>
            <ShoppingCart size={21} />
            {count > 0 && <span>{count}</span>}
          </Link>
          <Link to="/perfil" aria-label="Perfil">
            <UserRound size={21} />
          </Link>
        </nav>
      )}
      <div
        className={notice ? "notice visible" : "notice"}
        role="status"
        aria-live="polite"
      >
        {notice && (
          <>
            <span>{notice}</span>
            <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
              ×
            </button>
          </>
        )}
      </div>
      {import.meta.env.VITE_ENABLE_MOCKS === "true" && <DemoPanel />}
    </div>
  );
}
function Footer() {
  return (
    <footer>
      <section className="footer-benefits">
        {[
          [
            "W",
            "Segurança da carteira",
            "Proteja sua carteira e colecione arte digital com confiança.",
          ],
          [
            "C",
            "Criadores em destaque",
            "Conheça artistas, estúdios e comunidades que moldam a cultura digital.",
          ],
          [
            "D",
            "Alertas de lançamentos",
            "Explore novidades, coleções e histórias de criadores.",
          ],
        ].map(([letter, title, desc]) => (
          <div key={letter}>
            <span className="benefit-icon">{letter}</span>
            <h2>{title}</h2>
            <p>{desc}</p>
          </div>
        ))}
        <div>
          <h2>Antecipe-se ao próximo lançamento</h2>
          <p>Receba lançamentos selecionados e novidades da comunidade.</p>
          <p className="footer-unavailable">
            Newsletter indisponível nesta demonstração.
          </p>
        </div>
      </section>
      <div className="footer-strip">
        <strong>KURIO</strong>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <span>Demonstração frontend</span>
        <span>Sem transações reais</span>
      </div>
      <div className="footer-links">
        <div>
          <h2>Meu perfil</h2>
          <Link to="/perfil">Meu perfil</Link>
          <Link to="/pedidos">Meus pedidos</Link>
          <Link to="/favoritos">Lista de interesse</Link>
        </div>
        <div>
          <h2>Central de ajuda</h2>
          <p>Compras e carteiras simuladas.</p>
          <p>Use o painel de demonstração para explorar os cenários.</p>
        </div>
        <div>
          <h2>Coleções</h2>
          {["Arte digital", "Fotografia", "Música", "Arte 3D"].map(
            (category) => (
              <Link to="/" key={category} search={{ category }}>
                {category}
              </Link>
            ),
          )}
        </div>
        <div>
          <h2>Carteiras compatíveis</h2>
          <p className="wallet-brands">METAMASK · WALLETCONNECT · COINBASE</p>
          <Link to="/carteiras">Gerenciar carteiras →</Link>
        </div>
      </div>
      <p className="copyright">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  );
}
const scenarios: [Scenario, string][] = [
  ["success", "Sucesso"],
  ["empty", "Catálogo vazio"],
  ["slow", "Carregamento lento"],
  ["out-of-order", "Respostas fora de ordem"],
  ["offline", "Falha de conexão REST"],
  ["server-error", "Erro HTTP 503"],
  ["unauthorized", "Acesso não autorizado"],
  ["expired", "Sessão expirada"],
  ["validation", "Erro de formulário"],
  ["favorite-error", "Falha em favoritos"],
  ["price-change", "Preço alterado ao comprar"],
  ["sold-out", "Edição esgotada ao comprar"],
  ["order-timeout", "Timeout após criar pedido"],
  ["payment-declined", "Pagamento recusado"],
  ["pending", "Pedido permanece pendente"],
];
function DemoPanel() {
  const [open, setOpen] = useState(false),
    [scenario, setScenario] = useState<Scenario>("success");
  const config = useQuery({
    queryKey: ["mock-config"],
    queryFn: async () => (await http.get<MockConfig>("/__mock/config")).data,
    enabled: open,
  });
  const action = async (type: string) => {
    try {
      await http.post("/__mock/control", { type });
      notify("Cenário disparado: " + type);
      if (type === "expire")
        void queryClient.invalidateQueries({ queryKey: ["session"] });
    } catch (e) {
      notify(errorMessage(e));
    }
  };
  return (
    <>
      <button
        className="demo-trigger"
        aria-label="Abrir painel de demonstração"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal size={15} />
        <span>Demo</span>
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Painel da demonstração"
        description="Cenários reproduzíveis de rede, sessão e compra. As mudanças de dados passam pela API e pelos eventos Socket.IO."
      >
        <p className="small mt-4">Ativo: {config.data?.scenario || "…"}</p>
        <label className="field mt-4">
          Cenário
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as Scenario)}
          >
            {scenarios.map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button
          onClick={() =>
            void http.post("/__mock/config", { scenario }).then(() => {
              void queryClient.invalidateQueries();
              setOpen(false);
              notify("Cenário selecionado: " + scenario);
            })
          }
        >
          Aplicar cenário
        </Button>
        <div className="demo-actions">
          {[
            ["price", "Alterar preço (+0.1 ETH)"],
            ["sold-out", "Esgotar edição 1/50"],
            ["duplicate", "Repetir evento"],
            ["old", "Enviar evento antigo"],
            ["disconnect", "Interromper socket"],
            ["settle", "Finalizar pedidos pendentes"],
            ["expire", "Expirar sessão"],
          ].map(([type, label]) => (
            <Button
              variant="outline"
              key={type}
              onClick={() => void action(type)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Button
          variant="destructive"
          onClick={() =>
            void http.post("/__mock/reset").then(() => {
              for (const key of Object.keys(localStorage))
                if (key.startsWith("kurio:") && !key.includes("database"))
                  localStorage.removeItem(key);
              window.location.assign("/");
            })
          }
        >
          Restaurar dados da demonstração
        </Button>
      </Dialog>
    </>
  );
}
