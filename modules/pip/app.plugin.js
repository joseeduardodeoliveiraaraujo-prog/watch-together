// Liga o picture in picture na Activity principal do Android (AndroidManifest.xml gerado no build).
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

/** A janelinha muda o tamanho da tela: sem estes, o Android recriaria a Activity (e a sala). */
const CONFIG_CHANGES = ['screenSize', 'smallestScreenSize', 'screenLayout', 'orientation'];

module.exports = function withPictureInPicture(config) {
  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    activity.$['android:supportsPictureInPicture'] = 'true';
    activity.$['android:resizeableActivity'] = 'true';

    const current = (activity.$['android:configChanges'] ?? '').split('|').filter(Boolean);
    activity.$['android:configChanges'] = [...new Set([...current, ...CONFIG_CHANGES])].join('|');
    return config;
  });
};
