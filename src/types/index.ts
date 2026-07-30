export type SourceType = 'manual' | 'pdf' | 'markdown' | 'image' | 'video' | 'document'

export interface KnowledgeItem {
  id: string
  title: string
  content: string
  tags: string[]
  category?: string
  source: SourceType
  sourceFile?: string
  fileData?: string
  fileDataList?: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface SearchFilters {
  query: string
  tags: string[]
  category?: string
  sortBy: 'createdAt' | 'updatedAt' | 'title'
  sortOrder: 'asc' | 'desc'
}

export type ViewMode = 'grid' | 'list' | 'detail'