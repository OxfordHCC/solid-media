import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { readFileSync } from 'fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [preact()],
  
  build: {
    outDir: 'build',
    sourcemap: true,
  },

  define: {
    'import.meta.env.HOMEPAGE': JSON.stringify(
      process.env.NODE_ENV === 'development' ? '' : new URL(packageJson.homepage).pathname
    ),
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
