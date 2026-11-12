# ADR 0003 — Estrutura de pastas e rotas

- **Status:** aceito
- **Data:** 2026-11-12

## Decisão

- **Rotas em `app/` na raiz** (como no plano aprovado). O template do SDK 58 usa `src/app/`; o
  Expo Router suporta ambos. Mantemos `app/` só com composição de telas, e todo o resto em `src/`.
- Arquitetura por funcionalidade em `src/features/<feature>` (auth, rooms, player, playlist,
  participants, chat). Features não importam umas das outras; o que for compartilhado sobe para
  `src/components`, `src/hooks`, `src/lib` ou `src/utils`.
- Integrações externas em `src/lib` (`supabase/`, `youtube/`).
- Alias `@/*` → `src/*`.

## Grupos de rota

| Rota                   | Arquivo                 | Observação                                      |
| ---------------------- | ----------------------- | ----------------------------------------------- |
| `/`                    | `app/(app)/index.tsx`   | Home (protegida por sessão a partir da Etapa 3) |
| `/profile`             | `app/(app)/profile.tsx` |                                                 |
| `/sign-in`, `/sign-up` | `app/(auth)/*`          |                                                 |
| `/room/:id`            | `app/room/[id].tsx`     | Composição da sala                              |
| `/join/:code`          | `app/join/[code].tsx`   | Destino de `watchtogether://join/CODIGO`        |
