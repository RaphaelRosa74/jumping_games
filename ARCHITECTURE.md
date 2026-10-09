# Arquitetura e decisões

## Fronteiras

A aplicação é uma SPA. O mock funciona como um servidor de domínio executado no navegador: componentes não importam fixtures ou banco. Hooks usam Axios, TanStack Query observa as respostas e o MSW intercepta as requisições na camada de rede. O controle de cenários também passa por REST.

`main.tsx` carrega o módulo da interface em paralelo à inicialização do MSW, mas só monta React quando os mocks estão prontos. O hook de tempo real importa `socket.io-client` dinamicamente após a montagem: o transporte captura a referência global de WebSocket ao carregar seu módulo, portanto essa ordem preserva a interceptação e reduz a cadeia de carregamento. O efeito descarta imports resolvidos após seu encerramento e remove os listeners e a conexão anterior. A preparação do banco e o registro do worker também acontecem em paralelo; ambos terminam antes da montagem. As duas primeiras imagens do catálogo carregam com prioridade, inclusive no mobile. Catálogo e detalhe integram o módulo inicial, evitando outra espera pela importação de rota após a montagem; as demais telas continuam sob demanda. A imagem principal compartilhada tem preload no HTML; as fontes locais são carregadas pelo CSS, sem disputar prioridade adicional com os módulos iniciais.

`src/lib/types.ts` contém os contratos transportados; os schemas Zod validam os formulários e a API. `money.ts` converte strings decimais em wei usando `bigint`, realizando adição, multiplicação e desconto sem ponto flutuante. Valores voltam como strings JSON; nenhum `bigint` é serializado.

## Estado e cache

- Estado remoto: Query. Estado de apresentação: React. Parâmetros de catálogo: Router/URL.
- Catálogo: `['nfts', search]`; detalhe: `['nft', id]`.
- Dados privados: `['favorites', userId]`, `['profile', userId]`, `['wallets', userId]`, `['orders', userId]`, `['order', userId, id]`.
- Carrinho/cotação: `['cart', owner]`, `['quote', owner, network]`.
- `staleTime` padrão de 20 s, `gcTime` de 5 min; cotações 5 s e sessão sempre revalidável.
- Queries: no máximo uma repetição em erro de rede/5xx. 4xx não é repetido. Mutations: sem retry automático.
- Foco da janela e reconexão revalidam recursos ativos. Pedido pendente também consulta REST a cada 1,5 s; estados terminais não mantêm polling.
- AbortSignal do Query é entregue ao Axios em catálogo, detalhe, carrinho, cotação e pedido. Respostas de buscas anteriores têm chaves diferentes e são canceladas quando ficam sem observadores.
- Favoritar é otimista: cancela leitura em voo, guarda snapshot, altera cache e restaura em falha. Ao concluir, revalida.
- Mutations de carrinho invalidam carrinho/cotações; perfil revalida sessão; carteiras invalidam sua lista. Eventos invalidam os recursos correspondentes.

## Sessão e dados privados

Tokens opacos simulados têm expiração de 30 minutos. O banco local guarda sessões; o cliente guarda o token. `/session` recupera a conta após refresh e é consultado periodicamente. `beforeLoad` protege checkout, perfil, carteiras, pedidos e favoritos. A API também verifica autorização: proteção de rota sozinha não seria suficiente.

401 `SESSION_EXPIRED` limpa token/cache, desmonta subscriptions privadas e redireciona com `returnTo` interno validado. Dados do checkout e tentativa ambígua de pedido ficam sob chave por usuário, para retomada após login. Login/logout cancelam queries e limpam cache; mudança de token em outra aba força nova autenticação no cliente.

Senhas persistidas usam PBKDF2-SHA256, salt individual aleatório e 100 mil iterações. O texto da senha não é salvo no banco. A senha inicial fictícia existe no inicializador e na documentação para permitir demonstração. Alterar senha invalida outras sessões da conta.

**Limite de segurança:** não é um sistema de autenticação de produção. Qualquer pessoa com acesso ao armazenamento desse navegador pode inspecionar/alterar o banco da simulação. Tokens em localStorage, autorização no cliente e banco local não devem ser reutilizados como backend real.

## Carrinho e cotação

Há carrinho de visitante, identificado por UUID local, e carrinhos de usuários. Login incorpora itens do visitante, soma quantidades por NFT/edição e limita pelo estoque disponível, sem duplicar linhas. O carrinho de visitante incorporado é limpo. Sair não dá acesso ao carrinho privado.

A API é dona de preço, cupom, taxa, estoque e totais. O carrinho guarda apenas identificadores, edição e quantidade. A cotação resolve os produtos atuais e inclui fingerprint de itens, versões, quantidades, descontos, taxa e rede, com validade de dois minutos. A interface nunca finaliza a compra usando um total calculado por conta própria.

Uma compra só pode usar uma rede por vez. Se o carrinho contém NFTs de redes diferentes, o checkout informa os itens incompatíveis; separe as compras. Ethereum/Polygon/Solana usam taxas simuladas e preços denominados em ETH conforme o desafio, sem conversão para SOL.

## Pedido e idempotência

