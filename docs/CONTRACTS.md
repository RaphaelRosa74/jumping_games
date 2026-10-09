# Contratos REST e eventos

Base de demonstração: `/api`. JSON UTF-8. O transporte da aplicação usa Axios, timeout 9 s. Dinheiro é uma string decimal positiva com até 18 casas; quantidade é número inteiro. Schemas e interfaces executáveis: `src/lib/types.ts`, `validation.ts` e `mocks/handlers.ts`.

## Cabeçalhos e erros

`Authorization: Bearer <token>` identifica conta autenticada. `X-Guest-ID: <uuid>` identifica carrinho de visitante. `Idempotency-Key: <uuid>` é obrigatório em `POST /orders`.

Erros têm esta forma:

```json
{
  "code": "VALIDATION",
  "message": "Verifique os campos informados.",
  "fields": { "email": "Informe um e-mail válido." }
}
```

| HTTP | Códigos principais                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------- |
| 401  | `SESSION_EXPIRED`, `BAD_CREDENTIALS`                                                                          |
| 403  | `FORBIDDEN` (carteira, cotação ou pedido de outra conta)                                                      |
| 404  | `NOT_FOUND`                                                                                                   |
| 409  | `ACCOUNT_EXISTS`, `STOCK_CONFLICT`, `QUOTE_CHANGED`, `IDEMPOTENCY_CONFLICT`, `WALLET_LIMIT`, `WALLET_REFUSED` |
| 422  | `VALIDATION`, `COUPON_INVALID`, `COUPON_EXPIRED`, `IDEMPOTENCY_REQUIRED`                                      |
| 503  | `TRANSIENT`                                                                                                   |

Falha de conexão não tem resposta HTTP. Timeout pode acontecer **depois** de o pedido ter sido persistido.

## Recursos

| Método / endpoint          | Entrada                                         | Resposta / observação                                                |
| -------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| GET `/session`             | token opcional                                  | `{user,expiresAt}`; visitante tem null; token expirado gera 401      |
| POST `/auth/register`      | `{name,username,email,password,confirm}`        | `{token,user,expiresAt}`; conflito 409                               |
| POST `/auth/login`         | `{email,password}`                              | mesma resposta; mescla carrinho de visitante                         |
| POST `/auth/logout`        | token                                           | `{ok:true}`, revoga sessão                                           |
| POST `/auth/expire`        | token                                           | `{ok:true}`, expiração simulada                                      |
| GET `/nfts`                | query abaixo                                    | `{items,total,page,pages}`; 9 por página                             |
| GET `/nfts/:id`            | identificador                                   | NFT ou 404                                                           |
| GET `/favorites`           | token                                           | `string[]` de IDs                                                    |
| POST / DELETE `/favorites` | token + `{nftId}`                               | lista atualizada                                                     |
| GET `/cart`                | token ou visitante                              | `{items,coupon,version}`                                             |
| POST `/cart`               | `{nftId,edition,quantity}`                      | soma quantidade à linha; valida estoque                              |
| PATCH `/cart`              | mesmo corpo                                     | substitui quantidade da linha                                        |
| DELETE `/cart`             | `{nftId,edition}`                               | remove a linha                                                       |
| POST `/cart/coupon`        | `{code}`                                        | carrinho; string vazia remove                                        |
| POST `/quotes`             | `{network}`                                     | cotação atual; itens e totais calculados no mock                     |
| POST `/orders`             | token, chave, `{quoteId,walletId,collector}`    | 201 pedido pendente; reenvio igual retorna mesmo ID                  |
| GET `/orders`              | token                                           | pedidos da conta, mais recentes primeiro                             |
| GET `/orders/:id`          | token                                           | pedido e snapshot; 403 para outra conta                              |
| GET / PATCH `/profile`     | token; PATCH `{name,username,email,bio,avatar}` | User atualizado                                                      |
| POST `/profile/password`   | `{current,password,confirm}`                    | `{ok:true}`                                                          |
| GET / POST `/wallets`      | token; POST Wallet sem id                       | lista de carteiras (limite 2)                                        |
| PATCH `/wallets/:id`       | Wallet sem id                                   | lista atualizada; uma principal                                      |
| POST `/wallets/connect`    | `{walletId,refuse}`                             | `{connected:true}` ou 409; desconexão encerra conexão local simulada |

