# Watch Together

App Android para assistir vídeos do YouTube sincronizadamente com até 4 pessoas, em salas
privadas, com playlist compartilhada e chat.

**Stack:** Expo SDK 58 · React Native 0.88 · Expo Router · TypeScript · NativeWind 4 ·
Supabase (Auth, Postgres + RLS, Realtime) · YouTube IFrame Player API via WebView.

## Requisitos

- Node.js 20+ (testado com 24)
- App **Expo Go** (versão para SDK 58) em um aparelho Android, ou emulador Android

## Rodando

```bash
npm install
npm start          # escaneie o QR code com o Expo Go
npm run android    # abre no emulador/aparelho conectado
```

## Scripts

| Script              | O que faz                        |
| ------------------- | -------------------------------- |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm run lint`      | ESLint (config Expo + Prettier)  |
| `npm test`          | Jest (`jest-expo`)               |
| `npm run check`     | Tipos, lint, testes e player     |
| `npm run db:push`   | Aplica as migrations no Supabase |
| `npm run db:types`  | Regenera os tipos do banco       |
| `npm run format`    | Prettier                         |

## Variáveis de ambiente

Copie `.env.example` para `.env.local`. Apenas variáveis `EXPO_PUBLIC_*` com a chave
**publishable** do Supabase — nunca a `service_role`.

## Estrutura

```text
app/                 rotas (Expo Router) — só composição de telas
src/
  components/ui      componentes reutilizáveis (Button…)
  components/layout  Screen…
  features/          auth, rooms, player, playlist, participants, chat
  lib/               supabase/, youtube/
  constants/ hooks/ types/ utils/
supabase/migrations  migrations SQL
docs/adr/            decisões arquiteturais
```

## Etapas

Detalhes, decisões e critérios de validação em [docs/plano.md](docs/plano.md).

1. ✅ Fundação
2. ✅ Prova de conceito do player do YouTube (WebView)
3. ✅ Supabase: Auth, banco, RLS
4. Salas e presença
5. Sincronização de reprodução
6. Playlist
7. Chat
8. Finalização e build (APK/AAB)
