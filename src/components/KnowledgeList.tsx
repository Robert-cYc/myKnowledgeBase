import React, { useState } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import type { KnowledgeItem } from '../types'
import { FileText, Edit, Trash2, Calendar, Tag, Eye, X } from 'lucide-react'
import { marked } from 'marked'

interface KnowledgeListProps {
  onEdit: (item: KnowledgeItem) => void
}

export const KnowledgeList: React.FC<KnowledgeListProps> = ({ onEdit }) => {
  const { getFilteredItems, deleteItem, setSelectedItem } = useKnowledgeStore()
  const [activeViewerUrl, setActiveViewerUrl] = useState<string | null>(null)
  const [activeViewerTitle, setActiveViewerTitle] = useState<string>('')
  const [activeViewerType, setActiveViewerType] = useState<'pdf' | 'image'>('pdf')
  const [isPdfMaximized, setIsPdfMaximized] = useState(false)
  const items = getFilteredItems()

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`確定要刪除「${title}」嗎？`)) {
      deleteItem(id)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-600">沒有知識項目</h3>
        <p className="text-gray-500 mt-2">請新增或匯入知識項目</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">
              {item.title}
            </h3>
            <div className="flex gap-2">
              {item.fileData && (
                <button
                  onClick={() => {
                    setActiveViewerUrl(item.fileData!)
                    setActiveViewerTitle(item.title)
                    setActiveViewerType(item.source === 'image' ? 'image' : 'pdf')
                  }}
                  className="p-1 text-gray-500 hover:text-blue-600 rounded"
                  title={item.source === 'image' ? '檢視圖片' : '檢視原始 PDF'}
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => onEdit(item)}
                className="p-1 text-gray-500 hover:text-blue-600 rounded"
                title="編輯"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(item.id, item.title)}
                className="p-1 text-gray-500 hover:text-red-600 rounded"
                title="刪除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 圖片縮圖預覽 */}
          {item.source === 'image' && item.fileData ? (
            <div
              className="mb-3 cursor-pointer rounded overflow-hidden"
              onClick={() => {
                setActiveViewerUrl(item.fileData!)
                setActiveViewerTitle(item.title)
                setActiveViewerType('image')
              }}
            >
              <img
                src={item.fileData}
                alt={item.title}
                className="max-h-48 w-auto rounded border hover:opacity-90 transition-opacity object-contain"
              />
            </div>
          ) : (
            <div
              className="text-gray-600 text-sm mb-3 line-clamp-3 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: marked(item.content.substring(0, 500)) as string
              }}
            />
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(item.updatedAt).toLocaleDateString('zh-TW')}
              </span>
              {item.sourceFile && (
                item.fileData ? (
                  <button
                    onClick={() => {
                      setActiveViewerUrl(item.fileData!)
                      setActiveViewerTitle(item.title)
                      setActiveViewerType(item.source === 'image' ? 'image' : 'pdf')
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
                    title={item.source === 'image' ? '點擊檢視圖片' : '點擊檢視原始 PDF 檔案'}
                  >
                    來源: {item.sourceFile}
                  </button>
                ) : (
                  <span className="text-blue-600">來源: {item.sourceFile}</span>
                )
              )}
            </div>
            {item.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>{item.tags.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {activeViewerUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-all duration-300"
          style={{ padding: isPdfMaximized ? 0 : '1rem' }}
        >
          <div
            className={`bg-white flex flex-col shadow-2xl transition-all duration-300 ${
              isPdfMaximized
                ? 'w-full h-full rounded-none'
                : 'w-full max-w-4xl max-h-[95vh] rounded-lg'
            }`}
          >
            <div className="flex justify-between items-center p-3 border-b flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800 line-clamp-1 mr-2">{activeViewerTitle}</h2>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setIsPdfMaximized((v) => !v)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title={isPdfMaximized ? '還原視窗' : '最大化'}
                >
                  {isPdfMaximized ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 14 10 14 10 20"/>
                      <polyline points="20 10 14 10 14 4"/>
                      <line x1="10" y1="14" x2="3" y2="21"/>
                      <line x1="21" y1="3" x2="14" y2="10"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/>
                      <polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/>
                      <line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveViewerUrl(null)
                    setActiveViewerTitle('')
                    setIsPdfMaximized(false)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="關閉"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 overflow-hidden flex items-center justify-center">
              {activeViewerType === 'image' ? (
                <img
                  src={activeViewerUrl}
                  alt={activeViewerTitle}
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <iframe
                  src={activeViewerUrl}
                  title={activeViewerTitle}
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}