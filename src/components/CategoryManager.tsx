import React, { useState } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import { Folder, Edit3, Trash2, Check, X, AlertCircle, Plus } from 'lucide-react'

export const CategoryManager: React.FC = () => {
  const { getCategories, renameCategory, deleteCategory } = useKnowledgeStore()
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const categories = getCategories()

  const handleRename = (oldCategory: string) => {
    if (!newCategoryName.trim()) return
    renameCategory(oldCategory, newCategoryName.trim())
    setEditingCategory(null)
    setNewCategoryName('')
    setStatus('success')
    setStatusMessage(`已重新命名「${oldCategory}」為「${newCategoryName.trim()}」`)
    setTimeout(() => {
      setStatus('idle')
      setStatusMessage('')
    }, 3000)
  }

  const handleDelete = (category: string) => {
    if (window.confirm(`確定要刪除分類「${category}」嗎？此操作會從所有項目中移除此分類，但不會刪除項目。`)) {
      deleteCategory(category)
      setStatus('success')
      setStatusMessage(`已刪除分類「${category}」`)
      setTimeout(() => {
        setStatus('idle')
        setStatusMessage('')
      }, 3000)
    }
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
          <Folder className="h-5 w-5" />
          分類管理
        </h3>
        <p className="text-sm text-gray-500">
          尚無分類。將知識項目分配到分類中，即可在此管理。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
        <Folder className="h-5 w-5" />
        分類管理
      </h3>

      <div className="space-y-3">
        {/* 分類列表 */}
        <div className="flex flex-wrap gap-2">
          {categories.map(({ category, count }) => (
            <div
              key={category}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm group"
            >
              <Folder className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">{category}</span>
              <span className="text-xs text-gray-500">({count})</span>

              {/* 操作按鈕 */}
              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingCategory(category)
                    setNewCategoryName(category)
                  }}
                  className="p-0.5 text-gray-500 hover:text-blue-600 rounded transition-colors"
                  title="重新命名"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="p-0.5 text-gray-500 hover:text-red-600 rounded transition-colors"
                  title="刪除分類"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 重新命名對話框 */}
        {editingCategory && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-800">
                重新命名「{editingCategory}」：
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 text-sm border border-blue-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(editingCategory)
                  if (e.key === 'Escape') {
                    setEditingCategory(null)
                    setNewCategoryName('')
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => handleRename(editingCategory)}
                disabled={!newCategoryName.trim() || newCategoryName === editingCategory}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                確認
              </button>
              <button
                onClick={() => {
                  setEditingCategory(null)
                  setNewCategoryName('')
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* 狀態訊息 */}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            {statusMessage}
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  )
}
