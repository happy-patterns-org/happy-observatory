import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',  // Since we're testing React components
    globals: true,         // Keep describe/it/expect global
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      provider: 'istanbul',  // More precise than v8
      all: true,
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/mockData.ts',
        '**/__mocks__/**',
        '**/tests/**',
        'src/app/layout.tsx',  // Next.js root layout
        'src/app/page.tsx',    // Next.js root page
      ],
    },
    passWithNoTests: true,  // Preserves existing script behaviour
    css: true,              // Support CSS imports
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
  esbuild: {
    // Ensure JSX is handled correctly
    jsx: 'automatic',
    loader: 'tsx',
    target: 'node18',
  },
})