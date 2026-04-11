import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /bytewarsv2/ — all asset URLs must be prefixed.
  // Change this if the repo is ever renamed or moved to a custom domain (set to '/').
  base: '/bytewarsv2/',
})
