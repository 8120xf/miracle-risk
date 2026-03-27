<template>
  <div class="card">
    <div class="card-header">
      <h3>识别结果</h3>
    </div>

    <!-- ① 从未识别：引导空状态 -->
    <div v-if="status === 'idle'" class="state-box">
      <div class="state-icon">🔍</div>
      <div class="state-title">还没有识别结果</div>
      <div class="state-desc">上传图片文件或输入图片 URL，点击「开始识别」即可开始</div>
    </div>

    <!-- ② 识别中：骨架屏 -->
    <div v-else-if="status === 'detecting'" class="state-box">
      <div class="skeleton-rows">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="sk sk-check" />
          <div class="sk sk-thumb" />
          <div class="sk sk-thumb" />
          <div class="sk sk-text" />
          <div class="sk sk-btn" />
        </div>
      </div>
      <div class="detecting-tip">正在处理全部图片（识别与生成/修改），请稍候…</div>
    </div>

    <!-- ③ 错误状态 -->
    <div v-else-if="status === 'error'" class="state-box">
      <div class="state-icon error-icon">⚠️</div>
      <div class="state-title error-title">识别失败</div>
      <div class="state-desc">{{ errorMessage || '网络异常或服务不可用，请稍后重试' }}</div>
      <button class="btn btn-primary mt-12" @click="emit('retry')">重新识别</button>
    </div>

    <!-- ④ 识别完成但无列表条目 -->
    <div v-else-if="status === 'allSafe'" class="state-box">
      <div class="state-icon safe-icon">✅</div>
      <div class="state-title safe-title">暂无图片条目</div>
      <div class="state-desc">本次识别未返回可展示的图片，请检查上传内容或稍后重试</div>
      <button class="btn btn-outline mt-12" @click="emit('retry')">再次识别</button>
    </div>

    <!-- ⑤ 有结果：正常表格 -->
    <template v-else>
      <div class="card-body">
        <!-- 摘要行 + 批量操作 -->
        <div class="summary-row">
          <div class="summary-text">
            共 <strong>{{ total }}</strong> 张图片，点击图片可查看大图，勾选后可进行批量图片下载或修改。
          </div>
          <div class="batch-area">
            <button
              class="btn btn-outline btn-sm"
              :disabled="selectedIds.size === 0 || batchDownloading"
              :title="selectedIds.size === 0 ? '请先勾选至少一张图片' : `下载已选 ${selectedIds.size} 张的相关图片（ZIP）`"
              @click="emit('batchDownload')"
            >{{ batchDownloading ? '打包中…' : `批量下载${selectedIds.size > 0 ? `（${selectedIds.size}）` : ''}` }}</button>
            <button
              class="btn btn-outline btn-sm"
              :disabled="selectedIds.size === 0"
              :title="selectedIds.size === 0 ? '请先勾选至少一张图片' : `修改已选 ${selectedIds.size} 张`"
              @click="emit('batchEdit')"
            >批量修改图片{{ selectedIds.size > 0 ? `（${selectedIds.size}）` : '' }}</button>
          </div>
        </div>

        <!-- 表格 -->
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style="width: 28px;">
                  <input
                    type="checkbox"
                    :checked="isAllPageSelected"
                    :aria-label="isAllPageSelected ? '取消全选' : '全选当前页'"
                    @change="toggleAll"
                  />
                </th>
                <th style="width: 58px;">原图</th>
                <th class="th-col-modified">修改后图</th>
                <th>文件名</th>
                <th style="width: 240px;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in items"
                :key="item.id"
                :class="{ 'row-selected': selectedIds.has(item.id) }"
              >
                <td>
                  <input
                    type="checkbox"
                    :checked="selectedIds.has(item.id)"
                    :aria-label="`选择 ${item.filename}`"
                    @change="emit('toggleSelect', item.id)"
                  />
                </td>
                <!-- 原图：仅方块参与单元格垂直居中 -->
                <td class="thumb-cell">
                  <div class="thumb-anchor">
                    <div
                      class="thumb-slot-main thumb-slot-main--click"
                      role="button"
                      tabindex="0"
                      :aria-label="`查看 ${item.filename} 原图`"
                      @click="emit('openPreview', item.id, 'original')"
                      @keydown.enter="emit('openPreview', item.id, 'original')"
                    >
                      <div class="thumb thumb-pict">
                        <svg class="thumb-icon thumb-icon-art" viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="4.5" y="6" width="15" height="12" rx="2.75" fill="currentColor" opacity="0.1" />
                          <rect x="4.5" y="6" width="15" height="12" rx="2.75" fill="none" stroke="currentColor" stroke-width="1.15" opacity="0.42" />
                          <circle cx="9.25" cy="10.75" r="1.9" fill="currentColor" opacity="0.38" />
                          <path
                            d="M5.25 17.25h13.5l-2.9-3.65-1.85 2.25-2.35-2.85-3.2 3.9-1.45-1.75-1.75 2.1Z"
                            fill="currentColor"
                            opacity="0.2"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </td>
                <!-- 修改后图：方块与原图垂直居中一致；「改后×」绝对定位在下方，不参与居中高度 -->
                <td class="thumb-cell">
                  <div v-if="item.modifyStatus === 'loading'" class="thumb-anchor">
                    <div class="thumb-slot-main">
                      <div class="thumb thumb-loading">
                        <span class="spin-dot" />
                      </div>
                    </div>
                  </div>
                  <div v-else-if="modifiedCount(item) === 0" class="thumb-anchor">
                    <div class="thumb-slot-main">
                      <div class="thumb thumb-empty">—</div>
                    </div>
                  </div>
                  <div v-else class="thumb-anchor">
                    <div
                      class="thumb-slot-main thumb-slot-main--click"
                      role="button"
                      tabindex="0"
                      :aria-label="modifiedAriaLabel(item)"
                      @click="emit('openPreview', item.id, 'modified', 0)"
                      @keydown.enter="emit('openPreview', item.id, 'modified', 0)"
                    >
                      <div class="thumb thumb-pict thumb-done">
                        <svg class="thumb-icon thumb-icon-art" viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="4.5" y="6" width="15" height="12" rx="2.75" fill="currentColor" opacity="0.12" />
                          <rect x="4.5" y="6" width="15" height="12" rx="2.75" fill="none" stroke="currentColor" stroke-width="1.15" opacity="0.48" />
                          <circle cx="9.25" cy="10.75" r="1.9" fill="currentColor" opacity="0.4" />
                          <path
                            d="M5.25 17.25h13.5l-2.9-3.65-1.85 2.25-2.35-2.85-3.2 3.9-1.45-1.75-1.75 2.1Z"
                            fill="currentColor"
                            opacity="0.22"
                          />
                        </svg>
                      </div>
                    </div>
                    <span v-if="modifiedCount(item) > 1" class="thumb-caption-below">改后×{{ modifiedCount(item) }}</span>
                  </div>
                </td>
                <!-- 文件名 -->
                <td>
                  <span class="filename">{{ item.filename }}</span>
                </td>
                <!-- 操作 -->
                <td>
                  <div class="op-cell">
                    <button
                      class="btn btn-outline btn-sm"
                      :disabled="item.modifyStatus === 'loading' || props.rowDownloadingId === item.id"
                      @click="emit('editItem', item.id)"
                    >
                      {{ item.modifyStatus === 'loading' ? '修改中...' : item.modifyStatus === 'done' ? '再次修改' : '去修改图片' }}
                    </button>
                    <button
                      class="btn btn-outline btn-sm"
                      type="button"
                      :disabled="!rowHasDownloadable(item) || props.rowDownloadingId === item.id"
                      :title="downloadRowTitle(item)"
                      @click="emit('downloadRow', item.id)"
                    >
                      {{ props.rowDownloadingId === item.id ? '…' : '下载图片' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div class="pagination">
          <button class="btn btn-outline btn-sm" :disabled="currentPage <= 1" @click="emit('prevPage')">上一页</button>
          <span class="page-info">第 <strong>{{ currentPage }}</strong> / {{ totalPages }} 页</span>
          <button class="btn btn-outline btn-sm" :disabled="currentPage >= totalPages" @click="emit('nextPage')">下一页</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DetectionItem } from '../types'

function modifiedWithUrl(item: DetectionItem) {
  return item.modifiedImages.filter((m) => m.url?.trim())
}

function modifiedCount(item: DetectionItem): number {
  return modifiedWithUrl(item).length
}

function modifiedAriaLabel(item: DetectionItem): string {
  const n = modifiedCount(item)
  return n > 1
    ? `查看 ${item.filename} 的 ${n} 张修改后图`
    : `查看 ${item.filename} 修改后图`
}

export type TableStatus = 'idle' | 'detecting' | 'error' | 'allSafe' | 'success'

const props = withDefaults(
  defineProps<{
    status: TableStatus
    items: DetectionItem[]
    total: number
    selectedIds: Set<number>
    currentPage: number
    totalPages: number
    errorMessage?: string
    /** 正在打包批量下载 */
    batchDownloading?: boolean
    /** 正在下载单行（显示行内 loading） */
    rowDownloadingId?: number | null
  }>(),
  {
    errorMessage: undefined,
    batchDownloading: false,
    rowDownloadingId: null,
  }
)

const emit = defineEmits<{
  toggleSelect: [id: number]
  toggleAll: []
  editItem: [id: number]
  batchEdit: []
  batchDownload: []
  downloadRow: [id: number]
  openPreview: [id: number, type: 'original' | 'modified', modifiedIndex?: number]
  prevPage: []
  nextPage: []
  retry: []
}>()

function rowHasDownloadable(item: DetectionItem): boolean {
  const hasOrig = Boolean(item.originalImageUrl?.trim())
  const nMod = modifiedWithUrl(item).length
  return hasOrig || nMod > 0
}

function downloadRowTitle(item: DetectionItem): string {
  if (!rowHasDownloadable(item)) return '暂无原图或改后图链接'
  const orig = Boolean(item.originalImageUrl?.trim())
  const nMod = modifiedWithUrl(item).length
  if (orig && nMod > 1) return `下载本行原图与 ${nMod} 张改后图（ZIP）`
  if (orig && nMod === 1) return '下载本行原图与改后图（ZIP）'
  if (orig) return '下载原图'
  if (nMod > 1) return `下载本行 ${nMod} 张改后图（ZIP）`
  return '下载改后图'
}

const isAllPageSelected = computed(() =>
  props.items.length > 0 && props.items.every(i => props.selectedIds.has(i.id))
)

function toggleAll() {
  emit('toggleAll')
}
</script>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  margin-bottom: 18px;
}