1. Formulário validado e carteira conectada por uma chamada de simulação.
2. Usuário abre a revisão de uma cotação específica.
3. Cliente persiste uma tentativa `{key,input}` antes do envio e bloqueia cliques repetidos com uma trava síncrona.
4. API procura a chave no escopo do usuário. Corpo igual recupera o mesmo pedido; corpo diferente devolve 409.
5. API valida titularidade de carteira/cotação, campos, rede, cupom, preço, estoque e validade da cotação.
6. Sem `await` entre essas verificações finais e a escrita, a simulação reserva estoque e grava pedido/chave em uma única tarefa JavaScript.
7. Pedido começa pendente; um relógio do mock ou o controle determinístico o confirma/recusa. Consultas REST também reconciliam pedidos vencidos após refresh.
8. Confirmação subtrai **somente quantidades compradas** do carrinho atual. Recusa devolve reserva ao estoque e preserva carrinho. Estados terminais não transitam novamente.

Mudança de fingerprint/expiração produz 409, fecha revisão e exige que o usuário revise os novos valores. Timeout após criação mantém a tentativa no cliente; recuperação repete exatamente o mesmo corpo/chave. Não existe retry automático com chave nova. O snapshot do recibo é uma cópia do pedido, independente do catálogo.

## Socket.IO

Transporte: WebSocket, namespace padrão, eventos JSON. O cliente é `socket.io-client`; o MSW intercepta a conexão e `@mswjs/socket.io-binding` 0.2.0 faz codificação/decodificação e handshake Engine.IO/Socket.IO. Heartbeat de 15 s mantém a sessão. Não existe servidor remoto.

MSW 2.15 normaliza `/socket.io/` para a origem ao comparar handlers. Por isso o link de mock registra a origem `ws://`/`wss://`, enquanto o cliente continua usando o endpoint padrão `/socket.io/`.

Eventos têm `id`, `resourceId`, `version`, `data` e, para pedidos, `userId`. O cliente deduplica por ID, ignora versões antigas/iguais e não regride um pedido terminal. Eventos de pedido só são publicados para sessões válidas do proprietário, com segunda verificação no cliente. Cleanup remove listeners e desconecta o socket ao trocar sessão ou desmontar. Em reconexão, o REST reconcilia catálogo, detalhes, carrinho, cotações e pedidos.

Limites do binding: sem rooms reais, namespace customizado, acknowledgements ou anexos binários. O desafio usa somente o subconjunto necessário. Não há polling HTTP do Engine.IO, pois o cliente força WebSocket. Os eventos da demonstração acontecem no navegador ativo; não representam um broadcast de backend entre computadores.

## Persistência e reprodução

Banco versionado em `kurio:database:v1`, com catálogo, contas, hash de senhas, sessões, carteiras, carrinhos, favoritos, cotações, pedidos e índices de idempotência. Reset recria as fixtures. UUIDs e tokens são aleatórios; o conteúdo visual e os cenários são estáveis. O seletor grava a configuração; latência variável usa sequência determinística, sem `Math.random`.

A simulação tem uma autoridade em memória por aba. Não oferece transações distribuídas nem coordenação de gravações simultâneas em várias abas; use uma aba por avaliação. Atualizar a página e reconectar são suportados. A produção exigiria banco e autorização no servidor, TTL/limpeza de registros e transações reais.

## Interface, assets e acessibilidade

- Paleta marrom/cobre, Space Mono local, cartões com proporções próximas dos frames, cabeçalho/rodapé desktop e barra mobile.
- Os anexos eram JPGs de telas, não assets vetoriais/exportações individuais. Quatro ilustrações foram extraídas dos JPGs e convertidas em WebP; a mesma arte é reutilizada nas fixtures e nas miniaturas da galeria. Não se promete equivalência pixel a pixel com um Figma inspecionável.
- Space Mono foi escolhida pela correspondência visual com as referências; o arquivo Figma vinculado não pôde ser inspecionado diretamente.
- Labels permanecem visíveis, há foco destacado, link para pular conteúdo, feedback `role=status`, erros com `aria-describedby`, imagem ampliada em diálogo Radix com contenção de foco, e skeletons respeitando redução de movimento.
- No mobile, os dados do colecionador ficam em **Dados do colecionador · Editar**, preenchidos pela conta. Isso mantém a escolha de carteira em destaque e permite editar todos os campos. Erros abrem essa seção.
- Revisão antes de confirmar e painel Demo são estados adicionais necessários ao comportamento do enunciado.
- Contraste de botões foi ajustado, especialmente links estilizados como botão, usando texto escuro sobre cobre.
- Google/Facebook, recuperação por e-mail, newsletter, conteúdo editorial, avaliações, criadores e explorador não fingem integração funcional: exibem sua indisponibilidade ou natureza ilustrativa.
- Avaliações no layout são conteúdo de demonstração. Regras de negócio exigidas são operacionais, mas nenhuma arte é cunhada/transferida de fato.

## Qualidade e publicação

E2E interage com interface e rede MSW; controles de eventos passam por REST e pelo cliente Socket.IO. Capturas de início, detalhe, carrinho e pagamento são versionadas em ambos os viewports. Lighthouse usa build completo, 3 execuções por rota/perfil e medianas. O script de auditoria e relatórios estão incluídos; consulte `docs/VALIDATION.md`.

Vercel está configurada como SPA estática. **URL pública e repositório remoto permanecem pendentes de publicação autenticada.** Isso é uma pendência do item 12 do desafio, não um deploy concluído.
