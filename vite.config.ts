import { defineConfig, type ResolvedConfig } from 'vite'
import preact from '@preact/preset-vite'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Calculate base path once and reuse
const getBasePath = () => {
  if (process.env.NODE_ENV === 'development') {
    return '/'
  }
  return new URL(packageJson.homepage).pathname
}

const basePath = getBasePath()

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

      const homepage = basePath.replace(/\/$/, '')

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

  base: basePath,

  build: {
    outDir: 'build',
    sourcemap: true,
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