.card-header {
  padding: 16px 18px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.state-box {
  padding: 40px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  background: var(--surface);
}

.state-icon {
  font-size: 28px;
}

.state-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.state-desc {
  font-size: 12.5px;
  color: var(--text-secondary);
  max-width: 320px;
  line-height: 1.6;
}

.error-title {
  color: var(--danger);
}

.safe-title {
  color: var(--teal-hover);
}

.mt-12 {
  margin-top: 12px;
}

.skeleton-rows {
  width: 100%;
  padding: 0 18px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-soft);
}

.sk {
  background: linear-gradient(
    90deg,
    rgba(241, 245, 249, 0.9) 25%,
    rgba(226, 232, 240, 0.95) 50%,
    rgba(241, 245, 249, 0.9) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 4px;
  flex-shrink: 0;
}

.sk-check {
  width: 14px;
  height: 14px;
  border-radius: 3px;
}

.sk-thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.sk-text {
  flex: 1;
  height: 12px;
}

.sk-badge {
  width: 48px;
  height: 20px;
  border-radius: 999px;
}

.sk-text-sm {
  width: 60px;
  height: 12px;
}

.sk-btn {
  width: 72px;
  height: 22px;
  border-radius: 999px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.detecting-tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 12px;
}

.card-body {
  padding: 0;
  background: var(--surface);
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 18px 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.summary-text strong {
  color: var(--text);
}

.batch-area {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.table-wrapper {
  max-height: 448px;
  overflow: auto;
  margin: 0 -4px;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  color: var(--text);
}

thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
  padding: 10px 12px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: none;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.04);
}

tbody td {
  padding: 14px 12px;
  border-bottom: none;
  vertical-align: middle;
}

tbody td.thumb-cell {
  vertical-align: middle;
  text-align: center;
  padding-bottom: 22px;
}

th.th-col-modified {
  min-width: 5.5em;
  width: 5.5em;
  white-space: nowrap;
}

tbody tr:nth-child(odd) td {
  background: rgba(255, 255, 255, 0.65);
}

tbody tr:nth-child(even) td {
  background: rgba(13, 148, 136, 0.04);
}

tbody tr:hover td {
  background: rgba(217, 119, 6, 0.07) !important;
}

.row-selected td {
  background: rgba(13, 148, 136, 0.12) !important;
}

.thumb-anchor {
  position: relative;
  display: inline-block;
}

.thumb-caption-below {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: calc(100% + 6px);
  font-size: 9.5px;
  line-height: 1.2;
  color: var(--teal);
  white-space: nowrap;
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  text-align: center;
}

.thumb-slot-main {
  display: block;
}

.thumb-slot-main--click {
  cursor: pointer;
  border-radius: 8px;
}

.thumb-slot-main--click:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: 2px;
}

