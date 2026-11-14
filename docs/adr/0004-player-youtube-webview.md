# ADR 0004 — Player do YouTube: página própria na WebView, hospedada na Vercel

- **Status:** aceito (modo final será escolhido após teste em aparelho — ver "Validação")
- **Data:** 2026-11-12

## Contexto

O YouTube exige que o embed identifique o site de origem via `Referer`. Sem ele, o player mostra
"Video unavailable" (erro 153). Em WebViews isso é a causa mais comum de falha.

## Decisão

- Uma página HTML própria com a YouTube IFrame Player API, com **fonte única** em
  `src/lib/youtube/playerHtml.ts`. Dois modos, alternáveis na tela de POC:
  - **hosted:** a WebView abre a página publicada (origem real);
  - **inline:** a WebView recebe o HTML com `baseUrl` = URL publicada.
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

- [ ] Vídeo toca sem erro 152/153 no modo hosted e/ou inline, em aparelho Android real.
- [ ] play/pause/seek executam em < 300 ms (medido na tela de POC).
- [ ] Vídeo com anúncio: comportamento registrado (estados emitidos durante o anúncio).
- [ ] Vídeo com embed desativado mostra o erro 101/150 de forma amigável.
- [ ] Tela cheia: adiado para a integração do player na sala (exige `expo-screen-orientation`).
