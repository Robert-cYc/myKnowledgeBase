import React, { useState, useEffect, useRef } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import type { KnowledgeItem, SourceType } from '../types'
import { processFile } from '../utils/fileProcessor'
import { X, Save, Plus, Eye, Edit3, Folder, FileUp, FileText, AlertCircle, Loader2, Star } from 'lucide-react'
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
  const { addItem, updateItem, getCategories, toggleFavorite } = useKnowledgeStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit')
  const [source, setSource] = useState<SourceType>('manual')
  const [fileData, setFileData] = useState<string | undefined>(undefined)
  const [fileDataList, setFileDataList] = useState<string[] | undefined>(undefined)
  const [sourceFile, setSourceFile] = useState<string | undefined>(undefined)
  const [fileImportStatus, setFileImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [fileImportMessage, setFileImportMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const renderedMarkdown = marked(content) as string

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setContent(item.content)
      setTags(item.tags.join(', '))
      setNotes(item.notes || '')
      setIsFavorite(item.isFavorite || false)
      setCategory(item.category || '')
      setSource(item.source)
      setFileData(item.fileData)
      setFileDataList(item.fileDataList)
      setSourceFile(item.sourceFile)
    }
  }, [item])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setFileImportStatus('loading')
    setFileImportMessage(`正在處理 ${files.length} 個檔案...`)

    try {
      if (files.length === 1) {
        // 單一檔案
        const result = await processFile(files[0])
        setTitle(result.title)
        setContent(result.content)
        setSource(result.source)
        setFileData(result.fileData)
        setFileDataList(result.fileData ? [result.fileData] : undefined)
        setSourceFile(result.fileName)
      } else {
        // 多個檔案合併
        const results = []
        const errorFiles: string[] = []

        for (const file of files) {
          try {
            const result = await processFile(file)
            results.push(result)
          } catch (error) {
            console.error('Import error:', error)
            errorFiles.push(file.name)
          }
        }

        if (results.length === 0) {
          throw new Error(
            errorFiles.length > 0
              ? `匯入失敗：${errorFiles.join(', ')}`
              : '匯入失敗'
          )
        }

        const combinedContent = results
          .map((r, i) => {
            const separator = i > 0 ? `\n\n---\n\n## ${r.title}\n\n` : ''
            return separator + r.content
          })
          .join('\n\n')

        setTitle(results[0].title)
        setContent(combinedContent)
        setSource(results.find((r) => r.source === 'pdf')?.source || results[0].source)
        const allFileData = results.filter((r) => r.fileData).map((r) => r.fileData!)
        setFileData(allFileData[0])
        setFileDataList(allFileData.length > 0 ? allFileData : undefined)
        setSourceFile(results.map((r) => r.fileName).join(', '))
      }

      setFileImportStatus('success')
      setFileImportMessage(`成功處理 ${files.length} 個檔案`)
    } catch (error) {
      console.error('Import error:', error)
      setFileImportStatus('error')
      setFileImportMessage(
        error instanceof Error ? error.message : '匯入失敗'
      )
    }

    // 重置檔案輸入
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // 清除訊息
    setTimeout(() => {
      setFileImportStatus('idle')
      setFileImportMessage('')
    }, 4000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      alert('請填寫標題和內容')
      return
    }

    const tagList = tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    const finalCategory = category === '__custom__' ? customCategory.trim() : category || undefined

    const finalNotes = notes.trim() || undefined

    if (item) {
      updateItem(item.id, {
        title,
        content,
        tags: tagList,
        category: finalCategory,
        source,
        sourceFile,
        fileData,
        fileDataList,
        notes: finalNotes,
        isFavorite,
      })
    } else {
      addItem({
        title,
        content,
        tags: tagList,
        category: finalCategory,
        source,
        sourceFile,
        fileData,
        fileDataList,
        notes: finalNotes,
        isFavorite,
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
          <div className="flex items-center gap-1">
            {item && (
              <button
                type="button"
                onClick={() => toggleFavorite(item.id)}
                className={`p-2 rounded-full transition-colors ${
                  isFavorite
                    ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-100'
                    : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
                }`}
                title={isFavorite ? '取消收藏' : '收藏'}
              >
                <Star className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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

          {/* 檔案匯入區塊 */}
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1">
              <FileUp className="h-4 w-4" />
              匯入檔案
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.md,.markdown,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.mp4,.webm,.ogg,.mov,.avi,.mkv,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="editor-file-input"
              disabled={fileImportStatus === 'loading'}
            />
            <label
              htmlFor="editor-file-input"
              className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                fileImportStatus === 'loading'
                  ? 'opacity-60 bg-gray-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              {fileImportStatus === 'loading' ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              ) : (
                <FileText className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {fileImportStatus === 'loading'
                  ? fileImportMessage
                  : '點擊選擇檔案 (PDF、Markdown、圖片、影片或文檔)'}
              </span>
            </label>
            {fileImportStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                <FileText className="h-4 w-4" />
                {fileImportMessage}
              </div>
            )}
            {fileImportStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                <AlertCircle className="h-4 w-4" />
                {fileImportMessage}
              </div>
            )}
            {sourceFile && (
              <div className="text-xs text-gray-500 mt-2">
                來源: {sourceFile}
              </div>
            )}
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

          <div>
            <label className="block text-sm font-medium mb-1">備註</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="輸入備註資訊（選填）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1">
              <Folder className="h-4 w-4" />
              分類
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                if (e.target.value !== '__custom__') {
                  setCustomCategory('')
                }
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            >
              <option value="">未分類</option>
              {getCategories().map(({ category }) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              <option value="__custom__">其他...</option>
            </select>
            {category === '__custom__' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入分類名稱"
              />
            )}
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
