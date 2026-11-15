import { useCallback, useEffect, useState } from 'react';

type Result<T> = { key: string; data: T | null; error: unknown };

/**
 * Carrega dados assíncronos ligados a uma chave. Trocar a chave ou chamar `reload` busca de novo;
 * os dados anteriores continuam visíveis enquanto a nova busca não termina.
 * `key` null = não buscar (ex.: sem usuário).
 */
export function useAsyncData<T>(key: string | null, fetcher: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const requestKey = key === null ? null : `${key}#${attempt}`;
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (requestKey === null) return;
    let active = true;
    fetcher().then(
      (data) => active && setResult({ key: requestKey, data, error: null }),
      (error: unknown) => active && setResult({ key: requestKey, data: null, error }),
    );
    return () => {
      active = false;
    };
    // `fetcher` muda a cada render; a chave é quem decide quando buscar de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const sameKey = result !== null && key !== null && result.key.startsWith(`${key}#`);

  return {
    data: sameKey ? result.data : null,
    error: result?.key === requestKey ? result.error : null,
    isLoading: requestKey !== null && result?.key !== requestKey,
    /** true só na primeira carga (sem dados anteriores para mostrar). */
    isFirstLoad: requestKey !== null && !sameKey,
    reload,
  };
}
