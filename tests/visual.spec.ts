import { test, expect } from "@playwright/test";
import { ready, config, add, checkout, closeNotice } from "./helpers";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await config(page, "success", 0);
  await page.clock.setFixedTime(new Date("2026-10-09T12:00:00Z"));
});
for (const name of ["inicio", "detalhe", "carrinho", "pagamento"])
  test(`visual ${name}`, async ({ page }) => {
    if (name === "detalhe") {
      await page.goto("/nft/emerald-042");
      await expect(
        page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
      ).toBeVisible();
    }
    if (name === "carrinho") await add(page);
    if (name === "pagamento") await checkout(page);
    await closeNotice(page);
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByText("Tempo real conectado", { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
test("tablet 768 e zoom: páginas sem overflow", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const route of [
    "/",
    "/nft/emerald-042",
    "/carrinho",
    "/login",
    "/cadastro",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nft/emerald-042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
