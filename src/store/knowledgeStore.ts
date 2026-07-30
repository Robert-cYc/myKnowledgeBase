import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import type { KnowledgeItem, SearchFilters, ViewMode } from '../types'
import { suggestTags } from '../utils/classifier'

const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const request = indexedDB.open('KnowledgeDB', 1)
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store')
        }
      }
      request.onsuccess = (e: any) => {
        const db = e.target.result
        const transaction = db.transaction('store', 'readonly')
        const store = transaction.objectStore('store')
        const getReq = store.get(name)
        getReq.onsuccess = async () => {
          if (getReq.result) {
            resolve(getReq.result)
          } else {
            // 嘗試從 localStorage 遷移
            const localData = localStorage.getItem(name)
            if (localData) {
              // 寫入 IndexedDB
              await indexedDBStorage.setItem(name, localData)
              // 清除 localStorage
              localStorage.removeItem(name)
              resolve(localData)
            } else {
              resolve(null)
            }
          }
        }
        getReq.onerror = () => resolve(null)
      }
      request.onerror = () => resolve(null)
    })
  },
  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      const request = indexedDB.open('KnowledgeDB', 1)
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store')
        }
      }
      request.onsuccess = (e: any) => {
        const db = e.target.result
        const transaction = db.transaction('store', 'readwrite')
        const store = transaction.objectStore('store')
        const putReq = store.put(value, name)
        putReq.onsuccess = () => resolve()
        putReq.onerror = () => resolve()
      }
      request.onerror = () => resolve()
    })
  },
  removeItem: async (name: string): Promise<void> => {
    return new Promise((resolve) => {
      const request = indexedDB.open('KnowledgeDB', 1)
      request.onsuccess = (e: any) => {
        const db = e.target.result
        const transaction = db.transaction('store', 'readwrite')
        const store = transaction.objectStore('store')
        const delReq = store.delete(name)
        delReq.onsuccess = () => resolve()
        delReq.onerror = () => resolve()
      }
      request.onerror = () => resolve()
    })
  }
}

export type ImportMode = 'merge' | 'replace'

export interface ExportData {
  version: string
  exportedAt: string
  itemCount: number
  items: KnowledgeItem[]
}

