import { preview } from "vite";
const server = await preview({ preview: { host: "127.0.0.1", port: 4174 } });
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
page.on("pageerror", (e) => console.log("PAGE_ERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE_ERROR", m.text());
});
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(3000);
console.log((await page.locator("body").innerText()).slice(0, 3500));
await page.screenshot({ path: "reports/desktop-home.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "reports/mobile-home.png", fullPage: true });
await browser.close();

server.httpServer.close();
