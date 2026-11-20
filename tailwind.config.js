const colors = require('./src/constants/colors.json');
const { fontFamily } = require('./src/constants/fonts.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Peso = arquivo de fonte (o Android não sintetiza pesos de fontes carregadas). Por isso
  // `font-bold`, `font-semibold`... trocam a família (fonts.json) e o plugin de peso fica desligado.
  corePlugins: { fontWeight: false },
  theme: {
    extend: {
      colors,
      fontFamily,
    },
  },
  plugins: [],
};
