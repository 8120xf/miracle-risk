import http from './http'
import type { DetectionItem, ModifiedImageEntry, ModifyStatus } from '../types'

// ─── 请求 / 响应类型 ─────────────────────────────────────────────

export interface DetectByFilesPayload {
  files: File[]
}

export interface DetectByUrlsPayload {
  urls: string[]
}

/** 后端返回的单条改后图（一张原图可多条） */
export interface ModifiedImageRaw {
  id?: number
  url: string
  label?: string
}

/** 后端返回的单条检测结果（对齐真实接口字段，按需调整） */
export interface DetectionResultRaw {
  id: number
  filename: string
  source: string
  risk_level: 'infringement' | 'safe'
  hit_brand: string
  modify_status: 'none' | 'loading' | 'done'
  /** 原图 URL */
  original_image_url?: string
  /** 旧版单张改后图（与 modified_images 二选一或并存，见 map） */
  modified_image_url?: string
  modified_image_label?: string
  /** 新版：多张改后图 */
  modified_images?: ModifiedImageRaw[]
}

export interface DetectionListResponse {
  total: number
  page: number
  page_size: number
  items: DetectionResultRaw[]
}

export interface ModifyResponse {
  id: number
  modified_image_label?: string
  modified_image_url?: string
  /** 若返回完整列表则覆盖该行改后图集合 */
  modified_images?: ModifiedImageRaw[]
}

// ─── API 函数 ─────────────────────────────────────────────────────

/** 图片文件上传检测 */
export async function detectByFiles(files: File[]): Promise<DetectionItem[]> {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))

  // 上传文件要用 multipart，临时覆盖 Content-Type
  const raw: DetectionResultRaw[] = await http.post('/api/v1/detection/by-files', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return raw.map(mapItem)
}

/** URL 列表检测 */
export async function detectByUrls(urls: string[]): Promise<DetectionItem[]> {
  const raw: DetectionResultRaw[] = await http.post('/api/v1/detection/by-urls', { urls })
  return raw.map(mapItem)
}

/** 分页获取检测历史 */
export async function fetchDetectionList(params: {
  page: number
  page_size: number
}): Promise<DetectionListResponse> {
  return http.get('/api/v1/detection/list', { params })
}

/** 单张图片修改 */
export async function modifyImage(id: number): Promise<ModifyResponse> {
  return http.post(`/api/v1/detection/${id}/modify`)
}

/** 批量图片修改 */
export async function batchModifyImages(ids: number[]): Promise<ModifyResponse[]> {
  return http.post('/api/v1/detection/batch-modify', { ids })
}

// ─── 内部工具 ─────────────────────────────────────────────────────

function mapModifiedImagesFromRaw(r: DetectionResultRaw): ModifiedImageEntry[] {
  if (r.modified_images?.length) {
    return r.modified_images
      .filter((m) => m.url?.trim())
      .map((m) => ({
        id: m.id,
        url: m.url.trim(),
        label: m.label,
      }))
  }
  if (r.modified_image_url?.trim()) {
    return [
      {
        url: r.modified_image_url.trim(),
        label: r.modified_image_label,
      },
    ]
  }
  return []
}

function resolveModifyStatus(r: DetectionResultRaw, images: ModifiedImageEntry[]): ModifyStatus {
  if (r.modify_status === 'loading') return 'loading'
  if (images.length > 0) return 'done'
  return r.modify_status === 'done' ? 'done' : 'none'
}

/** 将后端单条结果转为前端模型（列表/检测接口复用） */
export function mapDetectionItem(r: DetectionResultRaw): DetectionItem {
  const modifiedImages = mapModifiedImagesFromRaw(r)
  return {
    id: r.id,
    filename: r.filename,
    source: r.source,
    riskLevel: r.risk_level,
    hitBrand: r.hit_brand,
    modifyStatus: resolveModifyStatus(r, modifiedImages),
    originalImageUrl: r.original_image_url,
    modifiedImages,
  }
}

function mapItem(r: DetectionResultRaw): DetectionItem {
  return mapDetectionItem(r)
}
