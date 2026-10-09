# Acesse o site:
https://jumping-games.vercel.app/?q=&category=&network=&sort=recent&page=1&min=&max=&tab=all

# Kurio — NFT Marketplace

Implementação do desafio frontend em React e TypeScript, baseada nos frames desktop e mobile fornecidos. Todos os pagamentos, carteiras, usuários e NFTs são **simulados**. Não há integração com blockchain nem movimentação de dinheiro.

## Iniciar

Requer Node.js **22.19 ou superior** e npm. A primeira instalação usa o registro público npm.

```bash
npm ci
npm run dev:mocks
```

Abra `http://127.0.0.1:5173`. Não abra `index.html` diretamente: MSW precisa de HTTP em localhost ou HTTPS. Permita service workers e armazenamento local.

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

O preview fica em `http://127.0.0.1:4173`. O build usa `.env.demo`, com mocks habilitados. Imagens, fontes e worker são locais; depois da instalação a demonstração não depende de APIs externas.

### Contas fictícias

| Usuário   | E-mail            | Senha inicial |
| --------- | ----------------- | ------------- |
| Nova Sato | `nova@kurio.test` | `Kurio123!`   |
| Alex Lima | `alex@kurio.test` | `Kurio123!`   |

As duas contas têm dados privados separados. Também é possível cadastrar contas. A conta recém-criada precisa cadastrar uma carteira antes da compra. Use apenas dados fictícios: a demonstração persiste em seu navegador.

Cupom válido: **KURIO10**, desconto de 10%. `EXPIRED` reproduz cupom expirado; qualquer outro código é inválido.

## Stack e organização

- React + TypeScript estrito + Vite.
- TanStack Router: rotas, filtros na URL e proteção dos fluxos privados.
- TanStack Query: consultas, mutations, cache por usuário, cancelamento e invalidação.
- Axios: transporte REST da aplicação.
- MSW: handlers REST com persistência e cenários; interceptação de WebSocket.
- Socket.IO Client + `@mswjs/socket.io-binding`: eventos do protocolo Socket.IO, sem servidor remoto.
- Tailwind CSS 4 + componentes shadcn/ui adaptados (Button e Dialog, base Radix).
- Zod: validação compartilhada entre formulários e API.
- Playwright: E2E desktop/mobile e baselines visuais.
- Lighthouse: três medições por rota/perfil, relatórios HTML/JSON e medianas.

```text
src/
  components/       Layout, campos, skeletons, cards e componentes ui
  lib/              Contratos, Axios, cache, sessão, validação, valores e socket
  mocks/            Fixtures, banco local, handlers REST e servidor Socket.IO simulado
  pages/            Catálogo, detalhe, conta, carrinho, checkout e pedido
  router.tsx        Rotas e validação dos parâmetros de busca
  main.tsx          Inicialização dos mocks antes da aplicação
public/             Assets locais, robots e service worker
scripts/            Auditoria Lighthouse e inspeção visual
tests/              E2E e baselines versionadas
docs/               Contratos, análise dos requisitos, deploy e evidências
```

## Rotas

| URL                      | Tela                                               |
| ------------------------ | -------------------------------------------------- |
| `/`                      | Catálogo com busca, filtros, ordenação e paginação |
| `/nft/emerald-042`       | Exemplo de detalhe; identificador na rota          |
| `/carrinho`              | Carrinho persistente, quantidades, cupom e resumo  |
| `/login`, `/cadastro`    | Autenticação e criação de conta                    |
| `/pagamento`             | Carteira, rede, dados do colecionador e revisão    |
| `/pedido/:id`            | Estado do pedido e recibo somente após confirmação |
| `/perfil`, `/carteiras`  | Gestão da conta                                    |
| `/favoritos`, `/pedidos` | Lista de interesse e recuperação de compras        |

Busca e filtros: `q`, `category`, `network`, `min`, `max`, `sort`, `page`, `tab`. Exemplo: `/?category=Arte%20digital&network=Ethereum&sort=price-asc&page=1`. Alterar um filtro reinicia a página. Voltar/avançar e refresh restauram o estado.

## Demonstração e cenários

O botão **Demo** (ícone de controles no mobile) abre o painel. Selecione um cenário e pressione **Aplicar cenário**. A seleção é persistente. Para retornar, selecione **Sucesso**. **Restaurar dados da demonstração** apaga contas criadas, mudanças, sessões, pedidos, carrinhos e favoritos, restaurando as fixtures.

