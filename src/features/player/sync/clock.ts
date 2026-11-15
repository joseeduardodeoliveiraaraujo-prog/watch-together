/**
 * Diferença entre o relógio do servidor e o do celular.
 * Cada amostra: o app anota a hora local antes (t0) e depois (t1) de perguntar a hora ao servidor.
 * Supondo ida e volta simétricas, o servidor respondeu no meio: offset = servidor − (t0 + t1) / 2.
 */
export type ClockSample = { sentAt: number; serverTime: number; receivedAt: number };

export function sampleOffset({ sentAt, serverTime, receivedAt }: ClockSample): number {
  return serverTime - (sentAt + receivedAt) / 2;
}

/** Usa a amostra de menor tempo de ida e volta (a menos afetada por atraso de rede). */
export function bestOffset(samples: readonly ClockSample[]): number | null {
  let best: ClockSample | null = null;
  for (const sample of samples) {
    const rtt = sample.receivedAt - sample.sentAt;
    if (rtt < 0) continue;
    if (!best || rtt < best.receivedAt - best.sentAt) best = sample;
  }
  return best ? sampleOffset(best) : null;
}
