import { useEffect, useEffectEvent, useState } from 'react';
import { AppState } from 'react-native';

import {
  addPictureInPictureListener,
  enterPictureInPicture,
  isInPictureInPicture,
  isPictureInPictureSupported,
  setAutoEnterPictureInPicture,
} from '@/modules/pip';

/**
 * Entrar na janelinha também tira o app de "active": espera o aviso dela antes de decidir que o
 * app sumiu da tela.
 */
const HIDDEN_DELAY_MS = 700;

type Options = {
  /** Entrar sozinho na janelinha ao sair do app (ligado só enquanto há vídeo tocando). */
  autoEnter: boolean;
  /**
   * O vídeo deixou de estar visível (app em segundo plano sem janelinha, ou janelinha fechada no
   * X) ou voltou a estar.
   */
  onHiddenChange: (hidden: boolean) => void;
};

/** Picture in picture na sala (Android): o app inteiro vira uma janelinha com só o vídeo. */
export function usePictureInPicture({ autoEnter, onHiddenChange }: Options) {
  const [supported] = useState(isPictureInPictureSupported);
  const [active, setActive] = useState(isInPictureInPicture);
  const reportHidden = useEffectEvent(onHiddenChange);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      if (AppState.currentState === 'active') {
        reportHidden(false);
        return;
      }
      timer = setTimeout(
        () => reportHidden(AppState.currentState !== 'active' && !isInPictureInPicture()),
        HIDDEN_DELAY_MS,
      );
    };
    const appState = AppState.addEventListener('change', update);
    const pip = addPictureInPictureListener((next) => {
      setActive(next);
      update();
    });
    return () => {
      clearTimeout(timer);
      appState.remove();
      pip?.remove();
    };
  }, []);

  useEffect(() => {
    if (supported) void setAutoEnterPictureInPicture(autoEnter);
  }, [supported, autoEnter]);

  // Saindo da sala: sair do app volta a ser só sair.
  useEffect(() => {
    if (!supported) return;
    return () => void setAutoEnterPictureInPicture(false);
  }, [supported]);

  return {
    supported,
    active,
    enter: () => void enterPictureInPicture(),
  };
}
