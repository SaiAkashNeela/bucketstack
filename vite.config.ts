import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Check if we're running Tauri (via environment variable set by Tauri CLI)
  const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

  return {
    // Tauri expects a fixed port, fail if that port is not available
    server: {
      port: isTauri ? 3000 : 3000,
      strictPort: isTauri,
      host: isTauri ? '127.0.0.1' : '0.0.0.0',
      watch: {
        // Tell vite to ignore watching `src-tauri`
        ignored: ['**/src-tauri/**'],
      },
    },
    // Production base path (essential for Tauri to load assets)
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // Tauri uses a different build target
    build: {
      target: isTauri ? ['es2021', 'safari13'] : undefined,
    },
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
  };
});
