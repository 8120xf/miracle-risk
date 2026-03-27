import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // 生产包默认不暴露 sourcemap，减少体积与源码泄露风险
    sourcemap: false,
    target: 'es2020',
  },
  plugins: [vue()],
  server: {
    proxy: {
      // 本地开发时，把 /api 请求转发到后端服务
      '/api': {
        target: 'http://localhost:8000',   // ← 改成你的后端地址
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''),  // 若后端无 /api 前缀则取消注释
      },
    },
  },
})