.thumb-slot-main--click:hover .thumb-pict:not(.thumb-done) {
  border-color: rgba(13, 148, 136, 0.45);
}

.thumb-slot-main--click:hover .thumb-done.thumb-pict {
  border-color: var(--teal);
}

.thumb-slot-main--click:hover .thumb-pict:not(.thumb-done) .thumb-icon {
  color: var(--teal);
}

.thumb-slot-main--click:hover .thumb-done .thumb-icon {
  color: var(--teal-hover);
}

.thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  border: 1px solid var(--border-soft);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.thumb-pict {
  flex-shrink: 0;
}

.thumb-icon {
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
  flex-shrink: 0;
  display: block;
  opacity: 0.85;
}

.thumb-icon-art {
  shape-rendering: geometricPrecision;
}

.thumb-done .thumb-icon {
  color: var(--teal);
  opacity: 1;
}

.thumb-empty {
  color: var(--text-secondary);
}

.thumb-loading {
  border-color: var(--border);
}

.spin-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(13, 148, 136, 0.25);
  border-top-color: var(--teal);
  animation: spin 0.8s linear infinite;
  display: block;
}

.thumb-done {
  border-color: rgba(13, 148, 136, 0.35);
  background: var(--teal-muted);
  color: var(--teal);
  box-shadow: 0 2px 12px rgba(13, 148, 136, 0.2);
}

.op-cell {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.filename {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.pagination {
  padding: 9px 18px 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.page-info {
  font-size: 12px;
  color: var(--text-secondary);
}

.page-info strong {
  color: var(--text);
}

.btn {
  font-family: inherit;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
}

.btn-primary {
  background: var(--teal);
  color: #fff;
}

.btn-outline {
  background: rgba(241, 245, 249, 0.9);
  color: var(--text-secondary);
  border-color: transparent;
}

.btn-outline:hover:not(:disabled) {
  background: #e2e8f0;
  color: var(--text);
}

.btn-outline:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-sm {
  font-size: 12px;
  padding: 5px 12px;
}
</style>
