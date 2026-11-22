import {
  cornerForRelease,
  cornerPosition,
  miniPlayerSize,
  type MiniPlayerArea,
} from './miniPlayerLayout';

const area: MiniPlayerArea = {
  screen: { width: 400, height: 800 },
  size: { width: 184, height: 104 },
  insets: { top: 100, bottom: 20, left: 12, right: 12 },
};

describe('miniPlayerLayout', () => {
  it('tamanho 16:9, com limite em telas largas', () => {
    expect(miniPlayerSize(400)).toEqual({ width: 184, height: 104 });
    expect(miniPlayerSize(1000).width).toBe(240);
  });

  it('cantos respeitam as bordas livres', () => {
    expect(cornerPosition('top-left', area)).toEqual({ x: 12, y: 100 });
    expect(cornerPosition('bottom-right', area)).toEqual({ x: 204, y: 676 });
  });

  it('solta no canto do lado em que o centro ficou', () => {
    expect(cornerForRelease({ x: 20, y: 600 }, { x: 0, y: 0 }, area)).toBe('bottom-left');
    expect(cornerForRelease({ x: 220, y: 150 }, { x: 0, y: 0 }, area)).toBe('top-right');
  });

  it('um arremesso leva para o outro lado mesmo sem cruzar o meio', () => {
    expect(cornerForRelease({ x: 204, y: 676 }, { x: 0, y: -3 }, area)).toBe('top-right');
  });
});
