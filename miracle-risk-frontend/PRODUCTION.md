# 生产环境部署说明

面向 **miracle-risk-frontend** 静态站点 + **独立后端 API** 的常见上线方式。

## 1. 构建前必做

1. **环境变量**（复制 `.env.example` 为 `.env.production` 并修改）：

   | 变量 | 生产建议 |
   |------|----------|
   | `VITE_API_BASE_URL` | 后端 API 根地址（**须含协议**，如 `https://api.xxx.com`），**不要**把密钥写进仓库 |
   | `VITE_USE_MOCK` | 必须为 **`false`** |

2. **本地验证构建**：

   ```bash
   npm ci
   npm run build
   npm run preview
   ```

3. **联调**：在 `preview` 或预发环境用真实后端跑一遍检测、改图与图片下载流程。

## 2. 跨域（CORS）两种常见做法

| 方式 | `VITE_API_BASE_URL` | 说明 |
|------|---------------------|------|
| **跨域** | `https://api.xxx.com` | 浏览器直接请求后端域名，**后端必须**对前端页面所在 `Origin` 配置 CORS |
| **同域反代** | `''`（空） | 前端与 `/api` 同一域名，由 **Nginx / 网关** 把 `/api` 转发到后端，无浏览器跨域问题 |

开发时 `VITE_API_BASE_URL` 为空 + Vite `proxy` 仅适用于 `npm run dev`，**不会**打进生产包。

## 3. 静态资源

- 产物目录：`dist/`（`index.html`、`assets/*`）。
- 当前为**单页应用、无前端路由**，服务器只需对未知路径回退到 `index.html`（与常见 SPA 一致，便于以后加路由）。

## 4. Nginx 示例

见仓库根目录 **`nginx.example.conf`**（按需改 `server_name`、证书路径、`root`）。

## 5. HTTPS

生产环境务必使用 **HTTPS**，避免 token、业务数据明文传输。

## 6. 安全清单（简版）

- [ ] `.env.production` 不提交仓库（仅 CI/CD 注入或服务器侧配置）
- [ ] 依赖：`npm audit`，评估 `xlsx` 等告警是否需升级或替换
- [ ] 后端限流、鉴权与接口权限与前端假设一致
- [ ] 无登录阶段：当前前端 **不会在 401 时跳转 `/login`**（避免线上 404）；接入登录后再加跳转逻辑

## 7. 监控与排障（可选）

- 静态托管：配置访问日志、CDN 缓存策略（`index.html` 建议短缓存或 no-cache）
- 前端错误：可后续接入 Sentry 等（本仓库未内置）
