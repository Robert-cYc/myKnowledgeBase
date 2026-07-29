export type SourceType = 'manual' | 'pdf' | 'markdown' | 'image'

export interface KnowledgeItem {
  id: string
  title: string
  content: string
  tags: string[]
  source: SourceType
  sourceFile?: string
  fileData?: string
  createdAt: string
  updatedAt: string
}

export interface SearchFilters {
  query: string
  tags: string[]
  sortBy: 'createdAt' | 'updatedAt' | 'title'
  sortOrder: 'asc' | 'desc'
}