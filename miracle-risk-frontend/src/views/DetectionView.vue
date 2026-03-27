<template>
  <div class="main">
    <header class="page-header">
      <div class="breadcrumb">图片服务 / <span>识别与生成（MVP）</span></div>
    </header>

    <div class="content">
      <UploadPanel
        :mode="inputMode"
        :detecting="detecting"
        @change-mode="setInputMode"
        @open-template="showTemplateModal = true"
        @start-detect="handleStartDetect"
      />

      <ResultTable
        :status="tableStatus"
        :batch-downloading="batchDownloadingImages"
        :row-downloading-id="rowDownloadingId"
        :items="pagedItems"
        :total="totalFromServer"
        :selected-ids="selectedIds"
        :current-page="currentPage"
        :total-pages="totalPages"
        :error-message="error ?? undefined"
        @toggle-select="toggleSelect"
        @toggle-all="handleToggleAll"
        @edit-item="handleEditSingle"
        @batch-edit="handleBatchEdit"
        @batch-download="handleBatchDownloadImages"
        @download-row="handleDownloadRowImages"
        @open-preview="handleOpenPreview"
        @prev-page="prevPage"
        @next-page="nextPage"
        @retry="handleRetry"
      />
    </div>

    <!-- 图片修改弹窗 -->
    <EditModal
      :visible="editModalVisible"
      :label="editLabel"
      @close="editModalVisible = false"
      @confirm="handleEditConfirm"
    />

    <!-- 图片预览弹窗 -->
    <ImagePreviewModal
      :visible="previewVisible"
      :title="previewTitle"
      :content="previewContent"
      :image-url="previewImageUrl"
      @close="previewVisible = false"
      @prev="handlePrevPreview"
      @next="handleNextPreview"
    />

    <!-- 模版说明弹窗 -->
    <TemplateModal
      :visible="showTemplateModal"
      :mode="inputMode"
      @close="showTemplateModal = false"
    />

    <!-- 图片下载提示：顶层浮层，不占文档流、不挤压页面 -->
    <Teleport to="body">
      <div
        v-if="imageDownloadError || imageDownloadInfo"
        class="toast-stack"
        aria-live="polite"
      >
        <div v-if="imageDownloadError" class="toast toast--error" role="alert">
          <span class="toast-text">{{ imageDownloadError }}</span>
          <button type="button" class="toast-close" @click="imageDownloadError = null">×</button>
        </div>
        <div v-if="imageDownloadInfo" class="toast toast--info" role="status">
          <span class="toast-text">{{ imageDownloadInfo }}</span>
          <button type="button" class="toast-close toast-close--info" @click="imageDownloadInfo = null">×</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDetection } from '../composables/useDetection'
import UploadPanel from '../components/UploadPanel.vue'
import ResultTable from '../components/ResultTable.vue'
import type { TableStatus } from '../components/ResultTable.vue'
import EditModal from '../components/EditModal.vue'
import ImagePreviewModal from '../components/ImagePreviewModal.vue'
import TemplateModal from '../components/TemplateModal.vue'
import {
  buildRowImageName,
  downloadImageFile,
  safeFileBase,
  zipAndDownloadImages,
} from '../utils/imageDownload'

const {
  inputMode, items, pagedItems, selectedIds,
  currentPage, totalPages, totalFromServer,
  detecting, error, hasDetected,
  setInputMode, toggleSelect, toggleSelectAll,
  startDetect, applyModify, prevPage, nextPage,
} = useDetection()

// 根据当前状态决定表格展示哪一套 UI
const tableStatus = computed<TableStatus>(() => {
  if (detecting.value) return 'detecting'
  if (error.value) return 'error'
  if (!hasDetected.value) return 'idle'
  if (pagedItems.value.length === 0) return 'allSafe'
  return 'success'
})

// ------- 检测 -------
// UploadPanel 通过 emit('start-detect', { files?, urls? }) 把数据传上来
async function handleStartDetect(payload: { files?: File[]; urls?: string[] }) {
  await startDetect(payload)
}

// ------- 编辑弹窗 -------
const editModalVisible = ref(false)
const editLabel = ref('')
const pendingEditIds = ref<number[]>([])

