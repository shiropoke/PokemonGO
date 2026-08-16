import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/PokemonGO/',
  plugins: [react()],
  build: {
    target: ['es2020', 'safari14'],
  },
  test: {
    environment: 'node',
  },
});
