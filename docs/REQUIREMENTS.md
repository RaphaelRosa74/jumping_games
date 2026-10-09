# Análise e rastreabilidade do enunciado

O desafio não é apenas uma reprodução de telas. Seus requisitos eliminatórios exigem que interface, domínio simulado, REST e Socket.IO compartilhem estado e que a compra só confirme depois da resposta do mock. Por isso a implementação separa transporte, contratos, cache, interface e banco da simulação.

## Matriz de implementação

| Item                             | Implementação / evidência                                           | Situação                                      |
| -------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| React e TypeScript               | `src/App.tsx`, TS estrito, `npm run typecheck`                      | Implementado                                  |
| TanStack Router                  | `src/router.tsx`; URL tipada e `beforeLoad`                         | Implementado                                  |
| TanStack Query / Axios           | `src/lib/query.ts`, `api.ts`; queries/mutations nas páginas         | Implementado                                  |
| Tailwind / shadcn/ui             | `styles.css`, `components.json`, Button/Dialog com CVA/Slot/Radix   | Implementado                                  |
| Catálogo                         | 36 NFTs, busca, categorias, rede, preço, tabs, sort e páginas       | Implementado                                  |
| Estado na URL                    | Filtros combinados, refresh, histórico e reset da página            | Testado em desktop/mobile                     |
| Detalhe                          | Acesso direto, 404, zoom, edição, limite e favorito                 | Testado                                       |
| Favoritos                        | Conta autenticada, persistência, otimista e rollback                | Testado                                       |
| Carrinho                         | Soma/edição/remoção; refresh; incorporação no login                 | Testado                                       |
| Cupom e precisão ETH             | KURIO10, expirado/inválido, BigInt/wei, cotação REST                | Implementado e testado                        |
| Checkout                         | Validação, carteiras, rede, conexão/recusa/desconexão e revisão     | Implementado                                  |
| Cotação desatualizada            | Fingerprint, TTL e revalidação no servidor simulado                 | Testado                                       |
| Pedidos duplicados               | Trava síncrona, tentativa persistida, idempotência por usuário      | Testado com timeout e clique repetido         |
| Resultado da compra              | Pendente/confirmado/recusado; confirmação depende do mock           | Testado                                       |
| Recibo                           | Snapshot imutável do pedido                                         | Testado após alteração de preço               |
| Conta e sessão                   | Cadastro/login/logout/refresh/expiração/retorno                     | Testado                                       |
| Isolamento                       | Chaves privadas, cancelamento/limpeza de cache, subscriptions       | Testado com troca de conta                    |
| Perfil / avatar / senha          | Schemas, erros de API, avatar local limitado, hash de senha         | Testado                                       |
| Carteiras                        | Até duas, principal/secundária, endereço/rede/provider              | Testado                                       |
| MSW                              | Rede real interceptada; banco consistente e reset                   | Implementado                                  |
| Cenários                         | Painel e endpoint de controle; slow/empty/4xx/5xx/network/checkout  | Implementado e testado                        |
| Socket.IO efetivo                | `socket.io-client` + binding MSW, handshake e heartbeat             | Testado no navegador                          |
| Atualizações                     | `nft.updated`, `order.updated` com ID/recurso/versão/usuário        | Implementado                                  |
| Duplicatas/eventos antigos       | Deduplicação, versão monotônica, estados terminais                  | Testado no fluxo de preço                     |
| Reconexão                        | Revalidação REST e consulta de pedidos pendentes                    | Testado com interrupção e refresh             |
| Skeletons                        | Catálogo, detalhe e resumo; shimmer/reduced-motion                  | Testado com cenário lento                     |
| Responsividade                   | Layouts 390, 768 e 1440 px; perfil/carteiras/recibo mobile          | Implementado; checagens automáticas e visuais |
| Acessibilidade                   | Labels, foco, diálogo, skip link, live regions e contraste          | E2E e Lighthouse                              |
| Playwright                       | Fluxos, falhas, desktop/mobile, 8 baselines, HTML e traces de falha | Incluído; resultados em VALIDATION.md         |
| Lighthouse                       | 2 rotas × 2 perfis × 3 medições, HTML/JSON e medianas               | Incluído; resultados em VALIDATION.md         |
| Assets locais                    | Ilustrações extraídas dos JPGs, fonte empacotada                    | Implementado com limitações documentadas      |
| Deploy Vercel                    | Build, rewrite SPA, worker sem cache e instruções                   | Configurado                                   |
| Repositório remoto + URL pública | Precisa de publicação na conta do responsável                       | **Pendente**                                  |

## Decisões de interpretação

1. **Figma versus dados:** totais inconsistentes entre frames não foram copiados como valores fixos. A API determina quantidade × preço, desconto e taxa.
2. **Mobile:** o frame de pagamento destaca a carteira e não exibe o formulário inteiro. Os campos continuam disponíveis numa seção expansível, preenchida a partir da conta.
3. **Pagamento confirmado:** a interface não declara sucesso ao clicar. Exibe pedido pendente até o mock avançar para confirmado; recusas nunca mostram recibo confirmado.
4. **Cenários controláveis:** a simulação padrão não dispara alterações de preço aleatoriamente. O avaliador escolhe o cenário ou dispara um evento, tornando o teste reproduzível.
5. **Atualizações de estoque:** reserva ocorre no pedido pendente; recusa devolve estoque. O carrinho é descontado somente quando confirmado.
6. **Serviços fora de escopo:** não há integração real de OAuth, carteira, blockchain, newsletter, suporte ou explorador. Ações auxiliares informam isso.
7. **Fidelidade:** foram usados os JPGs fornecidos, sem acesso ao arquivo editável do Figma. Ilustrações repetidas, fonte escolhida por semelhança e alguns ajustes de densidade estão descritos em ARCHITECTURE.md.
8. **Entrega pública:** arquivos/configurações não substituem o deploy obrigatório. O README mantém essa pendência explícita até existir URL pública verificada.

## Evidências e reprodução

- Enunciado original: `docs/CHALLENGE.md`.
- Contratos, estados e códigos: `docs/CONTRACTS.md`.
- Políticas de cache, sessão, estoque e socket: `ARCHITECTURE.md`.
- Cenários passo a passo e credenciais: `README.md`.
- E2E: `tests/flows.spec.ts`; visual/responsividade: `tests/visual.spec.ts`.
- Capturas de referência executável: `tests/baselines/{desktop,mobile}`.
- Relatório do resultado executado: `reports/playwright/index.html` e `reports/playwright-results.json`.
- Auditoria: `scripts/lighthouse.mjs`, `reports/lighthouse/*.html`, `*.json` e `summary.json`.
