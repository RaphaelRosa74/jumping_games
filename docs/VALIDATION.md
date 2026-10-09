# Validação da entrega

## Execução e ambiente

Build de demonstração com a aplicação completa, assets locais, mocks MSW e cliente Socket.IO ativos. Não há versão reduzida para auditoria. Execução local em Linux; publicação externa ainda não verificada.

- Auditoria encerrada em `2026-10-09T14:31:25.034Z` (UTC).
- Node `v24.19.0`; Linux `6.18.44`; CPU `AMD EPYC 9V74 80-Core Processor`; 9 CPUs lógicas disponíveis no contêiner.
- Chromium headless `134.0.6998.35`, instalado pelo Playwright. Resultados podem variar em outro hardware, versão do navegador ou hospedagem.

| Ferramenta | Versão do lockfile |
| --- | --- |
| react | 19.3.0 |
| typescript | 6.0.3 |
| vite | 8.3.4 |
| @playwright/test | 1.51.1 |
| lighthouse | 13.5.0 |
| msw | 2.15.0 |
| @mswjs/socket.io-binding | 0.2.0 |
| socket.io-client | 4.8.4 |
| @tanstack/react-router | 1.170.41 |
| @tanstack/react-query | 5.104.1 |
| axios | 1.20.0 |

## Build, tipos, lint e E2E

`npm run build` concluiu a checagem TypeScript e o build otimizado. `npm run lint` passou.

Última execução Playwright: **40 testes aprovados**, 0 falhas, 0 instáveis e 0 ignorados, em 105.5 segundos. Início: `2026-10-09T14:27:45.391Z`.

Os 15 cenários funcionais são executados em desktop e mobile. Mais 10 verificações cobrem oito screenshots e responsividade/zoom. Incluem compra confirmada e recusada, timeout e idempotência, expiração, troca de usuário, rollback otimista, revalidação de preço/estoque, eventos antigos/duplicados e reconexão. As operações passam pelos handlers REST e pelo cliente Socket.IO.

Viewports: desktop 1440×1080, mobile 390×844; checagens adicionais em 768 px e zoom. As oito baselines estão em `tests/baselines`. Elas documentam a implementação; não são uma comparação automática pixel a pixel com os JPGs do Figma. Os assets e desvios estão documentados em `ARCHITECTURE.md` e `docs/ASSETS.md`.

Relatórios: `reports/playwright/index.html` e `reports/playwright-results.json`. A configuração retém screenshots e traces quando há falha. Como a execução entregue não teve falhas, não há traces de falha dessa execução.

## Lighthouse — medianas de três medições

Cada rota/perfil foi medido três vezes, com navegador e perfil novos, cenário padrão e cache frio. Mobile usa o perfil padrão do Lighthouse (CPU simulada 4×, rede móvel simulada); desktop usa 1440×1080, CPU 1×, RTT 40 ms e throughput 10.240 Kbps. Configuração versionada em `scripts/lighthouse.mjs`; parâmetros efetivos também constam nos JSONs individuais.

| Rota | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP (s) | CLS | TBT (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 84 | 100 | 100 | 100 | 3.745 | 0.006403 | 287.0 |
| `/` | desktop | 99 | 100 | 100 | 100 | 0.851 | 0.000475 | 8.0 |
| `/nft/emerald-042` | mobile | 87 | 100 | 100 | 100 | 3.612 | 0.000017 | 179.7 |
| `/nft/emerald-042` | desktop | 100 | 100 | 100 | 100 | 0.769 | 0.000167 | 8.0 |

Metas do enunciado: Performance ≥90; Acessibilidade ≥95; Boas práticas ≥95; SEO ≥90.

**Metas ainda não atingidas:** `/` / mobile: performance 84 (meta 90); `/nft/emerald-042` / mobile: performance 87 (meta 90).

O carregamento inicial precisa registrar o service worker e preparar a camada de simulação antes de montar a interface. O custo de avaliação de JavaScript (React/roteador e infraestrutura MSW) e renderização do catálogo contribui para tarefas longas e TBT sob CPU móvel simulada. O conteúdo depende da resposta REST; essa cadeia também afeta o LCP. Os relatórios `bootup-time`, `long-tasks`, `network-dependency-tree-insight` e `lcp-breakdown-insight` permitem conferir a atribuição. Esses são resultados de laboratório, não métricas de campo.

A inicialização paralela da interface e dos mocks, o import tardio do Socket.IO e a prioridade das primeiras imagens já estão aplicados. Uma próxima otimização deve reduzir avaliação inicial de JavaScript e subdividir componentes de interação sem retirar os mocks ou funcionalidades da auditoria. Não foi escondido o resultado abaixo da meta.

Os relatórios HTML e JSON de cada execução ficam em `reports/lighthouse`; `summary.json` reúne os valores brutos, medianas e ambiente. Pontuação 100 em acessibilidade automatizada não substitui avaliação humana completa: os E2E também verificam teclado, foco e mensagens associadas.

## Reproduzir

```bash
npm ci
npx playwright install --with-deps chromium
npm run typecheck
npm run lint
npm run build
npm test
npm run audit
```

As baselines não devem ser atualizadas para ocultar regressões; revise as diferenças antes de usar `npm run test:update`. Para consultar o relatório E2E: `npm run test:report`.

## Publicação pendente

`vercel.json` e `docs/DEPLOY.md` estão prontos. Ainda faltam um repositório remoto e uma URL pública verificada, exigidos pelo item 12. Vercel e GitHub não estão conectados nesta sessão. Não se deve apresentar a configuração local como publicação concluída. Após conectar/publicar, execute as verificações de rotas diretas, assets, service worker, checkout e tempo real descritas no guia.
