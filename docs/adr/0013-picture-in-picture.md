# ADR 0013 — Picture in picture (janelinha) no Android

- **Status:** aceito
- **Data:** 2026-11-22

## Contexto

Queríamos continuar vendo o vídeo da sala numa janelinha ao sair do app. O `expo-video` tem
picture in picture, mas só para o player nativo dele; o nosso vídeo é o YouTube dentro de uma
WebView (ADR 0004), que não pode tocar num player nativo. No Android o picture in picture é da
Activity inteira: o sistema encolhe o app todo numa janela.

## Decisão

- **Módulo nativo local** `modules/pip` (Kotlin, Expo Modules API), autolinkado pela pasta
  `modules/`: entra na janelinha 16:9 (`enterPictureInPictureMode`), liga a entrada automática
  (`setAutoEnterEnabled` no Android 12+; `OnUserLeaveHintProvider` no 8 a 11) e emite `onChange`
  ao entrar e sair (`OnPictureInPictureModeChangedProvider`). Fora de um build com o módulo
  (Expo Go, testes) o JS vê "sem suporte" e nada aparece.
- **Plugin de configuração** `modules/pip/app.plugin.js`: liga `supportsPictureInPicture` na
  Activity principal e garante `configChanges` de tamanho de tela, para a janelinha não recriar a
  Activity (e a sala). Nada é editado à mão em `android/`.
- **Entrada:** automática ao sair do app só enquanto há vídeo tocando na sala, e por botão (no
  canto do vídeo em pé, porque a linha de controles não tem espaço; ao lado de "sair da tela
  cheia" na tela cheia).
- **Na janelinha a sala mostra só o vídeo**, sem controles nem avisos. Sem botões dentro da
  janelinha por enquanto (`RemoteAction` exigiria bem mais código nativo, e o play/pause valeria
  para a sala toda).
- **Vídeo fora da tela para só neste aparelho:** app em segundo plano sem janelinha, ou janelinha
  fechada no X, chama `setSuspended(true)` em `useRoomPlayback`: pausa o player local e a
  sincronização deixa de corrigi-lo, sem mudar o estado da sala. Ao voltar, segue a sala de novo.
  Espera 700 ms antes de decidir, porque entrar na janelinha também tira o app de `active`.
- **Login:** o Android trata a janelinha como segundo plano; a renovação do token do Supabase
  continua ligada enquanto ela está aberta (senão a sincronização cairia numa sessão longa).

## Consequências

- Precisa de build nativo (APK); não funciona no Expo Go.
- O código Kotlin só é compilado no EAS Build (não há Android SDK na máquina de desenvolvimento).
