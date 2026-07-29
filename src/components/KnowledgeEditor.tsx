import React, { useState, useEffect } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import type { KnowledgeItem } from '../types'
import { X, Save, Plus, Eye, Edit3 } from 'lucide-react'
import { marked } from 'marked'

interface KnowledgeEditorProps {
  item?: KnowledgeItem | null
  onClose: () => void
  onSave: () => void
}

export const KnowledgeEditor: React.FC<KnowledgeEditorProps> = ({
  item,
  onClose,
  onSave,
}) => {
  const { addItem, updateItem } = useKnowledgeStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit')

  const renderedMarkdown = marked(content) as string

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setContent(item.content)
      setTags(item.tags.join(', '))
    }
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      alert('請填寫標題和內容')
      return
    }

    const tagList = tags
      .split(/[,\uFF0C]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    if (item) {
      updateItem(item.id, { title, content, tags: tagList })
    } else {
      addItem({
        title,
        content,
        tags: tagList,
        source: 'manual',
      })
    }

    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">
            {item ? '編輯知識項目' : '新增知識項目'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">標題</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入知識項目標題"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">內容（Markdown）</label>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setEditorMode('edit')}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    editorMode === 'edit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Edit3 className="h-3 w-3" />編輯
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('preview')}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    editorMode === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Eye className="h-3 w-3" />預覽
                </button>
              </div>
            </div>
            {editorMode === 'edit' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={14}
                placeholder="輸入知識內容（支援 Markdown 格式）"
                required
              />
            ) : (
              <div
                className="w-full min-h-[14rem] px-3 py-2 border rounded-md bg-gray-50 overflow-auto prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">標籤</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="標籤以逗號分隔，例如: 筆記,技術,學習"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              {item ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {item ? '更新' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}