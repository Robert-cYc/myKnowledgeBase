import React from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import { Search, Tags, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export const SearchBar: React.FC = () => {
  const { searchFilters, setSearchFilters, items } = useKnowledgeStore()

  // 提取所有標籤
  const allTags = Array.from(
    new Set(items.flatMap((item) => item.tags))
  ).sort()

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
          className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

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