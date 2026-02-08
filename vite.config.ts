import { defineConfig } from 'vite';

export default defineConfig({
  base: '/FlickPractice/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
});
