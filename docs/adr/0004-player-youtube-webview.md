# ADR 0004 — Player do YouTube: página própria na WebView, hospedada na Vercel

- **Status:** aceito — modo **hosted** escolhido em 2026-11-14 após teste em aparelho
- **Data:** 2026-11-12

## Contexto

O YouTube exige que o embed identifique o site de origem via `Referer`. Sem ele, o player mostra
"Video unavailable" (erro 153). Em WebViews isso é a causa mais comum de falha.

## Decisão

- Uma página HTML própria com a YouTube IFrame Player API, com **fonte única** em
  `src/lib/youtube/playerHtml.ts`. A WebView abre a **página publicada** (modo hosted): a origem é
  real, então o `Referer` enviado ao YouTube não depende da WebView de cada aparelho.
- Alternativa testada e descartada: **inline** (HTML embutido no app com `baseUrl` = URL
  publicada). Funcionou no aparelho de teste, mas depende de cada WebView repassar a origem
  emprestada e exige nova versão do app para corrigir o player. Removida do código.
- Hospedagem: **Vercel (plano Hobby)**, projeto estático a partir de `web/player/`
  (`npm run deploy:player`). URL configurada em `EXPO_PUBLIC_PLAYER_URL`.
- O plano Hobby **proíbe uso comercial**. Se o app for monetizado, migrar para Cloudflare Pages:
  publicar o mesmo `web/player/index.html` e trocar `EXPO_PUBLIC_PLAYER_URL`.
- Protocolo tipado app ↔ página em `src/lib/youtube/bridge.ts`. Toda mensagem da página é
  validada (`parsePlayerEvent`) e só é aceita se vier da origem do player.
- `controls=0`, `disablekb=1`, `fs=0`: busca/seek só pelos controles do app, para distinguir ações
  do usuário de comandos de sincronização. Toques no vídeo continuam liberados (botão "Pular
  anúncio"). Navegação para fora da página abre no navegador/app do YouTube.

## Validação (critérios da Etapa 2)

Teste em 2026-11-14, aparelho real via Expo Go:

- [x] Vídeo toca sem erro 152/153 — **ambos os modos** funcionaram.
- [x] Comandos: pause **13 ms**, seek **106 ms**, ponte página→app **9 ms**. Play **904 ms**,
      mas a medida vai até o estado `playing` e inclui buffering do YouTube (provavelmente medido no
      carregamento do vídeo). Não afeta a sincronização, que corrige a posição por seek (Etapa 5).
- [x] Toque no logo do YouTube abre o app do YouTube sem tirar o player da tela.
- [ ] Vídeo com anúncio: nenhum anúncio exibido no teste; comportamento a observar na Etapa 5.
- [ ] Vídeo com embed desativado (101/150): não testado; mensagem coberta por teste unitário.
- [ ] Tela cheia: adiado para a integração do player na sala (exige `expo-screen-orientation`).