| Cenário                                 | Como observar                                                 |
| --------------------------------------- | ------------------------------------------------------------- |
| Sucesso                                 | 36 NFTs, 9 categorias e 3 redes                               |
| Catálogo vazio                          | Nenhum resultado e opção de limpar filtros                    |
| Carregamento lento                      | Skeletons com shimmer em catálogo, detalhe e resumo           |
| Respostas fora de ordem                 | Digite uma letra e imediatamente uma busca mais longa         |
| Falha de conexão REST                   | Requisições falham; restaure Sucesso e use Tentar novamente   |
| Erro HTTP 503                           | Feedback de falha transitória e retry limitado                |
| Sessão expirada / acesso não autorizado | Tente abrir perfil ou concluir checkout; autentique novamente |
| Erro de formulário                      | Salve perfil/carteira; a API devolve erro associado ao campo  |
| Falha em favoritos                      | Favoritar reverte o estado otimista e exibe erro              |
| Preço alterado ao comprar               | Abra revisão e confirme: API exige nova revisão               |
| Edição esgotada ao comprar              | Pedido bloqueado, carrinho preservado                         |
| Timeout após criar pedido               | Aguarde 9 segundos; recarregue e use Recuperar pedido         |
| Pagamento recusado                      | Pedido termina recusado e os itens permanecem no carrinho     |
| Pedido permanece pendente               | Use Finalizar pedidos pendentes no painel quando desejar      |

O painel também dispara **Alterar preço (+0.1 ETH)**, **Esgotar edição 1/50**, **Repetir evento**, **Enviar evento antigo**, **Interromper socket**, **Expirar sessão** e **Finalizar pedidos pendentes**. Alterações de NFT miram `emerald-042`. Esses comandos alteram o banco do mock e publicam eventos pelo binding Socket.IO; não chamam setters ou cache da interface.

### Fluxo de compra e tempo real

1. Abra Emerald Ape, escolha edição/quantidade e clique em Comprar NFT.
2. Aplique KURIO10 se desejar. Clique em Conectar e finalizar e entre como Nova.
3. Confira os dados, escolha a carteira Principal/Ethereum e conecte-a. Recusa e desconexão podem ser simuladas.
4. Clique em Revisar compra. Antes de confirmar, use o painel para alterar preço (ou dispare pelo controle REST descrito em CONTRACTS.md).
5. A cotação é atualizada; uma revisão antiga exige nova confirmação. Esgotamento impede a compra.
6. Confirme e acompanhe o pedido. Em modo pendente, interrompa o socket e recarregue. O mesmo ID é recuperado.
7. Apenas pedidos confirmados exibem recibo. Seus valores não mudam após novos eventos no catálogo.

Se uma tentativa foi enviada e a resposta se perdeu, **Recuperar pedido** reutiliza corpo e chave de idempotência originais. Não limpe o armazenamento para recuperar uma compra.

## Testes e auditorias

```bash
npx playwright install --with-deps chromium
npm run build
npm test
npm run test:report
```

Os testes iniciam o preview automaticamente. Cada teste recebe um contexto de navegador novo, banco e usuário isolados. Há projetos Chromium desktop 1440×1080 e mobile 390×844, além de verificações de 768 px e zoom. Dados de screenshot são estáveis; as baselines ficam em `tests/baselines`. Se o navegador do ambiente não puder ser instalado pelo Playwright, `CHROMIUM_PATH=/caminho/do/chrome npm test` permite informar um Chromium compatível.

```bash
npm run test:update       # atualizar baselines intencionalmente após revisão
npm run audit             # build deve estar pronto; porta 4180 livre
```

A auditoria abre um Chromium e perfil novos por medição, mantendo os mocks e assets completos. Ela não desativa funcionalidades para melhorar métricas. HTML/JSON por execução e medianas são gravados em `reports/lighthouse`. Leia os resultados verificados e condições em [docs/VALIDATION.md](docs/VALIDATION.md).

## Variáveis

| Variável            | Uso                                                   |
| ------------------- | ----------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | `true` na demonstração; disponível no build e local   |
| `VITE_API_URL`      | URL REST opcional, apenas para um futuro backend      |
| `VITE_SOCKET_URL`   | URL Socket.IO opcional, apenas para um futuro backend |
| `CHROMIUM_PATH`     | Executável opcional para Playwright/Lighthouse        |

Para `npm run dev`, copie `.env.example` para `.env.local`. O comando `dev:mocks` funciona sem isso. Não coloque segredos em variáveis `VITE_*`: são públicas no cliente.

## Vercel e entrega

`vercel.json` já configura Vite, `npm ci`, `npm run build`, `dist`, fallback das rotas para `index.html` e cache correto do worker. Leia [docs/DEPLOY.md](docs/DEPLOY.md) para importar o repositório ou publicar pela CLI.

**Status de publicação:** o projeto está preparado para Vercel, mas não foi publicado em uma conta externa nem enviado a um repositório remoto nesta entrega. Esses dois links obrigatórios no desafio precisam ser preenchidos após o deploy autenticado. Não há URL pública fictícia.

- Repositório público: **pendente de publicação**.
- Aplicação pública: **pendente de publicação**.

O código, lockfile, assets, fixtures, testes, baselines, configuração e relatórios acompanham a entrega. [ARCHITECTURE.md](ARCHITECTURE.md) registra decisões e limitações; [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) relaciona o enunciado às evidências.
