<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title-row">
            <span class="modal-title">图片修改中 ·</span>
            <span class="modal-subtitle">{{ label }}</span>
          </div>
          <button class="btn btn-outline" @click="emit('close')">关闭</button>
        </div>

        <div class="modal-body">
          <div class="spinner-row">
            <div class="spinner" />
            <div>
              <div class="spinner-main">正在根据风险点自动调整图片...</div>
              <div class="spinner-sub">预计耗时 10~30 秒。</div>
            </div>
          </div>
          <p class="modal-tip">
            完成后，该图片的「修改后图」将写回到检测结果中，列表中的"修改后图"列会展示最新缩略图。
          </p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary" @click="emit('confirm')">好的，我知道了</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean; label: string }>()
const emit = defineEmits<{
  close: []
  confirm: []
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
  z-index: 40;
}

.modal {
  background: var(--surface);
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card), 0 24px 64px rgba(15, 23, 42, 0.12);
  width: 520px;
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

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.modal-subtitle {
  font-size: 12.5px;
  color: var(--text-secondary);
}

.modal-body {
  padding: 16px 18px;
}

.spinner-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.spinner {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 3px solid rgba(13, 148, 136, 0.2);
  border-top-color: var(--teal);
  animation: spin 0.9s linear infinite;
  flex-shrink: 0;
}

.spinner-main {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.spinner-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.modal-tip {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.modal-footer {
  padding: 12px 18px 14px;
  border-top: 1px solid var(--border-soft);
  display: flex;
  justify-content: flex-end;
}

.btn {
  font-family: inherit;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
}

.btn-primary {
  background: var(--teal);
  color: #fff;
  border-color: var(--teal);
}

.btn-primary:hover {
  background: var(--teal-hover);
  border-color: var(--teal-hover);
}

.btn-outline {
  background: rgba(241, 245, 249, 0.9);
  color: var(--text-secondary);
  border-color: transparent;
  padding: 5px 12px;
  font-size: 12px;
}

.btn-outline:hover {
  background: #e2e8f0;
  color: var(--text);
}
</style>
