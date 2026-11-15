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

/** Projeto Supabase. A chave publishable é pública por design; a segurança vem do RLS. */
export const SUPABASE_URL =
  normalizeUrl(process.env.EXPO_PUBLIC_SUPABASE_URL)?.replace(/\/$/, '') ?? null;
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || null;
