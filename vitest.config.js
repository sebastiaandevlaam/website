import { defineConfig } from 'vite';
import path from 'path';

// Deliberately not reusing vite.config.js: that one runs the eslint plugin and
// the React plugin, neither of which a Node-side unit test needs.
export default defineConfig({
    resolve: { alias: { '@': path.resolve('src') } },
    test: {
        environment: 'node',
        include: ['src/**/*.test.{js,jsx}', 'functions/**/*.test.js'],
        exclude: ['**/node_modules/**', 'dist/**'],
    },
});
