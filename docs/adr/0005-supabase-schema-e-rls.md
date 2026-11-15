# ADR 0005 — Supabase: autenticação, schema e regras de acesso

- **Status:** aceito
- **Data:** 2026-11-14

## Contexto

O app usa só a chave _publishable_ do Supabase, que é pública. Toda a segurança dos dados vem das
regras de acesso no banco (RLS e GRANTs).

## Decisões

**Autenticação**

- E-mail e senha (Supabase Auth). Senha com no mínimo 8 caracteres, validada também no app.
- Sessão salva no aparelho com `expo-sqlite/localStorage`, como no guia do Expo para Supabase
  (funciona no Expo Go). Renovação do token só com o app em primeiro plano (`AppState`).
- Rotas protegidas com `Stack.Protected` em `app/_layout.tsx`. A splash fica visível até a sessão
  salva ser lida. Isso é só navegação; quem protege os dados é o RLS.
- Confirmação de e-mail **desligada durante o desenvolvimento**. Decidir na Etapa 8 (link ou
  código). O cadastro já trata o caso de confirmação ligada (mostra aviso em vez de entrar).

**Banco** (`supabase/migrations/`, aplicado com `npm run db:push`)

- Tabelas: `profiles`, `rooms`, `room_members`, `playlist_items`, `playback_state`.
- `profiles` é criado por trigger no cadastro, com o apelido de `options.data.display_name`.
- Projeto criado com **"Automatically expose new tables" desligado** e **RLS automático ligado**.
  Por isso toda migration declara GRANTs explícitos.
- O app **só lê** salas, membros, playlist e reprodução. Escritas serão feitas por funções (RPC)
  nas Etapas 4 a 6, com trava e validação. A única escrita direta é `profiles.display_name`.
- `anon` (usuário sem login) não tem acesso a nenhuma tabela.
- Funções auxiliares de RLS (`is_room_member`, `shares_room_with`) ficam no schema `private`, que
  a Data API não expõe. São `security definer` para evitar recursão de RLS em `room_members`.
- Um usuário vê o próprio perfil e o de quem está em alguma sala com ele.

**Tipos**

- `src/lib/supabase/database.types.ts` é gerado com `npm run db:types` após cada migration.

## Consequências

- Esquecer um GRANT em uma tabela nova resulta em erro `42501`, nunca em dado exposto.
- Chat ao vivo (Etapa 7) usa Realtime Broadcast e não precisa de tabela.