`GET /nfts`: `q`, `category`, `network`, `min`, `max`, `sort=recent|price-asc|price-desc`, `page`, `tab=all|new|trending`. Todos os filtros são combinados na API.

## Objetos

```ts
interface NFT {
  id: string;
  name: string;
  image: string;
  price: string;
  category: string;
  network: "Ethereum" | "Polygon" | "Solana";
  editions: Record<"1/1" | "1/10" | "1/50" | "Aberta", number>;
  attributes: string[];
  version: number;
  featured: boolean;
  created: number;
}
interface CartItem {
  nftId: string;
  edition: Edition;
  quantity: number;
}
interface QuoteItem extends CartItem {
  name: string;
  image: string;
  price: string;
  lineTotal: string;
  available: number;
  nftVersion: number;
}
interface Quote {
  id: string;
  fingerprint: string;
  items: QuoteItem[];
  subtotal: string;
  discount: string;
  fee: string;
  total: string;
  coupon: string;
  valid: boolean;
  issues: string[];
  expiresAt: number;
}
interface Collector {
  name: string;
  username: string;
  email: string;
  profile: string;
  referral: string;
  ens: string;
  note: string;
}
interface Wallet {
  id: string;
  label: string;
  address: string;
  network: "Ethereum" | "Polygon" | "Solana";
  provider: "MetaMask" | "WalletConnect" | "Coinbase Wallet";
  primary: boolean;
}
```

User contém `id,name,username,email,avatar,bio`; nunca inclui hash/senha. Avatar aceita caminho de fixture ou Data URL PNG/JPEG/WebP limitado pelo schema. Order contém `id,userId,status,quote,wallet,collector,transaction,version,createdAt,settleAt,decline`. `quote`, `wallet` e `collector` são snapshots. `decline` e `settleAt` são metadados da simulação; nenhum segredo é transportado.

### Precisão

Exemplo: 2 × `1.19` = `2.38`; KURIO10 = `0.238`; taxa Ethereum = `0.016`; total = `2.158`. Taxas simuladas Polygon `0.002`, Solana `0.001`. Desconto é truncado apenas abaixo de 1 wei (divisão inteira por 10). Apresentação preserva casas relevantes, com mínimo de duas.

### Idempotência

A chave é associada a usuário e corpo serializado exato. Mesma chave/corpo recupera o pedido mesmo que a cotação tenha expirado depois ou o pedido já seja terminal. Mesma chave/corpo diferente gera conflito. O cliente salva corpo/chave antes do primeiro envio. A resposta pode se perder; limpar essa tentativa e usar chave nova seria incorreto.

## Eventos

Endpoint: origem da aplicação, caminho Socket.IO padrão `/socket.io/`, transporte WebSocket. Cliente envia token de simulação no query string; não use essa abordagem com credenciais reais.

```ts
interface ResourceEvent {
  id: string; // identidade única do evento
  resourceId: string; // NFT ou pedido
  version: number; // monotônica por recurso
  userId?: string; // obrigatório para order.updated
  data?: NFT | Order;
}
```

| Evento                     | Efeito                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| `nft.updated`              | Invalida catálogo/detalhe/carrinho/cotação e informa alteração              |
| `order.updated`            | Atualiza pedido pertencente ao usuário; invalida histórico/carrinho/cotação |
| `connect` após interrupção | Revalida recursos ativos com REST                                           |

Duplicatas e versões antigas não são reaplicadas. Pedidos terminais são imutáveis. Recursos REST são a referência de reconciliação após reconexão.

## Controle de testes/demonstração

Esses endpoints existem **somente quando os mocks estão habilitados**:

- GET/POST `/__mock/config`: `{scenario,latency,seed}`. `latency` é milissegundos; seed é metadado reservado, a sequência de latência não usa aleatoriedade.
- POST `/__mock/reset`: restaura banco conhecido.
- POST `/__mock/control`: `{type,id?}`; `type`: `price`, `sold-out`, `duplicate`, `old`, `disconnect`, `settle`, `expire`. NFT padrão é `emerald-042`.

Exemplo de controle via console do navegador, usado também pelos testes:

```js
await fetch("/api/__mock/control", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "price", id: "emerald-042" }),
});
```

O comando modifica o estado do mock e emite uma mensagem real do protocolo Socket.IO interceptado. Não acessa o cache React diretamente.
