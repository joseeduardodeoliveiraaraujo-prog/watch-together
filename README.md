# Watch Together

App Android para assistir vídeos do YouTube em sincronia com até 4 pessoas, em salas privadas,
com fila compartilhada e chat ao vivo.

**Stack:** Expo SDK 58 · React Native 0.88 · Expo Router · TypeScript · NativeWind 4 ·
Supabase (Auth, Postgres + RLS, Realtime) · YouTube IFrame Player API via WebView.

## O que o app faz

- **Conta:** e-mail e senha, "esqueci a senha" com código por e-mail, trocar senha e apelido no
  perfil.
- **Salas:** criar ou entrar por código (até 4 pessoas), convite por link, quem está online.
- **Player sincronizado:** play, pause e busca valem para a sala toda; tela cheia com controles no
  estilo do YouTube e legendas (escolha de cada um).
- **Fila:** todos adicionam (colando link ou navegando pelo YouTube dentro do app), reordenam,
  removem e escolhem o que tocar; avança sozinha no fim do vídeo.
- **Chat ao vivo:** só enquanto a sala está aberta, nada fica salvo.

## Requisitos

- Node.js 20+ (testado com 24)
- App **Expo Go** (versão para SDK 58) em um aparelho Android, ou emulador Android
- Projeto no Supabase e a página do player publicada (ver "Serviços externos")

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm start                    # escaneie o QR code com o Expo Go
```

No Expo Go o ícone e a splash são os do Expo e as fontes são carregadas ao abrir; num build
(`eas build`) tudo vem embutido.

## Scripts

| Script                  | O que faz                                                       |
| ----------------------- | --------------------------------------------------------------- |
| `npm run check`         | Tipos, lint, testes e página do player — rode antes de commitar |
| `npm run typecheck`     | `tsc --noEmit`                                                  |
| `npm run lint`          | ESLint (config Expo + Prettier)                                 |
| `npm test`              | Jest (`jest-expo`)                                              |
| `npm run format`        | Prettier                                                        |
| `npm run build:player`  | Gera `web/player/index.html` a partir de `playerHtml.ts`        |
| `npm run deploy:player` | Gera e publica a página do player na Vercel                     |
| `npm run db:push`       | Aplica as migrations no Supabase                                |
| `npm run db:types`      | Regenera os tipos do banco                                      |

## Variáveis de ambiente

Copie `.env.example` para `.env.local`. Só variáveis `EXPO_PUBLIC_*`, com a chave **publishable**
do Supabase — nunca a `service_role`.

## Serviços externos

| Serviço  | Para quê                                   | Onde configurar                                                                                 |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Supabase | Conta, banco, tempo real                   | `npm run db:push` para o banco; painel para Auth                                                |
| Vercel   | Página do player (`web/player`, ADR 0004)  | `npm run deploy:player` sempre que `src/lib/youtube/playerHtml.ts` mudar                        |
| Brevo    | SMTP dos e-mails de recuperação (ADR 0012) | Painel do Supabase → Authentication → Emails (SMTP e modelo `supabase/templates/recovery.html`) |

Não use `supabase config push`: o `config.toml` tem valores só do ambiente local e sobrescreveria o
projeto hospedado.

## Estrutura

```text
app/                 rotas (Expo Router) — só composição de telas
src/
  components/ui      componentes reutilizáveis (Button, TextField, Dialog…)
  components/layout  Screen, FormScreen, AppHeader
  features/          auth, rooms, player, playlist, chat, browse (navegador do YouTube)
  lib/               supabase/, youtube/ (player, ponte, navegador)
  constants/ hooks/
supabase/            migrations SQL e modelo de e-mail
web/player/          página do player publicada na Vercel (gerada)
design/              telas e ícone no Pencil (.pen)
docs/adr/            decisões de arquitetura (índice em docs/adr/README.md)
```

## Etapas

Detalhes e critérios de validação em [docs/plano.md](docs/plano.md).

1. ✅ Fundação
2. ✅ Prova de conceito do player do YouTube (WebView)
3. ✅ Supabase: Auth, banco, RLS
4. ✅ Salas e presença
5. ✅ Sincronização de reprodução
6. ✅ Playlist
7. ✅ Chat
8. Finalização e build (APK para os amigos) — em andamento
