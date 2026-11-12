# ADR 0002 — Estilização com NativeWind v4 (Tailwind 3)

- **Status:** aceito (revisar quando o NativeWind v5 for estável)
- **Data:** 2026-11-12

## Contexto

NativeWind está em transição: a v4 (`latest`, 4.2.7) usa Tailwind 3; a v5 (Tailwind 4) está em
release candidate e não é recomendada para produção.

## Decisão

Usar **NativeWind 4.2.7 + Tailwind 3.4**. Validado na Etapa 1 com SDK 58 / RN 0.88 / Reanimated 4.7:
`expo export --platform android` gera o bundle e as classes compiladas estão presentes.

- Paleta única em `src/constants/colors.json`, consumida pelo `tailwind.config.js` (classes como
  `bg-primary`) e pelo TypeScript (`src/constants/theme.ts`, tema do React Navigation).
- Componentes de terceiros que não aceitam `className` recebem `style` (ex.: insets da safe area).

## Alternativa (plano B)

Se surgirem problemas em runtime, migrar para `StyleSheet` + tokens de `colors.json`, sem nova
dependência. A troca é localizada: só os componentes de `src/components` e telas usam `className`.

## Consequências

- Migração futura para v5 exigirá trocar config (Metro/Babel/CSS) — tarefa isolada.
