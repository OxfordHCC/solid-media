import { defineConfig, type ResolvedConfig } from 'vite'
import preact from '@preact/preset-vite'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Custom plugin to transform spaRedirect.html
function spaRedirectPlugin() {
  let config: ResolvedConfig

  return {
    name: 'spa-redirect-transform',
    configResolved(resolvedConfig: ResolvedConfig) {
      config = resolvedConfig
    },
    writeBundle() {
      // Read the source file
      const sourceFile = readFileSync('./src/spaRedirect.html', 'utf-8')

      // Calculate the homepage value based on environment
      const homepage = process.env.NODE_ENV === 'development'
        ? ''
        : new URL(packageJson.homepage).pathname

      // Replace the placeholder
      const transformedContent = sourceFile.replace('%HOMEPAGE%', homepage)

      // Write to build directory
      const buildDir = config.build.outDir
      writeFileSync(join(buildDir, 'spaRedirect.html'), transformedContent)

      // Also copy to subdirectories as per original build script
      const subdirs = ['login', 'callback', 'view']
      subdirs.forEach(subdir => {
        const subdirPath = join(buildDir, subdir)
        // Create directory if it doesn't exist
        try {
          mkdirSync(subdirPath, { recursive: true })
          writeFileSync(join(subdirPath, 'index.html'), transformedContent)
        } catch (err) {
          console.warn(`Failed to create ${subdirPath}:`, err)
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [preact(), spaRedirectPlugin()],

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
