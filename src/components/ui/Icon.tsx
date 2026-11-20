import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { Colors } from '@/constants/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

/** Ícones de traço (Feather, a mesma família do design). Decorativos: o texto ao lado descreve. */
export function Icon({ name, size = 18, color = Colors.text }: IconProps) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
