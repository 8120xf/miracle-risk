<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">{{ mode === 'upload' ? '图片文件模版说明' : 'URL 文件模版说明' }}</span>
          <button class="btn btn-outline" @click="emit('close')">关闭</button>
        </div>

        <div class="modal-body">
          <!-- 图片文件说明 -->
          <template v-if="mode === 'upload'">
            <p class="hint">支持以下图片格式：</p>
            <ul class="hint-list">
              <li><strong>JPG / PNG / WEBP</strong>，单张 ≤ 10MB；可选多个文件或 <strong>ZIP 包</strong>（解压其中的图片）。</li>
              <li>单次最多上传 <strong>100</strong> 张图片。</li>
            </ul>
            <p class="hint">建议按「同一商品 / 同一活动」打包上传，便于后续一起查看和修改图片。</p>
          </template>

          <!-- URL 文件说明 -->
          <template v-else>
            <p class="hint">支持以下文件格式：</p>
            <ul class="hint-list">
              <li><strong>Excel（.xlsx）</strong>：包含一列 <code>image_url</code>，每行一条记录。</li>
            </ul>
            <p class="hint" style="margin-bottom: 8px;">示例内容：</p>
            <div class="code-block">
              <div class="code-label">Excel 示例（单列表头）：</div>
              <div class="code-content">
                image_url<br />
                https://example.com/image1.jpg<br />
                https://example.com/image2.png
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { InputMode } from '../types'

defineProps<{ visible: boolean; mode: InputMode }>()
const emit = defineEmits<{ close: [] }>()
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: var(--surface);
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card), 0 24px 64px rgba(15, 23, 42, 0.12);
  width: 500px;
  max-width: 92vw;
  color: var(--text);
  overflow: hidden;
}

.modal-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.modal-body {
  padding: 16px 18px 18px;
}

.hint {
  font-size: 12.5px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.6;
}

.hint-list {
  font-size: 12.5px;
  color: var(--text-secondary);
  padding-left: 18px;
  margin-bottom: 12px;
  line-height: 1.8;
}

.hint-list strong {
  color: var(--text);
}

.hint-list code {
  background: rgba(13, 148, 136, 0.1);
  color: var(--teal-hover);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
}

.code-block {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: #f8fafc;
  padding: 10px 12px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  color: var(--text);
  line-height: 1.8;
}

.code-label {
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-family: inherit;
}

.btn {
  font-family: inherit;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
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
</style>
