# ADR 0008 — Playlist compartilhada

- **Status:** aceito
- **Data:** 2026-11-15

## Decisões

**Modelo da fila**

- `playlist_items` guarda o vídeo atual (`playback_state.current_item_id`) e os próximos.
  "Próximo" = item de menor `position`, sem contar o atual.
- O vídeo que **termina** sai da fila; a fila funciona como "a seguir", sem histórico.
- Tocar outro vídeo pelo botão ▶ **não** remove o atual, que continua na fila.
- Adicionar com nada tocando começa a tocar na hora.
- Limite de **50 vídeos** por sala.
- Todos os membros adicionam, removem, reordenam e escolhem o que tocar. Reordenar é feito com
  botões ↑/↓, mais simples e acessível que arrastar; arrastar pode vir depois.

**Funções no banco** (`supabase/migrations/*_playlist.sql`)

- `add_to_playlist`, `remove_from_playlist`, `move_playlist_item`, `play_item` e
  `advance_to_next`. Todas travam a linha de `playback_state` da sala, a mesma trava de
  `playback_command`: fila e reprodução nunca mudam ao mesmo tempo.
- `advance_to_next(room, from_item, reason)` é **idempotente**: todos os celulares avisam o fim do
  vídeo, mas só o primeiro aviso para o item atual avança. Os outros encontram outro item atual e não
  fazem nada.
- `reason = 'error'` é usado quando o player recebe 100/101/150 (vídeo removido, privado ou com
  incorporação proibida). A sala mostra "Um vídeo indisponível foi pulado".
- `playback_state.last_action` registra a última ação (`play`, `pause`, `seek`, `play_item`,
  `next`, `skip_error`, `stop`…) para o app mostrar "Ana pausou" ou "Próximo vídeo da fila".
- Mudanças na fila vão pelo canal `room:<id>` (evento `playlist`). O app recarrega a lista ao
  receber, o que é simples e suficiente para até 50 itens.

**Título e miniatura**

- O título vem do oEmbed público do YouTube, sem chave de API, e é buscado no celular antes de
  adicionar. O oEmbed também recusa vídeos com incorporação proibida (401/403) ou inexistentes
  (404). Nesses casos o app avisa e não adiciona.
- Se o oEmbed falhar (rede), o vídeo entra sem título. O player ainda pula se não puder tocar.
- O título vem do celular e é tratado como texto não confiável: o banco limita a 200 caracteres e o
  app só o exibe como texto.
- Miniatura: URL pública `i.ytimg.com/vi/<id>/mqdefault.jpg`, sem armazenar.

## Consequências

- Um celular adiantado (até 1,5 s, a tolerância da sincronização) pode avançar a fila para todos um
  pouco antes do fim nos outros.
- O formulário "Tocar vídeo para todos" da Etapa 5 foi substituído pela fila. A ação `load` de
  `playback_command` continua existindo, mas o app não a usa mais.

## Validação (2026-11-15)

- Banco real: 19 verificações (ordem, reordenar, fim simultâneo avança uma vez, pular indisponível,
  remover o atual, limite de 50, acesso de quem é de fora, eventos no canal).
- 2 celulares Android via Expo Go: fila sincronizada e avanço automático funcionando.
- Anúncios: ainda não observados.
