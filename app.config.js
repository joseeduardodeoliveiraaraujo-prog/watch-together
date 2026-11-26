// Configuração dinâmica por cima do app.json (que segue sendo a fonte principal).
// Com APP_VARIANT=development (perfil "development" do EAS e `npm run dev`), o app vira o build
// de desenvolvimento: outro pacote e outro nome, para ficar instalado junto com o APK normal.
const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = ({ config }) => {
  if (!IS_DEV) return config;
  return {
    ...config,
    name: `${config.name} (Dev)`,
    android: {
      ...config.android,
      package: `${config.android.package}.dev`,
    },
  };
};
