import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { Layout } from "./components/Layout";
import CatalogPage from "./pages/Catalog";
import DetailPage from "./pages/Detail";
import { ErrorState } from "./components/shared";
import { api } from "./lib/api";
import { queryClient, sessionOptions } from "./lib/query";
import type { CatalogSearch } from "./lib/types";
import { safeReturn } from "./lib/navigation";
const root = createRootRoute({
  component: Layout,
  notFoundComponent: () => (
    <section className="empty-state">
      <h1>Página não encontrada</h1>
      <p>Este endereço não faz parte da coleção.</p>
      <a className="text-link" href="/">
        Voltar ao início
      </a>
    </section>
  ),
  errorComponent: ({ error, reset }) => (
    <ErrorState error={error} retry={reset} />
  ),
});
export const defaults: CatalogSearch = {
  q: "",
  category: "",
  network: "",
  sort: "recent",
  page: 1,
  min: "",
  max: "",
  tab: "all",
};
const catalog = createRoute({
  getParentRoute: () => root,
  path: "/",
  validateSearch: (
    s: SearchSchemaInput & Partial<CatalogSearch>,
  ): CatalogSearch => ({
    ...defaults,
    q: typeof s.q === "string" ? s.q : "",
    category: typeof s.category === "string" ? s.category : "",
    network: typeof s.network === "string" ? s.network : "",
    sort: s.sort === "price-asc" || s.sort === "price-desc" ? s.sort : "recent",
    page: Math.max(1, Math.floor(Number(s.page) || 1)),
    min:
      typeof s.min === "string" && /^\d+(\.\d{1,18})?$/.test(s.min)
        ? s.min
        : "",
    max:
      typeof s.max === "string" && /^\d+(\.\d{1,18})?$/.test(s.max)
        ? s.max
        : "",
    tab: s.tab === "new" || s.tab === "trending" ? s.tab : "all",
  }),
  component: CatalogPage,
});
const detail = createRoute({
  getParentRoute: () => root,
  path: "/nft/$id",
  component: DetailPage,
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/carrinho",
  component: lazyRouteComponent(() => import("./pages/Cart")),
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: (s: { returnTo?: string }) => ({
    returnTo: safeReturn(s.returnTo),
  }),
  component: lazyRouteComponent(() => import("./pages/Auth")),
});
const signup = createRoute({
  getParentRoute: () => root,
  path: "/cadastro",
  validateSearch: (s: { returnTo?: string }) => ({
    returnTo: safeReturn(s.returnTo),
  }),
  component: lazyRouteComponent(() => import("./pages/Auth"), "RegisterPage"),
});
async function protect({ location }: { location: { href: string } }) {
  let user;
  try {
    user = (
      await queryClient.fetchQuery({ ...sessionOptions, queryFn: api.session })
    ).user;
  } catch {
    user = null;
  }
  if (!user)
    throw redirect({ to: "/login", search: { returnTo: location.href } });
}
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/pagamento",
  beforeLoad: protect,
  component: lazyRouteComponent(() => import("./pages/Checkout")),
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/perfil",
  beforeLoad: protect,
  component: lazyRouteComponent(() => import("./pages/Account"), "ProfilePage"),
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/carteiras",
  beforeLoad: protect,
  component: lazyRouteComponent(() => import("./pages/Account"), "WalletsPage"),
});
const favorites = createRoute({
  getParentRoute: () => root,
  path: "/favoritos",
  beforeLoad: protect,
  component: lazyRouteComponent(
    () => import("./pages/Account"),
    "FavoritesPage",
  ),
});
const orders = createRoute({
  getParentRoute: () => root,
  path: "/pedidos",
  beforeLoad: protect,
  component: lazyRouteComponent(() => import("./pages/Account"), "OrdersPage"),
});
const order = createRoute({
  getParentRoute: () => root,
  path: "/pedido/$id",
  beforeLoad: protect,
  component: lazyRouteComponent(() => import("./pages/Order")),
});
export const router = createRouter({
  routeTree: root.addChildren([
    catalog,
    detail,
    cart,
    login,
    signup,
    checkout,
    profile,
    wallets,
    favorites,
    orders,
    order,
  ]),
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
