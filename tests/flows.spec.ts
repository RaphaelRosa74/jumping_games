import { test, expect } from "@playwright/test";
import {
  ready,
  config,
  control,
  login,
  closeNotice,
  add,
  checkout,
  review,
  orders,
} from "./helpers";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await config(page, "success");
});
test("busca, filtros combinados, ordenação, paginação e histórico", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  const search = page.getByRole("textbox", { name: "Buscar NFTs" });
  await search.fill("Sage");
  await expect(page.locator(".result-count")).toContainText("4 NFTs");
  await page.reload();
  await expect(search).toHaveValue("Sage");
  await search.fill("");
  if (mobile) await page.getByRole("button", { name: "Abrir filtros" }).click();
  const scope = mobile ? page.getByRole("dialog") : page.locator(".filters");
  await scope.getByRole("button", { name: "Arte digital" }).click();
  await scope.getByRole("button", { name: "Ethereum", exact: true }).click();
  if (mobile)
    await page.getByRole("button", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/network=Ethereum/);
  await page.getByLabel("Ordenar NFTs").selectOption("price-asc");
  await expect(page.locator(".nft-card").first()).toContainText(
    "Golden Signal",
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Paginação" })
    .getByRole("button", { name: "2", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});
test("acesso direto, NFT inexistente, edição esgotada e limite", async ({
  page,
}) => {
  await page.goto("/nft/emerald-042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edição 1/1 indisponível", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Edição 1/10", exact: true }).click();
  await page.getByLabel("Aumentar quantidade").click({ clickCount: 2 });
  await expect(page.getByLabel("Aumentar quantidade")).toBeDisabled();
  await page.goto("/nft/inexistente");
  await expect(page.getByRole("alert")).toContainText("NFT não encontrado");
});
test("cadastro, conflito e validação", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page.getByText("As senhas não coincidem.")).toHaveCount(0);
  await expect(page.locator("[aria-invalid=true]").first()).toBeVisible();
  await page.getByLabel("Nome de exibição").fill("Novo Usuário");
  await page.getByLabel("Nome de usuário").fill("novousuario");
  await page.getByLabel("E-mail", { exact: true }).fill("nova@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Password123!");
  await page.getByLabel("Confirmar senha").fill("Password123!");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("já cadastrado");
  await page.getByLabel("E-mail", { exact: true }).fill("novo@kurio.test");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await page.reload();
  await page.goto("/perfil");
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Novo Usuário");
});
test("favoritos otimistas, rollback, sessão e troca de usuário", async ({
  page,
}) => {
  await page.goto("/login?returnTo=/nft/emerald-042");
  await login(page);
  await closeNotice(page);
  await config(page, "favorite-error");
  await page.getByRole("button", { name: "Favoritar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Favoritar", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("status").filter({ hasText: "Não foi possível atualizar" }),
  ).toBeVisible();
  await config(page, "success");
  await closeNotice(page);
  await page.getByRole("button", { name: "Favoritar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Favoritado", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Favoritado", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "alex@kurio.test");
  await page.goto("/favoritos");
  await expect(
    page.getByRole("heading", { name: "Seus favoritos aparecerão aqui" }),
  ).toBeVisible();
  await control(page, "expire");
  await page.goto("/perfil");
  await expect(page).toHaveURL(/login/);
  await login(page, "alex@kurio.test");
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Alex Lima");
});
test("carrinho, cupom, precisão, persistência e remoção", async ({ page }) => {
  await add(page);
  await page.getByLabel("Aumentar quantidade").click();
  await expect(page.getByTestId("total")).toHaveText("2.396 ETH");
  await page.getByLabel("Código promocional").fill("EXPIRED");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Cupom expirado" }),
  ).toBeVisible();
  await closeNotice(page);
  await page.getByLabel("Código promocional").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByTestId("total")).toHaveText("2.158 ETH");
  await page.reload();
  await expect(page.getByTestId("total")).toHaveText("2.158 ETH");
  await page.getByRole("button", { name: "Remover cupom" }).click();
  await expect(page.getByTestId("total")).toHaveText("2.396 ETH");
  await closeNotice(page);
  await page.getByRole("button", { name: "Remover Emerald Ape #042" }).click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("compra completa, recibo imutável e carrinho limpo", async ({ page }) => {
  await checkout(page);
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira!",
    }),
  ).toBeVisible();
  const id = await page.getByTestId("order-id").textContent();
  await expect(page.getByTestId("total")).toHaveText("1.206 ETH");
  await control(page, "price");
  await page.reload();
  await expect(page.getByTestId("order-id")).toHaveText(id!);
  await expect(page.getByTestId("total")).toHaveText("1.206 ETH");
  await page.goto("/carrinho");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("pagamento recusado preserva itens", async ({ page }) => {
  await checkout(page);
  await config(page, "payment-declined");
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
  await expect(page.getByTestId("total")).toHaveText("1.206 ETH");
});
test("timeout e cliques repetidos recuperam o mesmo pedido após refresh", async ({
  page,
}) => {
  await checkout(page);
  await config(page, "order-timeout");
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .dblclick();
  await expect(page.getByRole("dialog").locator(".error-state")).toContainText(
    "demorou",
    { timeout: 15000 },
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Recuperar pedido", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira!",
    }),
  ).toBeVisible();
  expect((await orders(page)).length).toBe(1);
});
test("perfil, avatar, senha e carteiras persistem; API valida campos", async ({
  page,
}) => {
  await page.goto("/login?returnTo=/perfil");
  await login(page);
  await closeNotice(page);
  await page.getByLabel("Nome de exibição").fill("Nova Atualizada");
  await page
    .getByLabel("Avatar (PNG, JPEG ou WebP, até 200 KB)")
    .setInputFiles("public/assets/golden.webp");
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Perfil atualizado" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Nova Atualizada",
  );
  await expect(page.getByAltText("Seu avatar")).toHaveAttribute(
    "src",
    /^data:image/,
  );
  await page.getByLabel("Senha atual", { exact: true }).fill("errada");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123!");
  await page.getByLabel("Confirmar nova senha").fill("NovaSenha123!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(page.locator("#current-error")).toHaveText(
    "Senha atual incorreta.",
  );
  await page.getByLabel("Senha atual", { exact: true }).fill("Kurio123!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Senha alterada" }),
  ).toBeVisible();
  await page.goto("/carteiras");
  await page
    .getByLabel("Nome da carteira", { exact: true })
    .first()
    .fill("Coleção principal");
  await page
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Carteira salva" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome da carteira").first()).toHaveValue(
    "Coleção principal",
  );
  await config(page, "validation");
  await page
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .first()
    .click();
  await expect(page.locator("#address-0-error")).toContainText("recusado");
  await config(page, "success");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "nova@kurio.test", "NovaSenha123!");
});
test("Socket.IO altera preço; revisão antiga exige nova confirmação", async ({
  page,
}) => {
  await checkout(page);
  await review(page);
  await control(page, "price");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "alterado",
  );
  await expect(page.getByRole("dialog").getByTestId("total")).toHaveText(
    "1.306 ETH",
  );
  await control(page, "duplicate");
  await control(page, "old");
  await expect(page.getByRole("dialog").getByTestId("total")).toHaveText(
    "1.306 ETH",
  );
  await page.getByRole("button", { name: "Atualizar revisão" }).click();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira!",
    }),
  ).toBeVisible();
});
test("revalidação servidor impede preço ou estoque desatualizado", async ({
  page,
}) => {
  await checkout(page);
  await config(page, "price-change");
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "A cotação mudou" }),
  ).toBeVisible();
  expect((await orders(page)).length).toBe(0);
  await expect(page.getByTestId("total")).toHaveText("1.306 ETH");
  await config(page, "sold-out");
  await closeNotice(page);
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Revisar compra" }),
  ).toBeDisabled();
  expect((await orders(page)).length).toBe(0);
});
test("pedido pendente: desconexão, refresh e reconciliação", async ({
  page,
}) => {
  await checkout(page);
  await config(page, "pending");
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pedido pendente", exact: true }),
  ).toBeVisible();
  const id = await page.getByTestId("order-id").textContent();
  await control(page, "disconnect");
  await expect(
    page.getByText("Tempo real conectado", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("order-id")).toHaveText(id!);
  await control(page, "settle");
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira!",
    }),
  ).toBeVisible();
  expect((await orders(page)).length).toBe(1);
});
test("sessão expira no checkout e preserva contexto", async ({ page }) => {
  await checkout(page);
  const editCollector = page.getByRole("button", {
    name: /Dados do colecionador/,
  });
  if (await editCollector.isVisible()) await editCollector.click();
  await page
    .getByLabel("Observação do colecionador (opcional)")
    .fill("Retomar daqui");
  await control(page, "expire");
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
  await login(page);
  await expect(page).toHaveURL(/pagamento/);
  await expect(
    page.getByLabel("Observação do colecionador (opcional)"),
  ).toHaveValue("Retomar daqui");
  await expect(page.getByTestId("total")).toHaveText("1.206 ETH");
});
test("skeletons, erro REST e recuperação; resposta velha descartada", async ({
  page,
}) => {
  await config(page, "slow");
  await page.goto("/nft/emerald-042");
  await expect(page.getByRole("status", { name: "Carregando" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await config(page, "server-error");
  await page.goto("/nft/nft-2");
  await expect(page.getByRole("alert")).toContainText("temporariamente");
  await config(page, "success");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Sage Nomad #009", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await config(page, "out-of-order");
  const search = page.getByRole("textbox", { name: "Buscar NFTs" });
  await search.fill("S");
  await search.fill("Emerald");
  await expect(page.locator(".result-count")).toContainText("4 NFTs");
  await expect(page.locator(".nft-card").first()).toContainText("Emerald");
  await config(page, "offline");
  await search.fill("Golden");
  await expect(page.getByRole("alert")).toContainText("Sem conexão");
  await config(page, "success");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator(".nft-card").first()).toContainText("Golden");
});
test("teclado, foco em diálogo e validação associada", async ({ page }) => {
  await page.goto("/nft/emerald-042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Ampliar NFT", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveAttribute(
    "aria-describedby",
    "email-error",
  );
});
