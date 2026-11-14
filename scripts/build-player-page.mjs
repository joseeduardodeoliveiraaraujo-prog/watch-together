// Gera web/player/index.html a partir da fonte única src/lib/youtube/playerHtml.ts.
//   npm run build:player   → gera o arquivo
//   npm run check:player   → falha se o arquivo publicado estiver desatualizado
// Requer Node com type stripping (22.18+ / 24+).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const { PLAYER_HTML } = await import('../src/lib/youtube/playerHtml.ts');

const outDir = new URL('../web/player/', import.meta.url);
const outFile = new URL('index.html', outDir);

if (process.argv.includes('--check')) {
  const current = existsSync(outFile) ? readFileSync(outFile, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current !== PLAYER_HTML) {
    console.error('web/player/index.html desatualizado. Rode `npm run build:player`.');
    process.exit(1);
  }
  console.log('web/player/index.html em dia.');
} else {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, PLAYER_HTML);
  console.log('web/player/index.html atualizado.');
}
