import { ref, computed } from 'vue'
import type { DetectionItem, InputMode } from '../types'
import {
  detectByFiles,
  detectByUrls,
  fetchDetectionList,
  mapDetectionItem,
  modifyImage,
  batchModifyImages,
} from '../api/detection'

/** Mock：示例原图/改后图 URL（联调后由后端真实地址替换） */
const mockOriginalUrl = (id: number) =>
  `https://cdn.example.com/miracle-risk/original/${id}.jpg`
const mockModifiedUrl = (id: number) =>
  `https://cdn.example.com/miracle-risk/modified/${id}.jpg`

/** Mock：模拟「上传即全量生成修改后图」；第 0 条含 2 张改后图，便于验证多版本 */
const MOCK_ITEMS: DetectionItem[] = [
  {
    id: 0,
    filename: 'product-main-01.jpg',
    source: '本地上传',
    riskLevel: 'infringement',
    hitBrand: 'Nike',
    modifyStatus: 'done',
    originalImageUrl: mockOriginalUrl(0),
    modifiedImages: [
      { url: mockModifiedUrl(0), label: '改后图 1' },
      { url: `${mockModifiedUrl(0)}?v=2`, label: '改后图 2' },
    ],
  },
  {
    id: 1,
    filename: 'lookbook-02.png',
    source: 'URL 导入',
    riskLevel: 'safe',
    hitBrand: '—',
    modifyStatus: 'done',
    originalImageUrl: mockOriginalUrl(1),
    modifiedImages: [{ url: mockModifiedUrl(1), label: '改后图' }],
  },
  {
    id: 2,
    filename: 'banner-hero-03.jpg',
    source: '本地上传',
    riskLevel: 'infringement',
    hitBrand: 'LV',
    modifyStatus: 'done',
    originalImageUrl: mockOriginalUrl(2),
    modifiedImages: [{ url: mockModifiedUrl(2), label: '改后图' }],
  },
  {
    id: 3,
    filename: 'summer-promo-04.png',
    source: '本地上传',
    riskLevel: 'infringement',
    hitBrand: 'Gucci',
    modifyStatus: 'done',
    originalImageUrl: mockOriginalUrl(3),
    modifiedImages: [{ url: mockModifiedUrl(3), label: '改后图' }],
  },
  {
    id: 4,
    filename: 'category-bg-05.jpg',
    source: 'URL 导入',
    riskLevel: 'safe',
    hitBrand: '—',
    modifyStatus: 'done',
    originalImageUrl: mockOriginalUrl(4),
    modifiedImages: [{ url: mockModifiedUrl(4), label: '改后图' }],
  },
  {
    id: 5,
    filename: 'detail-shot-06.jpg',
    source: '本地上传',
    riskLevel: 'safe',
    hitBrand: '—',
    modifyStatus: 'done',
    originalImageUrl: mockOriginalUrl(5),
    modifiedImages: [{ url: mockModifiedUrl(5), label: '改后图' }],
  },
]

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export function useDetection() {
  const inputMode = ref<InputMode>('upload')
  // 进入页面默认无数据；mock 模式下也仅在「开始检测」后写入 MOCK_ITEMS
  const items = ref<DetectionItem[]>([])
  const totalFromServer = ref(0)
  const selectedIds = ref<Set<number>>(new Set())
  const currentPage = ref(1)
  const pageSize = 5

  // 加载 / 错误状态
  const loading = ref(false)
  const detecting = ref(false)
  const error = ref<string | null>(null)
  // 是否至少执行过一次检测（区分"从未检测"和"检测完无结果"）
  const hasDetected = ref(false)

  const totalPages = computed(() => Math.max(1, Math.ceil(totalFromServer.value / pageSize)))
  const pagedItems = computed(() => {
    if (USE_MOCK) {
      const start = (currentPage.value - 1) * pageSize
      return items.value.slice(start, start + pageSize)
    }
    return items.value   // 服务端分页：items 本身已是当页数据
  })

  // ─── 加载当页列表（服务端分页） ───────────────────────────────────
  async function loadPage(page: number) {
    if (USE_MOCK) { currentPage.value = page; return }
    loading.value = true
    error.value = null
    try {
      const res = await fetchDetectionList({ page, page_size: pageSize })
      items.value = res.items.map(mapDetectionItem)
      totalFromServer.value = res.total
      currentPage.value = page
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  // ─── 开始检测 ────────────────────────────────────────────────────
  async function startDetect(payload: { files?: File[]; urls?: string[] }) {
    if (USE_MOCK) {
      detecting.value = true
      error.value = null
      try {
        // 模拟请求耗时，与真实接口体验一致
        await new Promise(r => setTimeout(r, 900))
        items.value = MOCK_ITEMS.map((row) => ({ ...row }))
        totalFromServer.value = items.value.length
        currentPage.value = 1
        selectedIds.value.clear()
        hasDetected.value = true
      } finally {
        detecting.value = false
      }
      return
    }

    detecting.value = true
    error.value = null
    try {
      if (payload.files?.length) {
        items.value = await detectByFiles(payload.files)
      } else if (payload.urls?.length) {
        items.value = await detectByUrls(payload.urls)
      }
      totalFromServer.value = items.value.length
      currentPage.value = 1
      hasDetected.value = true
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      detecting.value = false
    }
  }

  // ─── 图片修改 ────────────────────────────────────────────────────
  async function applyModify(ids: number[]) {
    // 乐观更新：先设 loading
    ids.forEach(id => {
      const item = items.value.find(i => i.id === id)
      if (item) item.modifyStatus = 'loading'
    })
    selectedIds.value.clear()

    try {
      if (USE_MOCK) {
        // mock：延迟 1.2s 后变成 done
        await new Promise(resolve => setTimeout(resolve, 1200))
        ids.forEach((id) => {
          const item = items.value.find((i) => i.id === id)
          if (!item) return
          const nextN = item.modifiedImages.length + 1
          item.modifyStatus = 'done'
          item.modifiedImages = [
            ...item.modifiedImages,
            {
              url: `${mockModifiedUrl(id)}?mock=${nextN}`,
              label: `改后图 ${nextN}`,
            },
          ]
        })
        return
      }

      const results =
        ids.length === 1 ? [await modifyImage(ids[0])] : await batchModifyImages(ids)

      results.forEach((r) => {
        const item = items.value.find((i) => i.id === r.id)
        if (!item) return
        item.modifyStatus = 'done'
        if (r.modified_images?.length) {
          item.modifiedImages = r.modified_images
            .filter((m) => m.url?.trim())
            .map((m) => ({
              id: m.id,
              url: m.url.trim(),
              label: m.label,
            }))
          return
        }
        if (r.modified_image_url?.trim()) {
          const url = r.modified_image_url.trim()
          const label =
            r.modified_image_label ?? `改后图 ${item.modifiedImages.length + 1}`
          item.modifiedImages = [...item.modifiedImages, { url, label }]
        }
      })
    } catch (e: unknown) {
      // 回滚 loading：若已有改后图则回到 done，避免「再次修改」失败后被误显示为「去修改图片」
      ids.forEach((id) => {
        const item = items.value.find((i) => i.id === id)
        if (item && item.modifyStatus === 'loading') {
          item.modifyStatus = item.modifiedImages.length > 0 ? 'done' : 'none'
        }
      })
      error.value = (e as Error).message
    }
  }

  // ─── 分页 ────────────────────────────────────────────────────────
  function prevPage() {
    if (currentPage.value > 1) loadPage(currentPage.value - 1)
  }

  function nextPage() {
    if (currentPage.value < totalPages.value) loadPage(currentPage.value + 1)
  }

  // ─── 选中 ────────────────────────────────────────────────────────
  function setInputMode(mode: InputMode) { inputMode.value = mode }

  function toggleSelect(id: number) {
    if (selectedIds.value.has(id)) selectedIds.value.delete(id)
    else selectedIds.value.add(id)
  }

  function toggleSelectAll(ids: number[]) {
    const allSelected = ids.every(id => selectedIds.value.has(id))
    if (allSelected) ids.forEach(id => selectedIds.value.delete(id))
    else ids.forEach(id => selectedIds.value.add(id))
  }

  return {
    inputMode, items, pagedItems, selectedIds,
    currentPage, totalPages, totalFromServer,
    loading, detecting, error, hasDetected,
    setInputMode, toggleSelect, toggleSelectAll,
    startDetect, applyModify, loadPage, prevPage, nextPage,
  }
}
