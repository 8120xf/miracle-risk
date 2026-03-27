import JSZip from 'jszip'
import { downloadBlob } from './downloadBlob'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function zipStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`
}

/** 从 URL 路径猜扩展名 */
function extFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname
    const m = pathname.match(/\.([a-zA-Z0-9]{1,8})$/)
    if (m) return `.${m[1].toLowerCase()}`
  } catch {
    /* ignore */
  }
  return fallback
}

/** 去掉路径非法字符，保留可读文件名 */
export function safeFileBase(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'image'
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

export async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`拉取图片失败：HTTP ${res.status}`)
  return res.blob()
}

/**
 * 单文件下载：优先 fetch 成 blob；失败则新开标签页（常见于跨域无 CORS）
 */
export async function downloadImageFile(url: string, filename: string): Promise<void> {
  try {
    const blob = await fetchImageBlob(url)
    downloadBlob(blob, filename)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
    throw new Error('无法在页面内保存文件（跨域限制），已在新标签页打开图片，请手动另存为')
  }
}

/**
 * @param modifiedVariantIndex 多张改后图时从 0 递增，文件名带 modified_1 / modified_2 …
 */
export function buildRowImageName(
  rowFilename: string,
  id: number,
  kind: 'original' | 'modified',
  url: string,
  modifiedVariantIndex?: number
): string {
  const base = safeFileBase(rowFilename)
  const ext = extFromUrl(url, '.jpg')
  if (kind === 'modified' && modifiedVariantIndex != null && modifiedVariantIndex >= 0) {
    return `${base}_${id}_modified_${modifiedVariantIndex + 1}${ext}`
  }
  return `${base}_${id}_${kind}${ext}`
}

export type ZipDownloadResult = { downloaded: number; skipped: number }

/**
 * 将多张图片打入 zip 并触发下载；拉取失败的条目跳过，至少成功一张才下载 zip
 */
export async function zipAndDownloadImages(
  entries: { url: string; filename: string }[],
  zipBasename: string
): Promise<ZipDownloadResult> {
  if (entries.length === 0) {
    throw new Error('没有可下载的图片')
  }

  const zip = new JSZip()
  let downloaded = 0
  let skipped = 0

  for (const e of entries) {
    try {
      const blob = await fetchImageBlob(e.url)
      zip.file(e.filename, blob)
      downloaded++
    } catch {
      skipped++
    }
  }

  if (downloaded === 0) {
    throw new Error('图片无法拉取（多为跨域限制），请确认图片地址允许浏览器访问或联系后端提供代理下载')
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${zipBasename}-${zipStamp()}.zip`)

  return { downloaded, skipped }
}
