# Plano de desenvolvimento — Etapas 3 a 8

Atualizado em 2026-11-15. Etapas 1 (Fundação), 2 (POC do player) e 3 (Supabase) concluídas.

Cada etapa termina com: `npm run check` passando, critérios de validação testados no celular,
README/ADR atualizados e um commit.

## Decisões de produto

| Tema              | Decisão                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| Login             | E-mail e senha (Supabase Auth). Google pode entrar depois da Etapa 8.    |
| Tamanho da sala   | Até 4 pessoas.                                                           |
| Controle do vídeo | Todos na sala podem dar play, pause, seek e pular.                       |
| Playlist          | Todos adicionam, removem e reordenam.                                    |
| Chat              | Só ao vivo: nada é salvo no banco; quem entra depois não vê o histórico. |
| Player            | Página hospedada na Vercel (ADR 0004).                                   |

## Decisões técnicas (já aprovadas)

- O estado da reprodução é a **fonte da verdade no Postgres**. Todo comando passa pela função
  `playback_command`, que usa `version` (rejeita comandos baseados em estado antigo) e
  `command_id` (ignora o mesmo comando repetido).
- Mudanças chegam aos celulares por `realtime.broadcast_changes` no canal privado `room:{id}`.
- Relógio: o app calcula a diferença para o servidor com a função `server_now()`.
- Correção de atraso: diferença menor que 0,5 s é ignorada; maior que 1,5 s é corrigida com seek.
- `advance_to_next` idempotente: se dois celulares avisam o fim do vídeo, só avança uma vez.
- Operações de sala e playlist via funções no banco (RPC) com trava, nunca escrita direta.
- `controls=0` no player; os controles ficam abaixo do vídeo, no app.

---

## Etapa 3 — Supabase: conta, banco e segurança

**Objetivo:** criar conta, entrar, sair, e ter o banco pronto com regras de acesso.

**Você faz:** criar o projeto em supabase.com (plano gratuito, região São Paulo) e me passar a
URL e a chave _publishable_ para o `.env.local`.

**Entregas:**

- Supabase CLI no projeto; banco versionado em `supabase/migrations/`.
- Tabelas: `profiles` (apelido), `rooms` (código de convite, dono), `room_members`,
  `playback_state`, `playlist_items`. Sem tabela de chat.
- RLS em todas as tabelas: só membros da sala leem dados dela; ninguém escreve direto nas tabelas
  de sala (só via funções da Etapa 4 em diante).
- Cliente Supabase em `src/lib/supabase/`, com sessão salva no aparelho.
- Telas: entrar, criar conta (e-mail, senha, apelido), perfil (editar apelido, sair).
- Home e demais rotas protegidas: sem sessão, vai para a tela de entrar.
- Testes das regras de RLS em SQL (usuário de fora não lê sala alheia).

**Ponto de atenção:** a confirmação de e-mail do Supabase manda um link que precisa voltar para o
app. Proposta: desligar a confirmação durante o desenvolvimento e decidir na Etapa 8 (link ou
código de 6 dígitos).

**Validação:** criar conta, fechar o app, abrir de novo e continuar logado; sair; senha errada
mostra mensagem em português.

## Etapa 4 — Salas e presença

**Objetivo:** criar uma sala, convidar amigos e ver quem está nela.

**Entregas:**

- Funções `create_room` (gera código de 6 caracteres), `join_room` (recusa a 5ª pessoa, com
  trava contra duas entradas simultâneas) e `leave_room`.
- Home: botão "Criar sala", campo "Entrar com código", lista das salas recentes.
- Convite: compartilhar link `watchtogether://join/CODIGO` pelo menu de compartilhar do celular.
- Tela da sala (`/room/[id]`) com o player e a lista de participantes.
- Presença em tempo real (Supabase Realtime Presence): quem está online agora.
- Se o dono sair, a sala passa para outra pessoa; sala vazia é apagada.

**A decidir nesta etapa:** apagar salas sem atividade depois de quanto tempo (proposta: 7 dias).

