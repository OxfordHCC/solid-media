import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { readFileSync } from 'fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [preact()],

  base: process.env.NODE_ENV === 'development' ? '/' : '/solid-media/',

  build: {
    outDir: 'build',
    sourcemap: true,
  },

  define: {
    'import.meta.env.HOMEPAGE': JSON.stringify(
      process.env.NODE_ENV === 'development' ? '' : new URL(packageJson.homepage).pathname
    ),
    'import.meta.env.VITE_TMDB_API_KEY': JSON.stringify(process.env.VITE_TMDB_API_KEY),
  },

  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat'
    }
  },

  optimizeDeps: {
    include: ['preact', 'wouter-preact']
  }
})
