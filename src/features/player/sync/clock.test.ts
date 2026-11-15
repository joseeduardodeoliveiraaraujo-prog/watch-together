import { bestOffset, sampleOffset } from './clock';

describe('relógio', () => {
  it('estima a diferença pelo meio da ida e volta', () => {
    // Celular 2 s atrasado; ida e volta de 200 ms.
    expect(sampleOffset({ sentAt: 1000, serverTime: 3100, receivedAt: 1200 })).toBe(2000);
  });

  it('prefere a amostra mais rápida', () => {
    const samples = [
      { sentAt: 0, serverTime: 2900, receivedAt: 1000 }, // lenta: estimativa ruim
      { sentAt: 2000, serverTime: 4050, receivedAt: 2100 }, // rápida
    ];
    expect(bestOffset(samples)).toBe(2000);
  });

  it('sem amostras válidas devolve null', () => {
    expect(bestOffset([])).toBeNull();
    expect(bestOffset([{ sentAt: 10, serverTime: 0, receivedAt: 5 }])).toBeNull();
  });
});
