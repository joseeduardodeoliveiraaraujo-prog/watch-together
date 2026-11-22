# ADR 0011 — Navegador do YouTube dentro da sala

- **Status:** aceito
- **Data:** 2026-11-20

## Contexto

Até aqui, para pôr um vídeo na fila era preciso copiar o link no app do YouTube e colar na aba
Fila. A ideia (no estilo do app Hearo) é navegar pelo YouTube sem sair da sala e escolher o vídeo
ali mesmo.

## Decisão

- **O site mobile do YouTube (`m.youtube.com`) numa WebView**, aberto pelo botão "Buscar no
  YouTube" da aba Fila. Voltar não recarrega nada.
- **Camada da sala com miniplayer** (2026-11-22; antes era a rota `app/room/[id]/youtube.tsx`):
  o navegador abre por cima da `RoomScreen`, e o mesmo player da sala vira um miniplayer
  flutuante 16:9 num canto (`useMiniPlayer`, `miniPlayerLayout.ts`). Dá para arrastar, ele gruda
  no canto mais próximo, e um toque volta para a sala. Como rota separada, a sala ficava escondida
  por baixo e o vídeo só se ouvia. O player não muda de lugar na árvore (só de estilo), então não
  recarrega. A janelinha do Android (ADR 0013) não serviria aqui: ela encolhe o app inteiro,
  navegador junto.
- **Toque num vídeo abre direto o menu do app** ("Adicionar à fila" / "Tocar agora"), com
  miniatura, título e canal (oEmbed). "Tocar agora" adiciona, toca para a sala e volta para a sala.
  Não há prévia do vídeo dentro do navegador.
- **Interceptação em duas camadas** (`src/lib/youtube/browser.ts`):
  1. script injetado escuta cliques em links de vídeo (`/watch`, `/shorts`, `/live`, `youtu.be`)
     na fase de captura, cancela a abertura e manda o link ao app;
  2. rede de segurança: o script avisa cada mudança de endereço (history API + conferência
     periódica). Se a página de um vídeo abrir mesmo assim, o app volta (`history.back()`) e abre o
     menu.
- **Nenhum vídeo toca no navegador:** o script pausa e silencia qualquer mídia que comece a tocar,
  para não misturar com o som da sala.
- **Segurança:** o ID do vídeo sempre passa pelo parser do app (`extractYouTubeVideoId`); mensagens
  da página só valem se vierem de um domínio do YouTube e são validadas
  (`parseBrowserMessage`). Só domínios do YouTube abrem na WebView; outros sites vão para o
  navegador do celular e esquemas de app (`intent:`, `vnd.youtube:`) são bloqueados.
- **Fila:** o navegador busca a fila por conta própria para o contador, o aviso de fila cheia e o
  "já está na fila". `add_to_playlist` já devolvia o item; `addToPlaylist` passou a retornar o id.

## Alternativas descartadas

- **Busca pela YouTube Data API** com resultados desenhados pelo app: oficial e estável, mas exige
  chave, a cota gratuita dá ~100 buscas/dia para o app inteiro e não é "navegar". Fica como plano B
  se a interceptação no site parar de funcionar.
- **Abrir a página do vídeo como prévia** com botão "Adicionar" fixo: o vídeo tocaria dentro do
  navegador junto com a sala. O usuário preferiu o menu direto.

## Riscos aceitos

- **Sem login no Google:** o Google bloqueia login em WebView. Sem conta não há inscrições,
  histórico nem recomendações, e a home pode vir vazia; a busca funciona. Não vamos disfarçar a
  WebView de navegador para burlar isso (viola a política do Google).
- **O site muda:** se o YouTube trocar o formato dos links ou a navegação, a camada 1 pode falhar;
  a camada 2 reduz o impacto. Os testes de `browser.test.ts` cobrem o lado do app.
- **Termos do YouTube:** exibir o site numa WebView é o que navegadores e apps como Hearo/Rave
  fazem, mas cancelar cliques e pausar a mídia é modificar a página — ponto mais sensível.
- **Memória:** duas WebViews abertas (player + navegador). Se o Android matar uma delas, as duas
  recarregam sozinhas (`onRenderProcessGone`).

## Validação

Teste em aparelho real em 2026-11-20: tela, interceptação do toque, "Adicionar à fila", "Tocar
agora" e acabamento visual aprovados pelo usuário.
