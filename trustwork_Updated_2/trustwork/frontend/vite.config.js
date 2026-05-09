import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://localhost:5000'

  return {
    plugins: [react()],

    server: {
      port: 5173,
      // Dev proxy — routes /api/* calls to the backend during development.
      // This avoids CORS issues when calling from the browser during dev.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          // Uncomment if backend uses self-signed SSL:
          // secure: false,
        },
      },
    },

    // Make the API URL available inside the app as import.meta.env.VITE_API_URL
    define: {
      __API_URL__: JSON.stringify(apiTarget),
    },
  }
})