interface KnowledgeState {
  items: KnowledgeItem[]
  searchFilters: SearchFilters
  selectedItem: KnowledgeItem | null
  viewMode: ViewMode
  addItem: (item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateItem: (id: string, item: Partial<KnowledgeItem>) => void
  deleteItem: (id: string) => void
  importItem: (item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  setSearchFilters: (filters: Partial<SearchFilters>) => void
  setSelectedItem: (item: KnowledgeItem | null) => void
  setViewMode: (mode: ViewMode) => void
  getFilteredItems: () => KnowledgeItem[]
  getItemById: (id: string) => KnowledgeItem | undefined
  exportData: () => ExportData
  importData: (data: ExportData, mode: ImportMode) => void
  autoClassifyItem: (id: string) => string[]
  autoClassifyAll: () => void
  renameTag: (oldTag: string, newTag: string) => void
  mergeTags: (sourceTags: string[], targetTag: string) => void
  deleteTag: (tag: string) => void
  getAllTags: () => Array<{ tag: string; count: number }>
  setItemCategory: (id: string, category: string | undefined) => void
  renameCategory: (oldCategory: string, newCategory: string) => void
  deleteCategory: (category: string) => void
  getCategories: () => Array<{ category: string; count: number }>
  toggleFavorite: (id: string) => void
}

export const useKnowledgeStore = create<KnowledgeState>()(
  persist(
    (set, get) => ({
      items: [],
      searchFilters: {
        query: '',
        tags: [],
        category: undefined,
        showFavorites: false,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
      selectedItem: null,
      viewMode: 'list' as ViewMode,

      addItem: (item) => {
        const newItem: KnowledgeItem = {
          ...item,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({
          items: [...state.items, newItem],
        }))
      },

      updateItem: (id, updatedItem) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...updatedItem, updatedAt: new Date().toISOString() }
              : item
          ),
        }))
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
        }))
      },

      importItem: (item) => {
        const existingItem = get().items.find((i) => i.sourceFile === item.sourceFile)
        if (existingItem) {
          // 更新現有項目
          get().updateItem(existingItem.id, item)
        } else {
          // 新增新項目
          get().addItem(item)
        }
      },

      setSearchFilters: (filters) => {
        set((state) => ({
          searchFilters: { ...state.searchFilters, ...filters },
        }))
      },

      setSelectedItem: (item) => {
        set({ selectedItem: item })
      },

      setViewMode: (mode) => {
        set({ viewMode: mode })
      },

      getFilteredItems: () => {
        const { items, searchFilters } = get()
        let filtered = [...items]

        // 關鍵字搜尋
        if (searchFilters.query) {
          const query = searchFilters.query.toLowerCase()
          filtered = filtered.filter(
            (item) =>
              item.title.toLowerCase().includes(query) ||
              item.content.toLowerCase().includes(query) ||
              (item.notes?.toLowerCase().includes(query) ?? false)
          )
        }

        // 標籤篩選
        if (searchFilters.tags.length > 0) {
          filtered = filtered.filter((item) =>
            searchFilters.tags.some((tag) => item.tags.includes(tag))
          )
        }

        // 分類篩選
        if (searchFilters.category) {
          filtered = filtered.filter((item) => item.category === searchFilters.category)
        }

        // 收藏篩選
        if (searchFilters.showFavorites) {
          filtered = filtered.filter((item) => item.isFavorite)
        }

        // 排序
        filtered.sort((a, b) => {
          const sortBy = searchFilters.sortBy
          if (sortBy === 'title') {
            const cmp = a.title.localeCompare(b.title, 'zh-TW', { sensitivity: 'base' })
            return searchFilters.sortOrder === 'asc' ? cmp : -cmp
          }
          const valA = a[sortBy] ?? ''
          const valB = b[sortBy] ?? ''
          if (valA < valB) return searchFilters.sortOrder === 'asc' ? -1 : 1
          if (valA > valB) return searchFilters.sortOrder === 'asc' ? 1 : -1
          return 0
        })

        return filtered
      },

      getItemById: (id) => {
        return get().items.find((item) => item.id === id)
      },

      exportData: () => {
        const items = get().items
        return {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          itemCount: items.length,
          items,
        }
      },

      importData: (data, mode) => {
        if (mode === 'replace') {
          set({ items: data.items, selectedItem: null })
        } else {
          // merge: add items that don't already exist (by id)
          const existingIds = new Set(get().items.map((i) => i.id))
          const newItems = data.items.filter((i) => !existingIds.has(i.id))
          set((state) => ({
            items: [...state.items, ...newItems],
          }))
        }
      },

      autoClassifyItem: (id) => {
        const item = get().items.find((i) => i.id === id)
        if (!item) return []

        const suggestedTags = suggestTags(item.title, item.content, item.tags)
        if (suggestedTags.length > 0) {
          get().updateItem(id, {
            tags: [...item.tags, ...suggestedTags],
          })
        }
        return suggestedTags
      },

      autoClassifyAll: () => {
        set((state) => ({
          items: state.items.map((item) => {
            const suggestedTags = suggestTags(item.title, item.content, item.tags)
            if (suggestedTags.length > 0) {
              return {
                ...item,
                tags: [...item.tags, ...suggestedTags],
                updatedAt: new Date().toISOString(),
              }
            }
            return item
          }),
        }))
      },

      renameTag: (oldTag, newTag) => {
        if (!newTag.trim() || oldTag === newTag) return
        set((state) => ({
          items: state.items.map((item) =>
            item.tags.includes(oldTag)
              ? {
                  ...item,
                  tags: item.tags.map((t) => (t === oldTag ? newTag : t)),
                  updatedAt: new Date().toISOString(),
                }
              : item
          ),
        }))
      },

      mergeTags: (sourceTags, targetTag) => {
        if (!targetTag.trim() || sourceTags.length === 0) return
        set((state) => ({
          items: state.items.map((item) => {
            const hasSourceTag = item.tags.some((t) => sourceTags.includes(t))
            if (!hasSourceTag) return item

            const newTags = item.tags
              .filter((t) => !sourceTags.includes(t))
              .filter((t) => t !== targetTag)
            newTags.push(targetTag)

            return {
              ...item,
              tags: newTags,
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },

      deleteTag: (tag) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.tags.includes(tag)
              ? {
                  ...item,
                  tags: item.tags.filter((t) => t !== tag),
                  updatedAt: new Date().toISOString(),
                }
              : item
          ),
        }))
      },

      getAllTags: () => {
        const tagCounts: Record<string, number> = {}
        get().items.forEach((item) => {
          item.tags.forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
          })
        })
        return Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
      },

      setItemCategory: (id, category) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, category, updatedAt: new Date().toISOString() }
              : item
          ),
        }))
      },

      renameCategory: (oldCategory, newCategory) => {
        if (!newCategory.trim() || oldCategory === newCategory) return
        set((state) => ({
          items: state.items.map((item) =>
            item.category === oldCategory
              ? { ...item, category: newCategory, updatedAt: new Date().toISOString() }
              : item
          ),
        }))
      },

      deleteCategory: (category) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.category === category
              ? { ...item, category: undefined, updatedAt: new Date().toISOString() }
              : item
          ),
        }))
      },

      getCategories: () => {
        const categoryCounts: Record<string, number> = {}
        get().items.forEach((item) => {
          if (item.category) {
            categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1
          }
        })
        return Object.entries(categoryCounts)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
      },

      toggleFavorite: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() }
              : item
          ),
        }))
      },
    }),
    {
      name: 'knowledge-storage',
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
)