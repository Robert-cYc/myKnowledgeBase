import React from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import { Search, Tags, X, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, List, LayoutList, Folder, Star } from 'lucide-react'
import type { ViewMode } from '../types'

export const SearchBar: React.FC = () => {
  const { searchFilters, setSearchFilters, items, viewMode, setViewMode, getCategories } = useKnowledgeStore()

  // 提取所有標籤
  const allTags = Array.from(
    new Set(items.flatMap((item) => item.tags))
  ).sort()

  // 提取所有分類
  const allCategories = getCategories().map((c) => c.category)

  const handleTagClick = (tag: string) => {
    const currentTags = [...searchFilters.tags]
    if (currentTags.includes(tag)) {
      setSearchFilters({ tags: currentTags.filter((t) => t !== tag) })
    } else {
      setSearchFilters({ tags: [...currentTags, tag] })
    }
  }

  const clearTags = () => {
    setSearchFilters({ tags: [] })
  }

  const clearQuery = () => {
    setSearchFilters({ query: '' })
  }

  const clearAll = () => {
    setSearchFilters({
      query: '',
      tags: [],
      category: undefined,
      showFavorites: false,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    })
  }

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchFilters({ sortBy: e.target.value as 'createdAt' | 'updatedAt' | 'title' })
  }

  const toggleSortOrder = () => {
    setSearchFilters({ sortOrder: searchFilters.sortOrder === 'asc' ? 'desc' : 'asc' })
  }

  const sortByLabels: Record<string, string> = {
    updatedAt: '最後更新',
    createdAt: '建立時間',
    title: '標題',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchFilters.query}
          onChange={(e) => setSearchFilters({ query: e.target.value })}
          placeholder="搜尋知識項目..."
          className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchFilters.query && (
          <button
            onClick={clearQuery}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title="清除搜尋"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 分類篩選 */}
      {allCategories.length > 0 && (
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <select
            value={searchFilters.category || ''}
            onChange={(e) => setSearchFilters({ category: e.target.value || undefined })}
            className="flex-1 text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
          >
            <option value="">所有分類</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      {/* 收藏篩選 */}
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <button
          onClick={() => setSearchFilters({ showFavorites: !searchFilters.showFavorites })}
          className={`flex-1 text-sm px-2 py-1 rounded-md transition-colors ${
            searchFilters.showFavorites
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {searchFilters.showFavorites ? '顯示全部' : '僅收藏'}
        </button>
      </div>

      {/* 清除所有篩選 */}
      {(searchFilters.query || searchFilters.tags.length > 0 || searchFilters.category || searchFilters.showFavorites) && (
        <div className="flex justify-end">
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
            title="清除所有搜尋和篩選"
          >
            <X className="h-3 w-3" />
            清除全部
          </button>
        </div>
      )}

      {/* 排序控制 */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-600 flex-shrink-0">排序：</span>
        <select
          value={searchFilters.sortBy}
          onChange={handleSortByChange}
          className="flex-1 text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
        >
          <option value="updatedAt">最後更新</option>
          <option value="createdAt">建立時間</option>
          <option value="title">標題（A → Z）</option>
        </select>
        <button
          onClick={toggleSortOrder}
          title={searchFilters.sortOrder === 'asc' ? '目前：升冪排序（點擊切換為降冪）' : '目前：降冪排序（點擊切換為升冪）'}
          className="flex items-center gap-1 px-2 py-1 text-sm border rounded-md hover:bg-gray-100 transition-colors text-gray-700 flex-shrink-0"
        >
          {searchFilters.sortOrder === 'asc' ? (
            <><ArrowUp className="h-4 w-4" /><span className="text-xs">升冪</span></>
          ) : (
            <><ArrowDown className="h-4 w-4" /><span className="text-xs">降冪</span></>
          )}
        </button>
      </div>

      {/* 視圖模式切換 */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-600 flex-shrink-0">檢視：</span>
        <div className="flex gap-1 bg-gray-100 rounded-md p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            title="圖示檢視"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            title="並排檢視"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('detail')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'detail'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            title="詳細資料檢視"
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Tags className="h-3 w-3" />
              標籤篩選
            </span>
            {searchFilters.tags.length > 0 && (
              <button
                onClick={clearTags}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                清除
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  searchFilters.tags.includes(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}