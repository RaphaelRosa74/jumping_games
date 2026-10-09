# Publicação na Vercel

## Pelo painel

1. Extraia o projeto e envie o conteúdo da pasta `jungle-nft` a um repositório Git seu.
2. No painel da Vercel, escolha **Add New → Project** e importe esse repositório.
3. A raiz do projeto deve ser a pasta que contém `package.json` e `vercel.json`.
4. Framework: **Vite**. Install: `npm ci`. Build: `npm run build`. Output: `dist`. Node: 22.19+ ou 24.
5. Defina `VITE_ENABLE_MOCKS=true` se quiser explicitar a configuração. `.env.demo` já contém esse valor e o build utiliza o modo demo.
6. Publique e anote o link público no README.

## Pela CLI

Com login e permissões na sua conta:

```bash
npm ci
npm run build
npx vercel login
npx vercel
npx vercel --prod
```

Não é preciso banco, backend privado, Socket.IO hospedado ou chave de carteira. MSW intercepta REST e WebSocket no cliente. A Vercel serve os arquivos estáticos por HTTPS.

## Verificação após publicação

- Abrir `/nft/emerald-042` diretamente e atualizar a página.
- Conferir que `/mockServiceWorker.js` retorna JavaScript e `/assets/emerald.webp` retorna imagem.
- Confirmar o indicador “Tempo real conectado”.
- Comprar com `nova@kurio.test / Kurio123!`, mantendo a janela aberta até a confirmação.
- Alterar preço no painel Demo e verificar catálogo/carrinho.
- Abrir a mesma URL em janela anônima: a simulação começa limpa nesse navegador.
- Manter a URL pública acessível durante a avaliação; remover proteção por login de deploy se estiver habilitada.

`rewrites` segue a configuração oficial de SPA Vite na Vercel; arquivos existentes continuam sendo servidos como assets. Service worker exige HTTPS (localhost é exceção).

Referência oficial consultada: https://vercel.com/docs/frameworks/frontend/vite

**Limite desta entrega:** não há conta Vercel/GitHub conectada disponível para efetuar publicação ou criar repositório remoto. Configuração local não é evidência de deploy executado.
