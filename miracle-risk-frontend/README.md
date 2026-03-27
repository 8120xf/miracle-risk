# miracle-risk-frontend

AI 风控 · 图片识别与生成（MVP）前端：Vue 3 + Vite + TypeScript。

## 环境要求

- Node.js **20+**（推荐用 [nvm](https://github.com/nvm-sh/nvm)）

## 安装与运行

```bash
npm install
cp .env.example .env.development   # 按需修改
npm run dev
```

浏览器打开终端提示的本地地址（默认 `http://localhost:5173`）。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器（热更新） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 本地预览构建产物 |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化 |

## 环境变量

见项目根目录 **`.env.example`**。开发默认 `VITE_USE_MOCK=true` 可不依赖后端；联调时由后端同学配合改为 `false` 并配置 `VITE_API_BASE_URL`。

## 与后端协作

- 开发代理：`vite.config.ts` 中将 `/api` 代理到本地后端（默认 `http://localhost:8000`），可按实际修改。
- 接口封装：`src/api/detection.ts`、`src/api/http.ts`。

## 文档

- 前端约定与目录说明：**[FRONTEND.md](./FRONTEND.md)**

## 部署（生产）

1. 配置 **`.env.production`**：`VITE_USE_MOCK=false`，`VITE_API_BASE_URL` 填真实后端（或同域反代时见文档）。
2. 执行 **`npm run build`**，将 **`dist/`** 整目录上传到 OSS / Nginx / CDN 等静态托管。
3. **HTTPS**、**CORS / 同域反代**、Nginx 示例与清单见 **[PRODUCTION.md](./PRODUCTION.md)** 与 **`nginx.example.conf`**。

当前为单页入口；服务器对未知路径需回退到 `index.html`（示例配置已包含 `try_files`）。
