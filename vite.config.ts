import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  console.log("Loaded ENV keys:", Object.keys(env));
  console.log("GEMINI_API_KEY exists:", !!env.GEMINI_API_KEY);
  console.log("NEXT_PUBLIC_API_KEY exists:", !!env.NEXT_PUBLIC_API_KEY);
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.NEXT_PUBLIC_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.NEXT_PUBLIC_API_KEY),
      'process.env.NEXT_PUBLIC_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.NEXT_PUBLIC_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
