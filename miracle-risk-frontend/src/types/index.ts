export type InputMode = 'upload' | 'url'

export type RiskLevel = 'infringement' | 'safe'

export type ModifyStatus = 'none' | 'loading' | 'done'

/** 单张原图可对应多张改后图（多次「修改」各产生一条） */
export interface ModifiedImageEntry {
  /** 后端可选，用于去重或列表对齐 */
  id?: string | number
  url: string
  label?: string
}

export interface DetectionItem {
  id: number
  filename: string
  source: string
  riskLevel: RiskLevel
  hitBrand: string
  modifyStatus: ModifyStatus
  /** 原图访问地址（HTTPS URL，由后端返回） */
  originalImageUrl?: string
  /** 全部改后图，按生成顺序；兼容旧接口时由单 URL 映射为单元素数组 */
  modifiedImages: ModifiedImageEntry[]
}
