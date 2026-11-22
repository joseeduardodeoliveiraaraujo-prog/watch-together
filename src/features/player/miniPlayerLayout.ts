export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type Point = { x: number; y: number };

export type MiniPlayerArea = {
  /** Tamanho da tela. */
  screen: { width: number; height: number };
  /** Tamanho do miniplayer. */
  size: { width: number; height: number };
  /** Espaço livre em cada borda (cabeçalho, barras do sistema, margem). */
  insets: { top: number; bottom: number; left: number; right: number };
};

/** Maior lado do miniplayer: ~46% da largura, como os miniplayers de vídeo costumam ser. */
export function miniPlayerSize(screenWidth: number) {
  const width = Math.min(Math.round(screenWidth * 0.46), 240);
  return { width, height: Math.round((width * 9) / 16) };
}

/** Canto superior esquerdo do miniplayer quando parado num canto. */
export function cornerPosition(corner: Corner, area: MiniPlayerArea): Point {
  const { screen, size, insets } = area;
  return {
    x: corner.endsWith('left') ? insets.left : screen.width - insets.right - size.width,
    y: corner.startsWith('top') ? insets.top : screen.height - insets.bottom - size.height,
  };
}

/** Distância (pt) até a qual um arraste ainda conta como toque. */
export const TAP_SLOP = 8;

/**
 * Canto onde o miniplayer gruda ao soltar: o do lado em que o centro dele ficou, adiantado pela
 * velocidade do gesto (um arremesso curto já leva para o outro lado).
 */
export function cornerForRelease(
  position: Point,
  velocity: Point,
  area: MiniPlayerArea,
): Corner {
  const centerX = position.x + area.size.width / 2 + velocity.x * 150;
  const centerY = position.y + area.size.height / 2 + velocity.y * 150;
  const vertical = centerY < area.screen.height / 2 ? 'top' : 'bottom';
  const horizontal = centerX < area.screen.width / 2 ? 'left' : 'right';
  return `${vertical}-${horizontal}`;
}
