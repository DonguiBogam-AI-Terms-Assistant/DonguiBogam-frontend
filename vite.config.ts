import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// content script는 chunk 분리 없이 단일 IIFE로 빌드해야 함
// background + panel은 ES module로 빌드
export default defineConfig(({ mode }) => {
  const isContent = mode === 'content';

  if (isContent) {
    return {
      plugins: [],
      resolve: {
        alias: { '@shared': resolve(__dirname, 'src/shared') },
      },
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/content/index.ts'),
          name: 'content',
          fileName: () => 'content.js',
          formats: ['iife'],
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    };
  }

  // background + panel 빌드
  return {
    plugins: [react()],
    resolve: {
      alias: { '@shared': resolve(__dirname, 'src/shared') },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/background/index.ts'),
          panel: resolve(__dirname, 'src/panel/index.tsx'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
