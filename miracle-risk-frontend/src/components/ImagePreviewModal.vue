<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">{{ title }}</span>
          <button class="btn btn-outline" @click="emit('close')">关闭</button>
        </div>
        <div class="modal-body">
          <div class="preview-box">
            <img v-if="imageUrl" :src="imageUrl" alt="" class="preview-img" />
            <span v-else class="preview-placeholder">{{ content }}</span>
          </div>
          <div class="nav-row">
            <button type="button" class="btn btn-outline" @click="emit('prev')">上一张</button>
            <button type="button" class="btn btn-outline" @click="emit('next')">下一张</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  title: string
  content: string
  imageUrl?: string | null
}>()

const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()
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
  width: min(520px, 92vw);
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.preview-box {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: linear-gradient(180deg, rgba(13, 148, 136, 0.06) 0%, #f8fafc 100%);
  box-sizing: border-box;
  width: min(100%, 72vmin, 480px);
  aspect-ratio: 1 / 1;
  height: auto;
  min-height: 0;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.preview-placeholder {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 12px;
  text-align: center;
}

.nav-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
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
