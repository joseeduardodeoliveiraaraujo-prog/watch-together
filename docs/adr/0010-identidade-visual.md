# ADR 0010 — Identidade visual (paleta Midnight Violet)

- **Status:** aceito
- **Data:** 2026-11-19

## Contexto

As telas foram desenhadas no Pencil (`design/watch-together.pen`) e cinco paletas foram
comparadas lado a lado (tema `paleta` nas variáveis do design). A escolhida foi a
**Midnight Violet**.

## Decisão

- **Cores:** `src/constants/colors.json` recebe os valores da Midnight Violet (fundo `#0F0F17`,
  surface `#1D1B2F`, primária `#8B5CF6`, accent `#C4B5FD`, texto `#F4F1FA`) e os tons de apoio
  do design (`subtle`, `faint`, `accent-text`, gradiente da marca, `card-tint`, cores das
  pessoas). Transparências usam o modificador do Tailwind (`bg-primary/15`), não tokens novos.
- **Cor de cada pessoa:** a vaga na ordem de entrada define a cor (roxo, verde, laranja, azul) —
  `src/features/rooms/memberColors.ts`. Vale para avatares e nomes no chat.
- **Fontes:** Plus Jakarta Sans (texto) e JetBrains Mono (códigos de sala, tempo do vídeo), via
  `@expo-google-fonts/*`. Nos builds vêm embutidas pelo plugin do `expo-font` (`app.json`); só o
  Expo Go as carrega ao abrir, em `app/_layout.tsx`, com a splash na tela (2026-11-22).
  O Android não sintetiza pesos de fontes carregadas, então cada peso é uma família:
  `font-sans`, `font-medium`, `font-semibold`, `font-bold`, `font-extrabold`, `font-mono`,
  `font-mono-bold` (`src/constants/fonts.json`). O plugin `fontWeight` do Tailwind fica
  desligado para essas classes não colidirem. Todo `<Text>` precisa de uma classe de fonte.
- **Ícones:** Feather (`@expo/vector-icons`), a mesma família de traço usada no design.
- **Gradientes e sombras:** `backgroundImage` e `boxShadow` nativos do React Native (nova
  arquitetura), sem biblioteca extra.
- **Cabeçalhos:** as telas desenham o próprio cabeçalho (`AppHeader`); o do React Navigation fica
  desligado.

## Consequências

- Trocar a paleta no futuro = editar `colors.json` (e o `app.json`, que repete o fundo para a
  splash e o ícone adaptativo).
- Pacotes novos: `expo-font`, `expo-asset`, `@expo/vector-icons`, `@expo-google-fonts/*`,
  `expo-clipboard` (copiar o código da sala). Todos estão no Expo Go.
