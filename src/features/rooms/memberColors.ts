import { Colors } from '@/constants/theme';

/** Uma cor por vaga da sala, na ordem de entrada (avatares, nomes no chat). */
const MEMBER_COLORS = [Colors.primary, Colors.success, Colors.orange, Colors.sky];

export function memberColor(index: number): string {
  if (index < 0) return Colors.muted;
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

/** userId → cor, pela posição na lista de membros (ordenada por entrada). */
export function memberColorMap(memberIds: readonly string[]): (userId: string) => string {
  return (userId) => memberColor(memberIds.indexOf(userId));
}
