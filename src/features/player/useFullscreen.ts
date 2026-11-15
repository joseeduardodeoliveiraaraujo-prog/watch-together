import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

/**
 * Tela cheia do player: gira para paisagem enquanto ativa e volta para retrato ao sair
 * (inclusive se a tela for fechada em tela cheia). O botão "voltar" do Android sai da tela cheia.
 * Barras do sistema são escondidas pelo componente (StatusBar / NavigationBar com `hidden`).
 */
export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;

    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
      () => undefined,
    );
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      setFullscreen(false);
      return true;
    });

    return () => {
      back.remove();
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
        () => undefined,
      );
    };
  }, [fullscreen]);

  return {
    fullscreen,
    toggle: () => setFullscreen((value) => !value),
  };
}
