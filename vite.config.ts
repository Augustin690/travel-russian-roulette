import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const basePath = process.env.BASE_PATH;
const normalizedBase = basePath ? `${basePath.replace(/\/+$/, '')}/` : '/';

export default defineConfig({
  base: normalizedBase,
  plugins: [react()],
});
