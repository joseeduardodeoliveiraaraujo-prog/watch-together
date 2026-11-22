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
  do usuário de comandos de sincronização. Navegação para fora da página abre no navegador/app do
  YouTube.
- **Atualização 2026-11-20 — toques no vídeo bloqueados.** Mesmo com `controls=0` o YouTube mostra
  o botão grande de play com o vídeo parado; tocar nele dava play só naquele aparelho e a
  sincronização pausava de novo. Agora uma camada do app cobre o vídeo e recebe todos os toques
  (na tela cheia ela mostra/esconde os controles). Custo aceito: o botão "Pular anúncio" e o logo
  do YouTube deixam de responder. Usar os controles nativos do YouTube foi descartado: o app teria
  de adivinhar se cada mudança de estado veio da pessoa, da rede ou de um anúncio.
- **Legendas** (escolha local, não vai para a sala) usam `getOption`/`setOption('captions', ...)`,
  não documentados pelo YouTube. **Qualidade** não é controlável pela IFrame API
  (`setPlaybackQuality` não faz nada desde 2019): fica no automático do YouTube, independente em
  cada aparelho. Tocar o vídeo fora do player oficial para escolher a qualidade viola os termos.
- **Volume** (2026-11-22): `setVolume` (0–100) e `mute` da IFrame API, escolha local salva no
  celular (`localStorage`, chave `wt.player.volume`) e reaplicada quando o player fica pronto. O
  volume do app multiplica o volume de mídia do celular, que continua nos botões físicos.
- **Erros e carregamento** (2026-11-22): estados sobre o próprio vídeo (`PlayerStatusOverlay`),
  em pé e na tela cheia — carregando, "conexão lenta" após 8 s, e aviso de erro com título,
  mensagem, ações (tentar de novo / pular / abrir no YouTube) e o código pequeno
  (`src/lib/youtube/errors.ts`). Falha ao carregar a página do player vem de `onError`/`onHttpError`
  da WebView (`player_load_failed`, `player_http_<status>`). Erros inesperados do app caem na tela
  "Algo deu errado" (`ErrorBoundary` em `app/_layout.tsx`).

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
