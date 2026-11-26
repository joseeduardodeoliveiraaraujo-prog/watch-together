// Servidor de desenvolvimento para o build de desenvolvimento (expo-dev-client).
// Define APP_VARIANT=development (o `VAR=x comando` do package.json não funciona no Windows).
// Uso: npm run dev [-- --clear]  (argumentos vão para `expo start`)
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, APP_VARIANT: 'development' },
  shell: true,
});
process.exit(result.status ?? 1);
