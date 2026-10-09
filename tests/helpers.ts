import { expect, type Page } from "@playwright/test";
export async function ready(page: Page) {
  await expect(
    page.getByRole("heading", { name: /SEJA DONO DO FUTURO/ }),
  ).toBeVisible();
  await expect(page.locator(".nft-card").first()).toBeVisible();
  await expect(
    page.getByText("Tempo real conectado", { exact: true }),
  ).toBeVisible();
}
export async function config(page: Page, scenario: string, latency = 0) {
  await page.evaluate(
    async (v) => {
      await fetch("/api/__mock/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
    },
    { scenario, latency },
  );
}
export async function control(page: Page, type: string) {
  await page.evaluate(async (type) => {
    await fetch("/api/__mock/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
  }, type);
}
export async function login(
  page: Page,
  email = "nova@kurio.test",
  password = "Kurio123!",
) {
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
export async function closeNotice(page: Page) {
  const close = page.getByRole("button", { name: "Fechar aviso" });
  if (await close.isVisible()) await close.click();
}
export async function add(page: Page) {
  await page.goto("/nft/emerald-042");
  await page.getByRole("button", { name: "Comprar NFT", exact: true }).click();
  await expect(page).toHaveURL(/\/carrinho/);
  await expect(page.getByTestId("total")).toHaveText("1.206 ETH");
  await closeNotice(page);
}
export async function checkout(page: Page) {
  await add(page);
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await expect(page).toHaveURL(/login/);
  await login(page);
  await expect(page).toHaveURL(/pagamento/);
  await closeNotice(page);
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await expect(
    page.getByText("✓ Carteira conectada (simulação)", { exact: true }),
  ).toBeVisible();
  await closeNotice(page);
}
export async function review(page: Page) {
  await page.getByRole("button", { name: "Revisar compra" }).click();
  await expect(
    page.getByRole("dialog", { name: "Revise sua compra" }),
  ).toBeVisible();
}
export async function orders(page: Page) {
  return page.evaluate(async () => {
    const r = await fetch("/api/orders", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("kurio:token"),
      },
    });
    return r.json();
  });
}
