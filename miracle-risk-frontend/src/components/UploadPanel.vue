<template>
  <div class="card">
    <div class="card-header">
      <h3>图片识别与生成</h3>
    </div>
    <div class="card-body">
      <!-- 模式切换 + 查看模版 -->
      <div class="top-row">
        <div class="tabs">
          <div
            class="tab"
            :class="{ active: mode === 'upload' }"
            @click="emit('changeMode', 'upload')"
          >上传图片文件</div>
          <div
            class="tab"
            :class="{ active: mode === 'url' }"
            @click="emit('changeMode', 'url')"
          >上传图片 URL</div>
        </div>
        <button class="btn btn-outline" @click="emit('openTemplate')">查看模版</button>
      </div>

      <!-- 图片文件上传 -->
      <div v-if="mode === 'upload'">
        <!-- 已选文件列表 -->
        <div v-if="fileCount > 0" class="file-selected-area">
          <div class="file-selected-header">
            <span class="file-selected-count">
              已选 <strong>{{ fileCount }}</strong> 张图片 · 预计消耗 <strong>{{ fileCount }}</strong> 点
            </span>
            <button class="btn-link" @click="clearFiles">清除</button>
          </div>
          <ul class="file-list">
            <li v-for="(f, idx) in selectedFiles" :key="idx" class="file-item">
              <span class="file-name">{{ f.name }}</span>
              <span class="file-size">{{ formatSize(f.size) }}</span>
              <button class="file-remove" :aria-label="`移除 ${f.name}`" @click.stop="removeFile(idx)">×</button>
            </li>
          </ul>
          <button type="button" class="btn-add-more" @click="triggerFileInput">+ 继续添加（文件 / ZIP）</button>
        </div>

        <!-- 空状态上传区 -->
        <div
          v-else
          class="upload-area"
          :class="{ dragover: isDragover }"
          role="button"
          tabindex="0"
          aria-label="点击或拖拽选择图片文件或 ZIP"
          @dragover.prevent="isDragover = true"
          @dragleave="isDragover = false"
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
          @keydown.enter="triggerFileInput"
        >
          <svg class="upload-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <div class="upload-text">
            <strong>拖拽上传</strong> 或点击此区域选择<br />
            支持 JPG / PNG / WEBP、<strong>ZIP 包</strong>（自动解压其中的图片），单张 ≤ 10MB，最多 100 张
          </div>
        </div>

        <p v-if="uploadImportMessage" class="url-import-msg" role="status">{{ uploadImportMessage }}</p>

        <input
          ref="fileInputRef"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.zip,application/zip"
          multiple
          style="display: none"
          @change="handleFileChange"
        />

        <div class="action-row">
          <button
            class="btn btn-primary btn-lg"
            :disabled="detecting || fileCount === 0"
            @click="handleStartDetect"
          >{{ detecting ? '识别中...' : '开始识别' }}</button>
          <div class="cost-hint">每张图片消耗 <strong>1 点</strong>。</div>
          <div class="flow-hint">本次上传的全部图片均会进行识别与生成/修改。</div>
        </div>
      </div>

      <!-- URL 上传 -->
      <div v-if="mode === 'url'">
        <div class="upload-area url-area">
          <div class="url-header">
            <div class="upload-text">
              <strong>上传图片 URL 列表</strong>（每行一个）<br />
              系统会按 URL 拉取图片；拉取成功的图片均会进行识别与生成/修改。
            </div>
            <button
              type="button"
              class="btn btn-outline btn-sm"
              @click="triggerUrlFileInput"
            >导入 URL 文件</button>
            <input
              ref="urlFileInputRef"
              type="file"
              accept=".txt,.csv,.xlsx,.xls,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style="display: none"
              @change="handleUrlFileChange"
            />
          </div>
          <textarea
            v-model="urlText"
            class="url-textarea"
            rows="5"
            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png"
          />
          <p v-if="urlImportMessage" class="url-import-msg" role="status">{{ urlImportMessage }}</p>
          <div v-if="urlCount > 0" class="url-count-hint">
            已输入 <strong>{{ urlCount }}</strong> 个 URL · 预计消耗 <strong>{{ urlCount }}</strong> 点
          </div>
        </div>
        <div class="action-row">
          <button
            class="btn btn-primary btn-lg"
            :disabled="detecting || urlCount === 0"
            @click="handleStartDetect"
          >{{ detecting ? '识别中...' : '开始识别' }}</button>
          <div class="cost-hint">每个 URL 视为 1 张图片，同样按 <strong>1 点/张</strong>计费。</div>
          <div class="flow-hint">本次提交的全部图片均会进行识别与生成/修改。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { InputMode } from '../types'
