/**
 * Protocolo entre o app (React Native) e a página do player (WebView).
 *
 * App → página: `PlayerCommand`, executado via `injectJavaScript` em `window.__wt.handle(cmd)`.
 * Página → app: `PlayerEvent`, enviado via `window.ReactNativeWebView.postMessage(JSON)`.
 *
 * A página é propositalmente "burra": repassa os números crus da IFrame API e o app interpreta.
 */

export type PlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';

export type PlayerCommand =
  | { type: 'load'; videoId: string; startSeconds?: number; autoplay: boolean }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'seek'; seconds: number }
  | { type: 'mute'; muted: boolean };

export type PlayerEvent =
  /** Player criado e pronto para receber comandos. */
  | { type: 'ready' }
  | { type: 'stateChange'; state: PlayerState; currentTime: number; at: number }
  /** Enviado periodicamente (~500 ms) pela página. `at` = Date.now() no momento da leitura. */
  | {
      type: 'status';
      state: PlayerState;
      currentTime: number;
      duration: number;
      muted: boolean;
      at: number;
    }
  /** Erro da IFrame API (2, 5, 100, 101, 150, 152, 153…). */
  | { type: 'error'; code: number }
  /** O script da IFrame API não carregou (sem rede, bloqueio etc.). */
  | { type: 'apiLoadError' }
  | { type: 'log'; message: string };

const STATE_BY_CODE: Record<number, PlayerState> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued',
};

export function playerStateFromCode(code: unknown): PlayerState | null {
  return typeof code === 'number' ? (STATE_BY_CODE[code] ?? null) : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Valida e converte uma mensagem crua vinda da WebView.
 * Retorna `null` para qualquer coisa fora do protocolo (nunca confiar no conteúdo da página).
 */
export function parsePlayerEvent(raw: string): PlayerEvent | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;

  switch (msg.type) {
    case 'ready':
      return { type: 'ready' };
    case 'apiLoadError':
      return { type: 'apiLoadError' };
    case 'stateChange': {
      const state = playerStateFromCode(msg.state);
      if (!state || !isFiniteNumber(msg.currentTime) || !isFiniteNumber(msg.at)) return null;
      return { type: 'stateChange', state, currentTime: msg.currentTime, at: msg.at };
    }
    case 'status': {
      const state = playerStateFromCode(msg.state);
      if (
        !state ||
        !isFiniteNumber(msg.currentTime) ||
        !isFiniteNumber(msg.duration) ||
        !isFiniteNumber(msg.at)
      ) {
        return null;
      }
      return {
        type: 'status',
        state,
        currentTime: msg.currentTime,
        duration: msg.duration,
        muted: msg.muted === true,
        at: msg.at,
      };
    }
    case 'error':
      return isFiniteNumber(msg.code) ? { type: 'error', code: msg.code } : null;
    case 'log':
      return typeof msg.message === 'string'
        ? { type: 'log', message: msg.message.slice(0, 500) }
        : null;
    default:
      return null;
  }
}

/** Gera o JS injetado na WebView para executar um comando. */
export function commandToScript(command: PlayerCommand): string {
  // JSON é uma expressão JS válida; o `true;` final evita warnings no Android.
  return `window.__wt && window.__wt.handle(${JSON.stringify(command)}); true;`;
}
