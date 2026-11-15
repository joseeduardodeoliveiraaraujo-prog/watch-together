import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

import { useSession } from './SessionProvider';
import { normalizeDisplayName } from './validation';

export type Profile = Database['public']['Tables']['profiles']['Row'];

type LoadResult = {
  /** Identifica a carga (usuário + tentativa) a que este resultado pertence. */
  key: string;
  userId: string;
  profile: Profile | null;
  error: string | null;
};

/** Perfil do usuário logado: leitura e troca de apelido. */
export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);

  const key = `${userId}:${attempt}`;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setResult({
          key,
          userId,
          profile: data,
          error: error ? 'Não foi possível carregar seu perfil.' : null,
        });
      });
    return () => {
      active = false;
    };
  }, [key, userId]);

  const current = result?.userId === userId ? result : null;

  const updateDisplayName = async (name: string): Promise<string | null> => {
    if (!userId) return 'Sessão expirada. Entre novamente.';
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: normalizeDisplayName(name) })
      .eq('id', userId)
      .select()
      .single();
    if (error) return 'Não foi possível salvar o apelido.';
    setResult({ key, userId, profile: data, error: null });
    return null;
  };

  return {
    profile: current?.profile ?? null,
    isLoading: !!userId && current?.key !== key,
    error: current?.error ?? null,
    reload: () => setAttempt((n) => n + 1),
    updateDisplayName,
  };
}
