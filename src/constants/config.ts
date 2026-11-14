/**
 * Configuração pública do app (variáveis EXPO_PUBLIC_* são embutidas no bundle — nada secreto aqui).
 * O Expo só substitui `process.env.EXPO_PUBLIC_X` quando acessado literalmente assim.
 */

function normalizeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^https:\/\/[^/\s]+/i.test(trimmed)) return null;
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/** URL da página do player hospedada (ex.: https://watch-together-player.vercel.app/). */
export const PLAYER_URL = normalizeUrl(process.env.EXPO_PUBLIC_PLAYER_URL);
