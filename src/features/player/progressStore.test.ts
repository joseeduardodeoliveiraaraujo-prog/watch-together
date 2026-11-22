import { createProgressStore, type PlayerProgress } from './progressStore';

const at = (currentTime: number, state: PlayerProgress['state'] = 'playing'): PlayerProgress => ({
  state,
  currentTime,
  duration: 200,
});

describe('createProgressStore', () => {
  it('avisa quem assina só quando o valor muda de verdade', () => {
    const store = createProgressStore();
    const listener = jest.fn();
    store.subscribe(listener);

    store.set(at(10));
    expect(listener).toHaveBeenCalledTimes(1);

    // Pausado: o player repete a mesma posição a cada status.
    store.set(at(10.05));
    store.set(at(10.1));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get().currentTime).toBe(10);

    store.set(at(10.5));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('mudança de estado ou de duração sempre avisa', () => {
    const store = createProgressStore();
    store.set(at(10));
    const listener = jest.fn();
    store.subscribe(listener);

    store.set(at(10, 'paused'));
    store.set({ ...at(10, 'paused'), duration: 300 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('para de avisar depois de cancelar a assinatura', () => {
    const store = createProgressStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set(at(50));
    expect(listener).not.toHaveBeenCalled();
  });
});
