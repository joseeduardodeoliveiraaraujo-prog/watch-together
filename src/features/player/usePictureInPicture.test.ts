import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { usePictureInPicture } from './usePictureInPicture';

const pip = { active: false, listener: null as ((active: boolean) => void) | null };

jest.mock('@/modules/pip', () => ({
  isPictureInPictureSupported: () => true,
  isInPictureInPicture: () => pip.active,
  enterPictureInPicture: jest.fn(async () => true),
  setAutoEnterPictureInPicture: jest.fn(async () => {}),
  addPictureInPictureListener: (listener: (active: boolean) => void) => {
    pip.listener = listener;
    return { remove: () => (pip.listener = null) };
  },
}));

let appStateListener: ((state: AppStateStatus) => void) | null = null;

function setAppState(state: AppStateStatus) {
  Object.defineProperty(AppState, 'currentState', { value: state, configurable: true });
  appStateListener?.(state);
}

function setPip(active: boolean) {
  pip.active = active;
  pip.listener?.(active);
}

beforeEach(() => {
  jest.useFakeTimers();
  pip.active = false;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: () => (appStateListener = null) } as ReturnType<
      typeof AppState.addEventListener
    >;
  });
  setAppState('active');
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function setup() {
  const onHiddenChange = jest.fn();
  const hook = await renderHook(() => usePictureInPicture({ autoEnter: true, onHiddenChange }));
  onHiddenChange.mockClear();
  return { onHiddenChange, hook };
}

describe('usePictureInPicture', () => {
  it('saindo do app sem janelinha: o vídeo para (depois de esperar o aviso da janelinha)', async () => {
    const { onHiddenChange } = await setup();
    await act(async () => setAppState('background'));
    expect(onHiddenChange).not.toHaveBeenCalledWith(true);
    await act(async () => jest.advanceTimersByTime(1000));
    expect(onHiddenChange).toHaveBeenLastCalledWith(true);
  });

  it('indo para a janelinha: o vídeo continua e a sala mostra só o vídeo', async () => {
    const { onHiddenChange, hook } = await setup();
    await act(async () => {
      setAppState('background');
      setPip(true);
    });
    await act(async () => jest.advanceTimersByTime(1000));
    expect(onHiddenChange).not.toHaveBeenCalledWith(true);
    expect(hook.result.current.active).toBe(true);
  });

  it('fechando a janelinha no X: para; voltando ao app: segue a sala de novo', async () => {
    const { onHiddenChange } = await setup();
    await act(async () => {
      setAppState('background');
      setPip(true);
    });
    await act(async () => setPip(false));
    await act(async () => jest.advanceTimersByTime(1000));
    expect(onHiddenChange).toHaveBeenLastCalledWith(true);

    await act(async () => setAppState('active'));
    expect(onHiddenChange).toHaveBeenLastCalledWith(false);
  });

  it('abrindo a janelinha de volta em tela: não chega a parar', async () => {
    const { onHiddenChange } = await setup();
    await act(async () => {
      setAppState('background');
      setPip(true);
    });
    await act(async () => {
      setPip(false);
      setAppState('active');
    });
    await act(async () => jest.advanceTimersByTime(1000));
    expect(onHiddenChange).not.toHaveBeenCalledWith(true);
  });
});
