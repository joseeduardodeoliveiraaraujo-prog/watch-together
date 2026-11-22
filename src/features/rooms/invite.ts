import * as Linking from 'expo-linking';
import { Share } from 'react-native';

/** Abre o compartilhamento do sistema com o código e o link da sala. */
export async function shareRoomInvite(code: string) {
  const link = Linking.createURL(`/join/${code}`);
  await Share.share({
    message: `Vem assistir comigo no Watch Together!\nCódigo da sala: ${code}\n${link}`,
  });
}
