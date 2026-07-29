import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import type { KnowledgeItem, SearchFilters } from '../types'

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

interface KnowledgeState {
  items: KnowledgeItem[]
  searchFilters: SearchFilters
  selectedItem: KnowledgeItem | null
  addItem: (item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateItem: (id: string, item: Partial<KnowledgeItem>) => void
  deleteItem: (id: string) => void
  importItem: (item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  setSearchFilters: (filters: Partial<SearchFilters>) => void
  setSelectedItem: (item: KnowledgeItem | null) => void
  getFilteredItems: () => KnowledgeItem[]
  getItemById: (id: string) => KnowledgeItem | undefined
}

export const useKnowledgeStore = create<KnowledgeState>()(
  persist(
    (set, get) => ({
      items: [],
      searchFilters: {
        query: '',
        tags: [],
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
      selectedItem: null,

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

      getFilteredItems: () => {
        const { items, searchFilters } = get()
        let filtered = [...items]

        // 關鍵字搜尋
        if (searchFilters.query) {
          const query = searchFilters.query.toLowerCase()
          filtered = filtered.filter(
            (item) =>
              item.title.toLowerCase().includes(query) ||
              item.content.toLowerCase().includes(query)
          )
        }

        // 標籤篩選
        if (searchFilters.tags.length > 0) {
          filtered = filtered.filter((item) =>
            searchFilters.tags.some((tag) => item.tags.includes(tag))
          )
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
    }),
    {
      name: 'knowledge-storage',
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
)