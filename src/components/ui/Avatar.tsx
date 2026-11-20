import { Text, View } from 'react-native';

type AvatarProps = {
  name: string;
  /** Cor da pessoa (ver memberColor): o fundo usa a mesma cor, transparente. */
  color: string;
  size?: number;
  /** Contorno da cor do fundo onde o avatar está (avatares sobrepostos). */
  ringColor?: string;
  dimmed?: boolean;
};

/** Círculo com a inicial do apelido. */
export function Avatar({ name, color, size = 28, ringColor, dimmed = false }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}33`,
        borderWidth: ringColor ? 2 : 0,
        borderColor: ringColor,
        opacity: dimmed ? 0.5 : 1,
      }}
    >
      <Text className="font-bold" style={{ color, fontSize: Math.round(size * 0.42) }}>
        {initial}
      </Text>
    </View>
  );
}