function handleEditSingle(id: number) {
  const item = items.value.find(i => i.id === id)
  editLabel.value = item?.filename ?? '当前图片'
  pendingEditIds.value = [id]
  editModalVisible.value = true
}

function handleBatchEdit() {
  const ids = [...selectedIds.value]
  if (ids.length === 0) return
  editLabel.value = `已选中 ${ids.length} 张图片`
  pendingEditIds.value = ids
  editModalVisible.value = true
}

function handleEditConfirm() {
  editModalVisible.value = false
  applyModify(pendingEditIds.value)
  pendingEditIds.value = []
}

// ------- 图片预览 -------
const previewVisible = ref(false)
const previewTitle = ref('图片预览')
const previewContent = ref('图片预览占位')
const previewImageUrl = ref<string | null>(null)
const previewRowId = ref(0)
const previewType = ref<'original' | 'modified'>('original')
const previewModifiedIndex = ref(0)

function syncPreviewFromItem() {
  const item = items.value.find((i) => i.id === previewRowId.value)
  if (!item) return

  if (previewType.value === 'original') {
    previewTitle.value = '原图预览'
    const u = item.originalImageUrl?.trim()
    previewImageUrl.value = u || null
    previewContent.value = u ? item.filename : '暂无原图地址'
    return
  }

  const mods = item.modifiedImages.filter((m) => m.url?.trim())
  if (mods.length === 0) {
    previewTitle.value = '修改后图预览'
    previewImageUrl.value = null
    previewContent.value = '暂无改后图'
    return
  }

  let idx = previewModifiedIndex.value
  if (idx < 0 || idx >= mods.length) idx = 0
  previewModifiedIndex.value = idx
  const m = mods[idx]
  previewTitle.value =
    mods.length > 1 ? `修改后图（${idx + 1}/${mods.length}）` : '修改后图预览'
  previewImageUrl.value = m.url
  previewContent.value = m.label ?? `版本 ${idx + 1}`
}

function handleOpenPreview(id: number, type: 'original' | 'modified', modifiedIndex = 0) {
  previewRowId.value = id
  previewType.value = type
  previewModifiedIndex.value = modifiedIndex
  syncPreviewFromItem()
  previewVisible.value = true
}

/** 预览改后图且同一行有多张时：先在同一行内切版本，再到上一行 / 下一行 */
function handlePrevPreview() {
  const rowIdx = pagedItems.value.findIndex((i) => i.id === previewRowId.value)
  const item = items.value.find((i) => i.id === previewRowId.value)

  if (previewType.value === 'modified' && item) {
    const mods = item.modifiedImages.filter((m) => m.url?.trim())
    if (mods.length > 1) {
      if (previewModifiedIndex.value > 0) {
        previewModifiedIndex.value--
        syncPreviewFromItem()
        return
      }
      if (rowIdx > 0) {
        previewRowId.value = pagedItems.value[rowIdx - 1].id
        const prevItem = items.value.find((i) => i.id === previewRowId.value)
        const prevMods = prevItem
          ? prevItem.modifiedImages.filter((m) => m.url?.trim())
          : []
        previewModifiedIndex.value = Math.max(0, prevMods.length - 1)
        syncPreviewFromItem()
        return
      }
      return
    }
  }

  if (rowIdx > 0) {
    previewRowId.value = pagedItems.value[rowIdx - 1].id
    previewModifiedIndex.value = 0
    syncPreviewFromItem()
  }
}

function handleNextPreview() {
  const rowIdx = pagedItems.value.findIndex((i) => i.id === previewRowId.value)
  const item = items.value.find((i) => i.id === previewRowId.value)

  if (previewType.value === 'modified' && item) {
    const mods = item.modifiedImages.filter((m) => m.url?.trim())
    if (mods.length > 1) {
      if (previewModifiedIndex.value < mods.length - 1) {
        previewModifiedIndex.value++
        syncPreviewFromItem()
        return
      }
      if (rowIdx < pagedItems.value.length - 1) {
        previewRowId.value = pagedItems.value[rowIdx + 1].id
        previewModifiedIndex.value = 0
        syncPreviewFromItem()
        return
      }
      return
    }
  }

  if (rowIdx < pagedItems.value.length - 1) {
    previewRowId.value = pagedItems.value[rowIdx + 1].id
    previewModifiedIndex.value = 0
    syncPreviewFromItem()
  }
}

