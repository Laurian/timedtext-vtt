import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  base: './',
  publicDir: 'public',
  server: {
    open: true,
  },
});
