# ADR 0007 — Sincronização da reprodução

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto

Até 4 pessoas assistem ao mesmo vídeo, cada uma num player do YouTube independente (WebView), e
qualquer uma pode dar play, pausar ou mudar a posição.

## Decisões

**Fonte da verdade no banco**

- `playback_state` guarda um estado **absoluto**: vídeo, tocando ou não, posição e o instante
  (relógio do servidor) em que essa posição valia. Posição esperada agora =
  `posição + (agora − instante)` se tocando.
- Todo comando passa por `playback_command(room, command_id, action, position?, video_id?)`, com
  ações `play`, `pause`, `seek` e `load`. A função trava a linha, valida se é membro e incrementa
  `version`.
- `command_id` (UUID gerado no celular) torna a retentativa segura: o mesmo comando não é aplicado
  duas vezes.
- **Mudança em relação ao plano:** `version` serve para **ordenar** estados no app (estado com
  versão menor é ignorado), não para recusar comandos. Como os comandos são absolutos ("pausar em
  1:23"), aplicar sobre um estado mais novo é o comportamento esperado. Recusar só faria o botão
  falhar quando duas pessoas clicam juntas.
- Mudanças chegam aos membros por `realtime.broadcast_changes` no canal privado `room:<id>` (evento
  `playback_state`), disparado por trigger. Ao (re)conectar o canal ou voltar do segundo plano, o app
  busca o estado atual, para não depender de não ter perdido mensagens.

**Relógio**

- `server_now()` é chamado 3 vezes; vale a amostra com menor tempo de ida e volta.
  `offset = servidor − (envio + resposta) / 2`. É refeito ao voltar do segundo plano.

**Correção no app** (`src/features/player/sync/decideSync.ts`, funções puras com testes)

- Vídeo diferente: carrega no ponto esperado.
- Tocando: diferença até 1,5 s é ignorada; acima disso, seek.
- Pausado: para exatamente no ponto (seek se a diferença passar de 0,5 s).
- Não corrige durante buffering nem por 2,5 s após uma correção, para evitar ciclos de seek.
- Vídeo terminado fica parado. Avançar na fila é da Etapa 6.
- Comandos do próprio usuário são aplicados na hora (previsão) e confirmados pela RPC. Em caso de
  erro, volta ao último estado confirmado.
- O player local é sempre corrigido para o estado da sala. Pausar tocando no vídeo é desfeito em
  segundos; para pausar para todos, use os controles do app.

**Tela cheia**

- `expo-screen-orientation` trava em paisagem enquanto ativa e volta a retrato ao sair. Barra de
  status e de navegação são escondidas. O botão voltar do Android sai da tela cheia.
- O player nunca muda de lugar na árvore de componentes, então alternar a tela cheia não recarrega o
  vídeo.

## Validação (2026-11-15)

- Testado em 2 celulares Android via Expo Go: play, pause, seek, troca de vídeo e presença
  sincronizados.
- Tela cheia: o giro para paisagem funciona mesmo com `orientation: portrait` no `app.json`.
- **Anúncios: ainda não observados.** Durante um anúncio o player pode reportar estados e tempos do
  anúncio, e o app pode tentar corrigir a posição. Observar nos próximos testes.