import { parseUrlFileContent, parseUrlsFromExcel } from '../utils/parseUrlImportFile'
import { extractImagesFromZip } from '../utils/extractImagesFromZip'

const MAX_IMAGE_FILES = 100
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const IMAGE_NAME_RE = /\.(jpe?g|png|webp)$/i

const props = defineProps<{
  mode: InputMode
  detecting?: boolean
}>()
const emit = defineEmits<{
  changeMode: [mode: InputMode]
  openTemplate: []
  startDetect: [payload: { files?: File[]; urls?: string[] }]
}>()

const isDragover = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const urlFileInputRef = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const urlText = ref('')
/** 导入 txt/csv/xlsx 时的提示（成功不提示，失败或空时展示） */
const urlImportMessage = ref<string | null>(null)
/** 本地上传：ZIP/大小/数量等提示 */
const uploadImportMessage = ref<string | null>(null)

const fileCount = computed(() => selectedFiles.value.length)
const urlCount = computed(() => urlText.value.split('\n').map(s => s.trim()).filter(Boolean).length)

function triggerFileInput() {
  uploadImportMessage.value = null
  fileInputRef.value?.click()
}

function isImageFile(f: File): boolean {
  if (IMAGE_NAME_RE.test(f.name)) return true
  return /^image\/(jpeg|png|webp)$/i.test(f.type)
}

function appendImageFiles(candidates: File[], priorWarnings: string[] = []) {
  const warnings = [...priorWarnings]

  for (const f of candidates) {
    if (!isImageFile(f)) continue
    if (f.size > MAX_IMAGE_BYTES) {
      warnings.push(`「${f.name}」超过 10MB 已跳过`)
      continue
    }
    if (selectedFiles.value.length >= MAX_IMAGE_FILES) {
      warnings.push('已达 100 张上限，部分文件未加入')
      break
    }
    selectedFiles.value = [...selectedFiles.value, f]
  }

  uploadImportMessage.value =
    warnings.length > 0 ? warnings.slice(0, 5).join('；') + (warnings.length > 5 ? '…' : '') : null
}

async function ingestFileList(files: File[]) {
  if (files.length === 0) return

  const zips = files.filter((f) => /\.zip$/i.test(f.name) || f.type === 'application/zip')
  const nonZips = files.filter((f) => !zips.includes(f))

  const warnings: string[] = []
  const fromZip: File[] = []

  for (const z of zips) {
    try {
      const extracted = await extractImagesFromZip(z, MAX_IMAGE_BYTES)
      if (extracted.length === 0) {
        warnings.push(`ZIP「${z.name}」内无 JPG/PNG/WEBP`)
        continue
      }
      fromZip.push(...extracted)
    } catch {
      warnings.push(`无法解压「${z.name}」`)
    }
  }

  appendImageFiles([...nonZips, ...fromZip], warnings)
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  await ingestFileList(files)
  input.value = ''
}

async function handleDrop(e: DragEvent) {
  isDragover.value = false
  const files = e.dataTransfer?.files
  if (files?.length) await ingestFileList(Array.from(files))
}

function removeFile(idx: number) {
  selectedFiles.value = selectedFiles.value.filter((_, i) => i !== idx)
}

