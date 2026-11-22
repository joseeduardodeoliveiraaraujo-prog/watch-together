import { requireOptionalNativeModule, type EventSubscription, type NativeModule } from 'expo';

type PictureInPictureEvents = {
  onChange: (event: { active: boolean }) => void;
};

declare class PictureInPictureModule extends NativeModule<PictureInPictureEvents> {
  isSupported(): boolean;
  isActive(): boolean;
  enter(): Promise<boolean>;
  setAutoEnter(enabled: boolean): Promise<void>;
}

/**
 * Picture in picture da tela no Android (módulo nativo em ./android).
 * Fora de um build com o módulo (Expo Go, testes, web) é `null`: tudo vira "não suportado".
 */
const native = requireOptionalNativeModule<PictureInPictureModule>('PictureInPicture');

/** O aparelho tem picture in picture (Android 8+ e o recurso ativo). */
export function isPictureInPictureSupported(): boolean {
  return native?.isSupported() ?? false;
}

/** O app está na janelinha agora. */
export function isInPictureInPicture(): boolean {
  return native?.isActive() ?? false;
}

/** Encolhe o app na janelinha 16:9. `false` se não deu (sem suporte ou desligado pelo usuário). */
export async function enterPictureInPicture(): Promise<boolean> {
  return (await native?.enter()) ?? false;
}

/** Entrar sozinho na janelinha ao sair do app (botão home ou gesto). */
export async function setAutoEnterPictureInPicture(enabled: boolean): Promise<void> {
  await native?.setAutoEnter(enabled);
}

/** Avisa ao entrar e sair da janelinha. */
export function addPictureInPictureListener(
  listener: (active: boolean) => void,
): EventSubscription | null {
  return native?.addListener('onChange', ({ active }) => listener(active)) ?? null;
}
