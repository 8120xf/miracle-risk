# 前端约定（miracle-risk-frontend）

本文描述**除后端接口实现外**的前端分工与结构，便于多人协作。

## 技术栈

- Vue 3（Composition API + `<script setup>`）
- Vite 8
- TypeScript（严格模式）
- Axios（`src/api/http.ts` 统一实例）

**第一期**：单页 MVP，无独立「App 壳」与侧栏、不引入 Vue Router；入口即图片识别与生成工作台（`App.vue` → `DetectionView`）。后续若需要多页面再接入路由与布局。

## 目录结构（约定）

```
src/
  api/           # HTTP：仅放请求封装与 DTO/映射，不写业务 UI
  components/    # 可复用展示组件
  composables/   # 组合式函数（状态与逻辑）
  types/         # 全局类型
  views/         # 页面级视图（当前主界面）
  App.vue
  main.ts
  style.css      # 全局变量与 reset
```

路径别名：`@/` 指向 `src/`（见 `vite.config.ts`、`tsconfig.app.json`）。

## 状态与数据

- 检测相关：`composables/useDetection.ts`
- 后端未就绪时：通过 `VITE_USE_MOCK=true` 走本地 mock，避免阻塞 UI 开发。

## UI / 交互

- 设计变量：`style.css` 中 `:root` CSS 变量。
- 结果表、上传区等**多状态**（idle / loading / error / empty / success）已在组件内体现；新增功能请保持同样完整性。

## 代码风格

- ESLint + Prettier 已配置；提交前建议执行 `npm run lint`。
- 优先 TypeScript 显式类型；避免 `any`。

## URL 批量导入

- 支持 **`.txt` / `.csv` / `.xlsx` / `.xls`**（`UploadPanel` → `parseUrlImportFile.ts`）。
- Excel 优先读取列名 **`image_url`** 或 **`url`**（亦尝试 **`图片地址` / `图片链接`**）；若无表头则扫描单元格中的 `http(s)` 链接。
- `xlsx` 为按需动态导入，不阻塞首屏。

## 生产上线

详见根目录 **[PRODUCTION.md](./PRODUCTION.md)**（环境变量、CORS、Nginx、安全清单）。

## 与后端对接（职责边界）

- **前端**：环境变量、请求层、错误展示、loading/空态、类型定义与后端文档对齐。
- **后端**：接口路径、鉴权、业务字段与错误码（联调阶段再合流）。

### 检测结果中的图片 URL

- 单条结果建议返回：`original_image_url`；改后图推荐 **`modified_images`**：`{ id?, url, label? }[]`（一张原图可多张改后图）。
- 兼容旧字段：仅返回 `modified_image_url` / `modified_image_label` 时，前端会映射为单元素 `modified_images`。
- 修改接口 `ModifyResponse`：可只返回本次新增的 `modified_image_url`（前端**追加**一条）；若返回完整列表 `modified_images`，则**覆盖**该行数组。
- **导出结果为 CSV（含 URL 列）当前已下线**；需要时可用「下载图片 / 批量下载 ZIP」取图。