function clearFiles() {
  selectedFiles.value = []
  uploadImportMessage.value = null
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function handleStartDetect() {
  if (props.mode === 'upload') {
    emit('startDetect', { files: selectedFiles.value })
  } else {
    const urls = urlText.value.split('\n').map(s => s.trim()).filter(Boolean)
    emit('startDetect', { urls })
  }
}

function triggerUrlFileInput() {
  urlImportMessage.value = null
  urlFileInputRef.value?.click()
}

async function handleUrlFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  urlImportMessage.value = null

  try {
    let urls: string[] = []
    const name = file.name.toLowerCase()
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      urls = await parseUrlsFromExcel(file)
    } else {
      const text = await file.text()
      urls = parseUrlFileContent(text)
    }

    if (urls.length === 0) {
      urlImportMessage.value =
        '未解析到有效 URL：请使用表头为 image_url 或 url 的列，或每格为 http(s) 链接'
      return
    }

    const block = urls.join('\n')
    const cur = urlText.value.trim()
    urlText.value = cur ? `${cur}\n${block}` : block
  } catch (err) {
    urlImportMessage.value =
      err instanceof Error ? `文件解析失败：${err.message}` : '文件解析失败，请检查格式'
  } finally {
    input.value = ''
  }
}
</script>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
  margin-bottom: 18px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 10px;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.card-body {
  padding: 16px 18px 20px;
  background: var(--surface);
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.tabs {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: #eef2f6;
}

.tab {
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.tab.active {
  background: #fff;
  color: var(--teal);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.upload-area {
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border);
  padding: 28px 20px;
  text-align: center;
  background: linear-gradient(180deg, rgba(13, 148, 136, 0.07) 0%, rgba(241, 245, 249, 0.6) 100%);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
  min-height: 240px;
  font-size: 13px;
  line-height: 1.6;
}

.upload-area:not(.url-area) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 240px;
}

.upload-area strong {
  color: var(--text);
}

.upload-area.dragover {
  border-color: var(--teal);
  background: rgba(13, 148, 136, 0.1);
}

.upload-area.url-area {
  text-align: left;
  cursor: default;
  display: flex;
  flex-direction: column;
  padding: 28px 20px;
  height: auto;
}

.upload-svg-icon {
  width: 28px;
  height: 28px;
  color: var(--teal);
  margin-bottom: 8px;
  flex-shrink: 0;
}

.upload-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.url-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.url-textarea {
  width: 100%;
  flex: 1 1 auto;
  min-height: 88px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  border: 1px solid var(--border-soft);
  color: var(--text);
  padding: 8px 12px;
  font-size: 12.5px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.url-textarea::placeholder {
  color: var(--text-secondary);
}

.file-selected-area {
  box-sizing: border-box;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(13, 148, 136, 0.35);
  background: rgba(13, 148, 136, 0.06);
  padding: 28px 20px;
  min-height: 240px;
  height: 240px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-selected-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.file-selected-count {
  font-size: 12.5px;
  color: var(--teal);
}

.file-selected-count strong {
  color: var(--teal-hover);
}

.btn-link {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 11.5px;
  cursor: pointer;
  padding: 2px 4px;
  text-decoration: underline;
}

.btn-link:hover {
  color: var(--text);
}

.file-list {
  list-style: none;
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text);
  background: rgba(13, 148, 136, 0.09);
  border: 1px solid rgba(13, 148, 136, 0.14);
  border-radius: 6px;
  padding: 6px 10px;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: var(--text-secondary);
  font-size: 11px;
  flex-shrink: 0;
}

.file-remove {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  flex-shrink: 0;
}

.file-remove:hover {
  color: var(--danger);
}

.btn-add-more {
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(13, 148, 136, 0.1);
  color: var(--teal-hover);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-top: auto;
  flex-shrink: 0;
  width: 100%;
  font-family: inherit;
}

.btn-add-more:hover {
  background: rgba(255, 255, 255, 0.38);
  border-color: rgba(13, 148, 136, 0.18);
  color: var(--teal);
}

.url-count-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--teal);
}

.url-count-hint strong {
  color: var(--teal-hover);
}

.url-import-msg {
  margin-top: 8px;
  font-size: 12px;
  color: #b91c1c;
  line-height: 1.5;
}

.action-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 16px;
  gap: 8px;
}

.cost-hint {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  max-width: 420px;
}

.cost-hint strong {
  color: var(--amber);
}

.flow-hint {
  font-size: 12px;
  color: var(--teal);
  font-weight: 500;
  line-height: 1.5;
  max-width: 420px;
  text-align: center;
}

.btn {
  font-family: inherit;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.btn-primary {
  background: var(--teal);
  color: #fff;
  border-color: var(--teal);
}

.btn-primary:hover:not(:disabled) {
  background: var(--teal-hover);
  border-color: var(--teal-hover);
}

.btn-primary.btn-lg {
  padding: 10px 28px;
  font-size: 14px;
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-outline {
  background: rgba(241, 245, 249, 0.9);
  color: var(--text-secondary);
  border-color: transparent;
}

.btn-outline:hover {
  background: #e2e8f0;
  color: var(--text);
}

.btn-sm {
  font-size: 12px;
  padding: 5px 12px;
}
</style>
