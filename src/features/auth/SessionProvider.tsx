import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase/client';

type SessionContextValue = {
  session: Session | null;
  /** true até ler a sessão salva no aparelho (a splash fica visível enquanto isso). */
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    // Não chamar outras funções do Supabase com await dentro deste callback (pode travar).
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext value={{ session, isLoading }}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  return value;
}