**Validação:** dois celulares (ou celular + emulador) na mesma sala; a 5ª entrada é recusada;
fechar o app de um tira ele da lista de online em poucos segundos.

## Etapa 5 — Sincronização da reprodução

**Objetivo:** todos assistem o mesmo ponto do vídeo ao mesmo tempo. É a etapa central e a mais
arriscada.

**Entregas:**

- Funções `playback_command` e `server_now`; canal privado `room:{id}` com autorização por RLS.
- Lógica de sincronização em `src/features/player/` como funções puras (testáveis sem celular):
  cálculo da posição esperada, decisão de corrigir ou não, ordem de comandos.
- Controles próprios abaixo do vídeo: play/pause, −10 s/+10 s, barra de progresso.
- Reconexão: ao voltar do segundo plano ou perder a internet, busca o estado atual e corrige.
- Anúncios: quem está vendo anúncio não força os outros a esperar; ao acabar, corrige a posição.
- Tela cheia em paisagem com `expo-screen-orientation` (adiada da Etapa 2).
- Remoção da tela de teste `app/poc/` e do botão na home.

**Validação:** dois celulares com diferença menor que 1 s após play, pause e seek; um celular
sem internet por 30 s volta sincronizado; comandos simultâneos dos dois não deixam estados
diferentes.

## Etapa 6 — Playlist

**Objetivo:** fila de vídeos compartilhada.

**Entregas:**

- Adicionar por link (reaproveita `extractYouTubeVideoId`); título e miniatura buscados no
  oEmbed do YouTube, sem chave de API.
- Remover, reordenar (arrastar) e tocar um item específico.
- `advance_to_next` ao fim do vídeo; vídeo bloqueado (erro 100/101/150) pula sozinho com aviso.
- Limite de itens por sala (proposta: 50).

**Validação:** dois celulares veem a mesma fila na hora; fim do vídeo avança uma única vez;
link inválido e vídeo bloqueado mostram mensagem clara.

## Etapa 7 — Chat ao vivo

**Objetivo:** conversar durante o vídeo.

**Entregas:**

- Mensagens por Realtime **Broadcast** no canal da sala, sem salvar no banco.
- Painel de chat na sala (abaixo do player em pé; sobreposto em tela cheia).
- Limite de tamanho da mensagem e de envio rápido (anti-spam simples).
- Avisos automáticos no chat: "Fulano entrou", "Fulano adicionou um vídeo".

**Consequência da decisão "só ao vivo":** quem fecha o app ou entra depois não vê mensagens
anteriores. Isso é esperado.

**Validação:** mensagem aparece no outro celular em menos de 1 s; quem entra depois começa com o
chat vazio.

## Etapa 8 — Finalização e build

**Objetivo:** app instalável para os amigos.

**Entregas:**

- Ícone, splash screen, nome e cores finais.
- Revisão de erros e estados vazios em todas as telas; teste com internet ruim.
- Confirmação de e-mail e "esqueci minha senha".
- Build Android com EAS (APK para instalar direto; AAB se for para a Play Store).
- Política de privacidade simples (exigida pela Play Store).
- Se o app virar comercial: mover o player da Vercel para Cloudflare Pages (ADR 0004).

**Validação:** APK instalado em um celular sem Expo Go; fluxo completo com 2 a 4 pessoas.

---

## Riscos conhecidos

| Risco                                                | Plano                                                    |
| ---------------------------------------------------- | -------------------------------------------------------- |
| YouTube mudar regras de embed (erro 153 de novo)     | Página hospedada pode ser corrigida sem atualizar o app. |
| Limites do plano gratuito do Supabase (Realtime)     | Até 4 pessoas por sala fica muito abaixo dos limites.    |
| Android matar o app em segundo plano durante o vídeo | Reconexão da Etapa 5 recupera o estado ao voltar.        |
| Anúncios diferentes para cada pessoa                 | Tratamento específico na Etapa 5.                        |
