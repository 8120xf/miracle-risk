import JSZip from 'jszip'

const IMAGE_NAME_RE = /\.(jpe?g|png|webp)$/i

function guessMimeFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

/**
 * 从 ZIP 中解压出符合扩展名的图片文件（忽略目录、__MACOSX、隐藏项）
 */
export async function extractImagesFromZip(
  zipFile: File,
  maxEachBytes: number
): Promise<File[]> {
  const zip = await JSZip.loadAsync(zipFile)
  const out: File[] = []
  const paths = Object.keys(zip.files).sort()

  for (const path of paths) {
    const entry = zip.files[path]
    if (entry.dir) continue
    if (path.includes('__MACOSX/') || /\/\./.test(path)) continue
    if (!IMAGE_NAME_RE.test(path)) continue

    const blob = await entry.async('blob')
    if (blob.size > maxEachBytes) continue

    const base = path.split('/').pop() || 'image.jpg'
    const type = blob.type && /^image\//.test(blob.type) ? blob.type : guessMimeFromName(base)
    out.push(new File([blob], base, { type }))
  }

  return out
}
