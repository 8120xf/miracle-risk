/** 是否为 http(s) 图片链接 */
export function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

function dedupe(urls: string[]): string[] {
  return [...new Set(urls)]
}

/** 从 .txt / .csv 文本中解析 URL（支持首行为表头 image_url 的 CSV） */
export function parseUrlFileContent(text: string): string[] {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  if (lines.length === 0) return []

  let start = 0
  const firstLower = lines[0].toLowerCase()
  if (firstLower.includes('image_url') || /^url$/i.test(lines[0].split(/[,;\t]/)[0] ?? '')) {
    start = 1
  }

  const urls: string[] = []
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    const firstCell = line.split(/[,;\t]/)[0]?.trim().replace(/^"|"$/g, '') ?? ''
    if (firstCell && isHttpUrl(firstCell)) {
      urls.push(firstCell)
    }
  }
  if (urls.length > 0) return urls
  return lines.filter((l) => isHttpUrl(l))
}

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/\s/g, '_')
}

/** 从 Excel 行对象中取 URL（优先 image_url / url 列） */
function pickUrlFromRow(row: Record<string, unknown>): string {
  const map: Record<string, unknown> = {}
  for (const k of Object.keys(row)) {
    map[normalizeKey(k)] = row[k]
  }
  const keys = ['image_url', 'url', 'imageurl', 'link', '图片地址', '图片链接']
  for (const key of keys) {
    const v = map[key]
    if (v != null && v !== '') {
      const s = typeof v === 'number' ? String(v) : String(v).trim()
      if (s) return s
    }
  }
  for (const k of Object.keys(row)) {
    const v = row[k]
    const s = typeof v === 'number' ? String(v) : String(v ?? '').trim()
    if (s && isHttpUrl(s)) return s
  }
  return ''
}

/**
 * 解析 .xlsx / .xls（首表 sheet）
 * 优先按表头识别 image_url / url 列；否则扫描单元格中的 http(s) 链接
 */
export async function parseUrlsFromExcel(file: File): Promise<string[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const workbook = XLSX.read(buf, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]

  const rowsObj = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })
  const fromObjects: string[] = []
  for (const row of rowsObj) {
    const u = pickUrlFromRow(row)
    if (u && isHttpUrl(u)) fromObjects.push(u.trim())
  }
  if (fromObjects.length > 0) return dedupe(fromObjects)

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][]
  const fromMatrix: string[] = []
  for (const row of matrix) {
    if (!Array.isArray(row)) continue
    for (const cell of row) {
      const s = String(cell ?? '').trim()
      if (s && isHttpUrl(s)) fromMatrix.push(s)
    }
  }
  return dedupe(fromMatrix)
}
