import { View } from 'react-native';

/** Ícone de picture in picture (o Feather não tem): tela com uma janelinha no canto. */
export function PipIcon({ size = 20, color }: { size?: number; color: string }) {
  const width = size;
  const height = Math.round(size * 0.78);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width,
        height,
        borderWidth: 2,
        borderColor: color,
        borderRadius: 3,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: 2,
      }}
    >
      <View
        style={{
          width: Math.round(width * 0.42),
          height: Math.round(height * 0.42),
          borderRadius: 1.5,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
