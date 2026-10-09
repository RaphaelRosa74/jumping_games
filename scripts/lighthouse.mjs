import { preview } from "vite";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const out = "reports/lighthouse";
await fs.mkdir(out, { recursive: true });
const server = await preview({
  preview: { host: "127.0.0.1", port: 4180, strictPort: true },
});
const shell = path.join(
  os.homedir(),
  ".cache/ms-playwright/chromium_headless_shell-1161/chrome-linux/headless_shell",
);
const chromePath =
  process.env.CHROMIUM_PATH ||
  (existsSync(chromium.executablePath()) ? chromium.executablePath() : shell);
const results = [];
try {
  for (const route of ["/", "/nft/emerald-042"])
    for (const profile of ["mobile", "desktop"])
      for (let run = 1; run <= 3; run++) {
        const chrome = await launch({
          chromePath,
          chromeFlags: [
            "--headless",
            "--no-sandbox",
            "--disable-dev-shm-usage",
          ],
        });
        try {
          const result = await lighthouse(
            `http://127.0.0.1:4180${route}`,
            {
              port: chrome.port,
              output: ["html", "json"],
              logLevel: "error",
              onlyCategories: [
                "performance",
                "accessibility",
                "best-practices",
                "seo",
              ],
            },
            profile === "desktop"
              ? {
                  extends: "lighthouse:default",
                  settings: {
                    formFactor: "desktop",
                    screenEmulation: {
                      mobile: false,
                      width: 1440,
                      height: 1080,
                      deviceScaleFactor: 1,
                      disabled: false,
                    },
                    throttling: {
                      rttMs: 40,
                      throughputKbps: 10240,
                      cpuSlowdownMultiplier: 1,
                      requestLatencyMs: 0,
                      downloadThroughputKbps: 0,
                      uploadThroughputKbps: 0,
                    },
                  },
                }
              : undefined,
          );
          if (!result) throw Error("Lighthouse não retornou relatório");
          const slug = `${route === "/" ? "inicio" : "detalhe"}-${profile}-${run}`;
          await fs.writeFile(`${out}/${slug}.html`, result.report[0]);
          await fs.writeFile(`${out}/${slug}.json`, result.report[1]);
          const l = result.lhr;
          const record = {
            route,
            profile,
            run,
            version: l.lighthouseVersion,
            userAgent: l.environment.hostUserAgent,
            scores: Object.fromEntries(
              Object.entries(l.categories).map(([k, v]) => [
                k,
                Math.round(v.score * 100),
              ]),
            ),
            LCP: l.audits["largest-contentful-paint"].numericValue,
            CLS: l.audits["cumulative-layout-shift"].numericValue,
            TBT: l.audits["total-blocking-time"].numericValue,
          };
          results.push(record);
          console.log(JSON.stringify(record));
        } finally {
          await chrome.kill();
        }
      }
  const median = (a) => [...a].sort((x, y) => x - y)[1];
  const medians = [];
  for (const route of ["/", "/nft/emerald-042"])
    for (const profile of ["mobile", "desktop"]) {
      const runs = results.filter(
        (x) => x.route === route && x.profile === profile,
      );
      medians.push({
        route,
        profile,
        scores: Object.fromEntries(
          Object.keys(runs[0].scores).map((k) => [
            k,
            median(runs.map((r) => r.scores[k])),
          ]),
        ),
        LCP: median(runs.map((r) => r.LCP)),
        CLS: median(runs.map((r) => r.CLS)),
        TBT: median(runs.map((r) => r.TBT)),
      });
    }
  await fs.writeFile(
    `${out}/summary.json`,
    JSON.stringify(
      {
        environment: {
          node: process.version,
          platform: os.platform(),
          release: os.release(),
          cpu: os.cpus()[0]?.model,
          logicalCPUs: os.cpus().length,
          date: new Date().toISOString(),
          chromePath,
        },
        conditions:
          "Build de demonstração otimizado, MSW ativo, cenário padrão, assets e fontes locais, cache e perfil novos em cada medição. Mobile Lighthouse padrão; desktop 1440x1080 CPU 1x RTT 40ms.",
        medians,
        runs: results,
      },
      null,
      2,
    ),
  );
  console.log("MEDIANAS", JSON.stringify(medians));
} finally {
  server.httpServer.close();
}
