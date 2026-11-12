# ADR 0001 — Stack base e versões

- **Status:** aceito
- **Data:** 2026-11-12

## Contexto

O app é Android-only, desenvolvido com Expo. O Expo Go só executa o SDK mais recente, então a
versão escolhida no início precisa ser a atual e deve ficar fixa durante as etapas.

## Decisão

| Pacote         | Versão                               |
| -------------- | ------------------------------------ |
| Expo SDK       | 58 (`expo ~58.0.24`)                 |
| React Native   | 0.88.1                               |
| React          | 19.3.0                               |
| Expo Router    | ~58.0.31 (typed routes ligado)       |
| TypeScript     | ~6.0 (`strict`)                      |
| React Compiler | ligado (`experiments.reactCompiler`) |

- Projeto gerado com `create-expo-app --template default@sdk-58` e limpo dos exemplos.
- Removidos pacotes sem uso: `@expo/ui`, `expo-symbols`, `expo-glass-effect`, `expo-device`,
  `expo-web-browser`, `expo-font`, `react-native-web`.
- `react-dom@19.3.0` **foi mantido**: o expo-router depende de `@radix-ui` (abas web) e, sem ele
  fixado, o npm tenta instalar `react-dom@19.3.1`, que conflita com `react@19.3.0`.
- `babel-preset-expo` é dependência explícita, pois há `babel.config.js` customizado (NativeWind).
- Pacotes devem ser adicionados com `npx expo install` para manter compatibilidade com o SDK.

## Consequências

- TypeScript 6 não inclui `@types/*` automaticamente: tipos globais vão em `compilerOptions.types`.
- Atualizações de SDK são uma tarefa dedicada (`npx expo install --fix` + `npx expo-doctor`).