// ------- 全选 -------
function handleToggleAll() {
  toggleSelectAll(pagedItems.value.map(i => i.id))
}

// ------- 图片下载（单张 / 批量 ZIP） -------
const rowDownloadingId = ref<number | null>(null)
const batchDownloadingImages = ref(false)
const imageDownloadError = ref<string | null>(null)
const imageDownloadInfo = ref<string | null>(null)

function clearImageDownloadAlerts() {
  imageDownloadError.value = null
  imageDownloadInfo.value = null
}

async function handleDownloadRowImages(id: number) {
  clearImageDownloadAlerts()
  const item = items.value.find((i) => i.id === id)
  if (!item) return

  const entries: { url: string; filename: string }[] = []
  if (item.originalImageUrl?.trim()) {
    entries.push({
      url: item.originalImageUrl.trim(),
      filename: buildRowImageName(item.filename, item.id, 'original', item.originalImageUrl),
    })
  }
  item.modifiedImages.forEach((m, i) => {
    const u = m.url?.trim()
    if (!u) return
    entries.push({
      url: u,
      filename: buildRowImageName(item.filename, item.id, 'modified', u, i),
    })
  })

  if (entries.length === 0) {
    imageDownloadError.value = '当前行没有可下载的图片链接'
    return
  }

  rowDownloadingId.value = id
  try {
    if (entries.length === 1) {
      await downloadImageFile(entries[0].url, entries[0].filename)
    } else {
      const r = await zipAndDownloadImages(entries, safeFileBase(item.filename))
      if (r.skipped > 0) {
        imageDownloadInfo.value = `已下载 ZIP，${r.skipped} 张因网络或跨域未纳入`
      }
    }
  } catch (e: unknown) {
    imageDownloadError.value = (e as Error).message
  } finally {
    rowDownloadingId.value = null
  }
}

async function handleBatchDownloadImages() {
  clearImageDownloadAlerts()
  const ids = [...selectedIds.value]
  if (ids.length === 0) return

  const selected = items.value.filter((i) => ids.includes(i.id))
  const entries: { url: string; filename: string }[] = []
  for (const item of selected) {
    if (item.originalImageUrl?.trim()) {
      entries.push({
        url: item.originalImageUrl.trim(),
        filename: buildRowImageName(item.filename, item.id, 'original', item.originalImageUrl),
      })
    }
    item.modifiedImages.forEach((m, i) => {
      const u = m.url?.trim()
      if (!u) return
      entries.push({
        url: u,
        filename: buildRowImageName(item.filename, item.id, 'modified', u, i),
      })
    })
  }

  if (entries.length === 0) {
    imageDownloadError.value = '所选行没有可下载的图片链接'
    return
  }

  batchDownloadingImages.value = true
  try {
    const r = await zipAndDownloadImages(entries, 'detection-images')
    if (r.skipped > 0) {
      imageDownloadInfo.value = `已下载 ZIP（${r.downloaded} 张纳入），${r.skipped} 张未能拉取`
    }
  } catch (e: unknown) {
    imageDownloadError.value = (e as Error).message
  } finally {
    batchDownloadingImages.value = false
  }
}

// ------- 重试 -------
function handleRetry() {
  // 清除错误，让用户重新触发检测
  error.value = null
}

// ------- 模版弹窗 -------
const showTemplateModal = ref(false)
</script>

<style scoped>
.main {
  padding: 28px 22px 40px;
  overflow-y: auto;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 18px;
}

.breadcrumb {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 0;
}

.breadcrumb span {
  color: var(--teal);
  font-weight: 600;
}

.content {
  max-width: 1120px;
  margin: 0 auto;
}

.toast-stack {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 11000;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  width: min(640px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.45;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12), 0 0 0 1px var(--border-soft);
}

.toast-text {
  flex: 1;
  min-width: 0;
}

.toast--error {
  border: 1px solid rgba(220, 38, 38, 0.35);
  background: #fff;
  color: #991b1b;
}

.toast--info {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--teal-hover);
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 0 2px;
  margin-top: -2px;
}

.toast-close:hover {
  color: var(--text);
}

.toast-close--info {
  color: var(--teal);
}

.toast-close--info:hover {
  color: var(--teal-hover);
}

</style>
