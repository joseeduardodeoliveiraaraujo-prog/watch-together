# ADR 0006 — Salas, convites e presença

- **Status:** aceito
- **Data:** 2026-11-15

## Decisões

**Salas** (`supabase/migrations/*_salas_e_presenca.sql`)

- Criar, entrar e sair só por funções no banco: `create_room`, `join_room(code)` e
  `leave_room(room_id)`. O app continua sem escrita direta nas tabelas.
- `join_room` trava a linha da sala (`for update`) antes de contar os membros. Assim duas entradas
  simultâneas nunca passam do limite de **4 pessoas**.
- Cada pessoa participa de no máximo **20 salas**.
- Ser **membro** é permanente até sair pela tela. Estar **online** é a presença em tempo real. A
  vaga de quem só fechou o app continua ocupada.
- O dono que sai passa a sala para o membro mais antigo. A sala sem membros é apagada.
- Erros de negócio chegam como mensagem curta (`room_full`, `room_not_found`, `too_many_rooms`) e
  são traduzidos em `src/features/rooms/roomErrors.ts`.

**Código de convite**

- 6 caracteres, sem os ambíguos 0/O e 1/I/L, gerados com aleatoriedade criptográfica
  (`gen_random_uuid`). São cerca de 887 milhões de combinações. O código funciona como senha da sala.
- O app aceita o código com espaços, hífen ou minúsculas, ou o link de convite inteiro.
- Convite pelo menu de compartilhar do celular, com o código e um link criado por
  `Linking.createURL`. No Expo Go o link é `exp://…`; no app instalado é `watchtogether://join/…`.

**Presença**

- Canal privado `room:<id>` do Supabase Realtime, autorizado por políticas em `realtime.messages`:
  só membros da sala recebem e enviam presença e broadcast. O mesmo canal será usado nas Etapas 5 e 7.
- Requer **"Allow public access" desligado** nas configurações de Realtime do projeto. Com ele
  ligado, as políticas de canal não são aplicadas.

## Pendências

- Link de convite aberto **sem login**: o app leva para a tela de entrar e o código se perde. A
  pessoa precisa digitar o código depois de entrar. Resolver na Etapa 8.
- Limpeza de salas inativas (proposta: 7 dias sem atividade, com `pg_cron`): adiada para a Etapa 8.
  `rooms.last_activity_at` já é atualizado.
- Membros que nunca saem ocupam vaga. Se incomodar, avaliar "remover participante" pelo dono.
