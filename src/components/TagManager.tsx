import React, { useState } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import { Tag, Edit3, Trash2, Merge, Check, X, AlertCircle } from 'lucide-react'

export const TagManager: React.FC = () => {
  const { getAllTags, renameTag, mergeTags, deleteTag } = useKnowledgeStore()
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [mergingTags, setMergingTags] = useState<string[]>([])
  const [mergeTarget, setMergeTarget] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const tags = getAllTags()

  const handleRename = (oldTag: string) => {
    if (!newTagName.trim()) return
    renameTag(oldTag, newTagName.trim())
    setEditingTag(null)
    setNewTagName('')
    setStatus('success')
    setStatusMessage(`已重新命名「${oldTag}」為「${newTagName.trim()}」`)
    setTimeout(() => {
      setStatus('idle')
      setStatusMessage('')
    }, 3000)
  }

  const handleDelete = (tag: string) => {
    if (window.confirm(`確定要刪除標籤「${tag}」嗎？此操作會從所有項目中移除此標籤。`)) {
      deleteTag(tag)
      setStatus('success')
      setStatusMessage(`已刪除標籤「${tag}」`)
      setTimeout(() => {
        setStatus('idle')
        setStatusMessage('')
      }, 3000)
    }
  }

  const handleMergeStart = (tag: string) => {
    if (mergingTags.includes(tag)) {
      setMergingTags(mergingTags.filter((t) => t !== tag))
    } else {
      setMergingTags([...mergingTags, tag])
    }
  }

  const handleMergeConfirm = () => {
    if (mergingTags.length === 0 || !mergeTarget.trim()) return

    if (!window.confirm(`確定要合併 ${mergingTags.length} 個標籤到「${mergeTarget}」嗎？`)) {
      return
    }

    mergeTags(mergingTags, mergeTarget.trim())
    setMergingTags([])
    setMergeTarget('')
    setStatus('success')
    setStatusMessage(`已合併 ${mergingTags.length} 個標籤到「${mergeTarget}」`)
    setTimeout(() => {
      setStatus('idle')
      setStatusMessage('')
    }, 3000)
  }

  const handleMergeCancel = () => {
    setMergingTags([])
    setMergeTarget('')
  }

  if (tags.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
        <Tag className="h-5 w-5" />
        標籤管理
      </h3>

      <div className="space-y-3">
        {/* 標籤列表 */}
        <div className="flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => (
            <div
              key={tag}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm group"
            >
              <span className="font-medium text-gray-700">{tag}</span>
              <span className="text-xs text-gray-500">({count})</span>

              {/* 操作按鈕 */}
              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingTag(tag)
                    setNewTagName(tag)
                  }}
                  className="p-0.5 text-gray-500 hover:text-blue-600 rounded transition-colors"
                  title="重新命名"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleMergeStart(tag)}
                  className={`p-0.5 rounded transition-colors ${
                    mergingTags.includes(tag)
                      ? 'text-purple-600 bg-purple-100'
                      : 'text-gray-500 hover:text-purple-600'
                  }`}
                  title="選擇合併"
                >
                  <Merge className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDelete(tag)}
                  className="p-0.5 text-gray-500 hover:text-red-600 rounded transition-colors"
                  title="刪除"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 合併模式 */}
        {mergingTags.length > 0 && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-purple-800">
                合併 {mergingTags.length} 個標籤到：
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {mergingTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                placeholder="目標標籤名稱..."
                className="flex-1 text-sm border border-purple-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleMergeConfirm}
                disabled={!mergeTarget.trim()}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                確認
              </button>
              <button
                onClick={handleMergeCancel}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* 重新命名對話框 */}
        {editingTag && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-800">
                重新命名「{editingTag}」：
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1 text-sm border border-blue-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(editingTag)
                  if (e.key === 'Escape') {
                    setEditingTag(null)
                    setNewTagName('')
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => handleRename(editingTag)}
                disabled={!newTagName.trim() || newTagName === editingTag}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                確認
              </button>
              <button
                onClick={() => {
                  setEditingTag(null)
                  setNewTagName('')
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
