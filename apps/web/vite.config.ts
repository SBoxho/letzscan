/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Everything Vite inlines under `VITE_` reaches the browser bundle in clear
 * text. Fail the build rather than discover a provider key in a source map.
 * Secrets belong in Cloudflare Worker secrets — see docs/adr/0004.
 */
const SECRET_LOOKING = /(SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|PRIVATE|ACCESS_?ID|API_?KEY)/i;

function assertNoBrowserSecrets(mode: string, root: string): void {
  const env = loadEnv(mode, root, 'VITE_');
  const offenders = Object.keys(env).filter((key) => SECRET_LOOKING.test(key));
  if (offenders.length > 0) {
    throw new Error(
      `Refusing to build: ${offenders.join(', ')} would be inlined into the browser bundle.\n` +
        'Move the value to a Worker secret and proxy the call through apps/edge.',
    );
  }
}

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('.', import.meta.url));
  assertNoBrowserSecrets(mode, root);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // MapLibre is ~930 kB raw on its own and lives in a lazy chunk. The limit
      // is set just above it so that the warning means "something new got big",
      // not "the map exists". The map must never reach the entry chunk.
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: 5173,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
