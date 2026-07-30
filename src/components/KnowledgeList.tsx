import React, { useState, useEffect, useRef } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import type { KnowledgeItem } from '../types'
import { FileText, Edit, Trash2, Calendar, Tag, Eye, X, Download, AlertCircle, Folder, Play, File, Star } from 'lucide-react'
import { marked } from 'marked'

interface KnowledgeListProps {
  onEdit: (item: KnowledgeItem) => void
}

export const KnowledgeList: React.FC<KnowledgeListProps> = ({ onEdit }) => {
  const { getFilteredItems, deleteItem, setSelectedItem, viewMode, toggleFavorite } = useKnowledgeStore()
  const [activeViewerUrl, setActiveViewerUrl] = useState<string | null>(null)
  const [activeViewerTitle, setActiveViewerTitle] = useState<string>('')
  const [activeViewerType, setActiveViewerType] = useState<'pdf' | 'image' | 'video' | 'document'>('pdf')
  const [activeViewerFileDataList, setActiveViewerFileDataList] = useState<string[]>([])
  const [activePdfIndex, setActivePdfIndex] = useState(0)
  const [isPdfMaximized, setIsPdfMaximized] = useState(false)
  const [pdfPages, setPdfPages] = useState<Array<{ url: string; width: number; height: number }>>([])
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const pdfCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const items = getFilteredItems()

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`確定要刪除「${title}」嗎？`)) {
      deleteItem(id)
    }
  }

  const openViewer = (item: KnowledgeItem) => {
    if (item.fileData) {
      setActiveViewerUrl(item.fileData)
      setActiveViewerTitle(item.title)
      setActiveViewerType(
        item.source === 'image' ? 'image'
        : item.source === 'video' ? 'video'
        : item.source === 'document' ? 'document'
        : 'pdf'
      )
      setActiveViewerFileDataList(item.fileDataList || [item.fileData])
      setActivePdfIndex(0)

      // 如果是 PDF，使用 canvas 渲染
      if (item.source === 'pdf') {
        renderPdfToCanvas(item.fileData)
      }
    }
  }

  const renderPdfToCanvas = async (dataUrl: string) => {
    setPdfLoading(true)
    setPdfError(null)
    setPdfPages([])

    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

      // 將 base64 轉換為 ArrayBuffer
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }

      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
      const pages: Array<{ url: string; width: number; height: number }> = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) continue

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.maxWidth = '100%'
        canvas.style.height = 'auto'

        await page.render({
          canvasContext: context,
          viewport,
        }).promise

        const pageUrl = canvas.toDataURL('image/png')
        pages.push({
          url: pageUrl,
          width: viewport.width,
          height: viewport.height,
        })
      }

      setPdfPages(pages)
    } catch (error) {
      console.error('PDF render error:', error)
      setPdfError(error instanceof Error ? error.message : '渲染 PDF 時發生錯誤')
    } finally {
      setPdfLoading(false)
    }
  }

  const switchPdf = (index: number) => {
    setActivePdfIndex(index)
    renderPdfToCanvas(activeViewerFileDataList[index])
  }

  const closeViewer = () => {
    setActiveViewerUrl(null)
    setActiveViewerTitle('')
    setActiveViewerFileDataList([])
    setActivePdfIndex(0)
    setIsPdfMaximized(false)
    setPdfPages([])
    setPdfError(null)
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

  // 圖示檢視 - Grid of cards with thumbnails
  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-white cursor-pointer"
          onClick={() => {
            if (item.fileData) {
              openViewer(item)
            } else {
              setSelectedItem(item)
            }
          }}
        >
          {/* 縮圖預覽 - 點擊直接開啟檔案 */}
          <div
            className="mb-3 cursor-pointer"
            onClick={() => {
              if (item.fileData) {
                openViewer(item)
              } else {
                setSelectedItem(item)
              }
            }}
          >
            {item.source === 'image' && item.fileData ? (
              <img
                src={item.fileData}
                alt={item.title}
                className="w-full h-24 object-cover rounded border hover:opacity-90 transition-opacity"
              />
            ) : item.source === 'video' && item.fileData ? (
              <div className="relative w-full h-24 bg-gray-100 rounded border flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Play className="h-8 w-8 text-gray-400" />
              </div>
            ) : item.source === 'document' && item.fileData ? (
              <div className="relative w-full h-24 bg-gray-100 rounded border flex items-center justify-center hover:bg-gray-200 transition-colors">
                <File className="h-8 w-8 text-gray-400" />
              </div>
            ) : item.source === 'pdf' && item.fileData ? (
              <div className="relative w-full h-24 bg-gray-100 rounded border flex items-center justify-center hover:bg-gray-200 transition-colors">
                <FileText className="h-8 w-8 text-gray-400" />
                {item.fileDataList && item.fileDataList.length > 1 && (
                  <span className="absolute top-1 right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.fileDataList.length}
                  </span>
                )}
              </div>
            ) : (
              <div
                className="w-full h-24 bg-gray-100 rounded border flex items-center justify-center cursor-default"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedItem(item)
                }}
              >
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          <h3
            className="text-sm font-semibold text-gray-800 line-clamp-1 mb-1 cursor-pointer"
            onClick={() => {
              if (item.fileData) {
                openViewer(item)
              } else {
                setSelectedItem(item)
              }
            }}
          >
            {item.title}
          </h3>

          {item.category && (
            <div className="mb-2">
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                <Folder className="h-3 w-3" />
                {item.category}
              </span>
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{new Date(item.updatedAt).toLocaleDateString('zh-TW')}</span>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(item.id)
                }}
                className={`p-0.5 rounded transition-colors ${
                  item.isFavorite
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-gray-400 hover:text-yellow-500'
                }`}
                title={item.isFavorite ? '取消收藏' : '收藏'}
              >
                <Star className={`h-3 w-3 ${item.isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(item)
                }}
                className="p-0.5 text-gray-500 hover:text-blue-600 rounded"
                title="編輯"
              >
                <Edit className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(item.id, item.title)
                }}
                className="p-0.5 text-gray-500 hover:text-red-600 rounded"
                title="刪除"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // 並排檢視 - List with side-by-side layout
  const renderListView = () => (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white flex gap-4 items-center"
        >
          {/* 左側縮圖 */}
          <div className="flex-shrink-0">
            {item.source === 'image' && item.fileData ? (
              <img
                src={item.fileData}
                alt={item.title}
                className="w-20 h-20 object-cover rounded border cursor-pointer"
                onClick={() => openViewer(item)}
              />
            ) : item.source === 'video' && item.fileData ? (
              <div
                className="relative w-20 h-20 bg-gray-100 rounded border flex items-center justify-center cursor-pointer"
                onClick={() => openViewer(item)}
              >
                <Play className="h-8 w-8 text-gray-400" />
              </div>
            ) : item.source === 'document' && item.fileData ? (
              <div
                className="relative w-20 h-20 bg-gray-100 rounded border flex items-center justify-center cursor-pointer"
                onClick={() => openViewer(item)}
              >
                <File className="h-8 w-8 text-gray-400" />
              </div>
            ) : item.source === 'pdf' && item.fileData ? (
              <div
                className="relative w-20 h-20 bg-gray-100 rounded border flex items-center justify-center cursor-pointer"
                onClick={() => openViewer(item)}
              >
                <FileText className="h-8 w-8 text-gray-400" />
                {item.fileDataList && item.fileDataList.length > 1 && (
                  <span className="absolute top-0.5 right-0.5 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {item.fileDataList.length}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* 中間內容 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">
              {item.title}
            </h3>
            <div
              className="text-gray-600 text-sm mb-2 line-clamp-2"
              dangerouslySetInnerHTML={{
                __html: marked(item.content.substring(0, 200)) as string
              }}
            />
            {item.notes && (
              <div className="text-xs text-yellow-700 mb-2 line-clamp-1">
                📝 {item.notes}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(item.updatedAt).toLocaleDateString('zh-TW')}
              </span>
              {item.category && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  <Folder className="h-3 w-3" />
                  {item.category}
                </span>
              )}
              {item.sourceFile && (
                <span className="text-blue-600">來源: {item.sourceFile}</span>
              )}
              {item.tags.length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {item.tags.join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* 右側操作 */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => toggleFavorite(item.id)}
              className={`p-1 rounded transition-colors ${
                item.isFavorite
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-400 hover:text-yellow-500'
              }`}
              title={item.isFavorite ? '取消收藏' : '收藏'}
            >
              <Star className={`h-4 w-4 ${item.isFavorite ? 'fill-current' : ''}`} />
            </button>
            {item.fileData && (
              <button
                onClick={() => openViewer(item)}
                className="p-1 text-gray-500 hover:text-blue-600 rounded"
                title={
                  item.source === 'image' ? '檢視圖片'
                  : item.source === 'video' ? '播放影片'
                  : item.source === 'document' ? '下載文檔'
                  : '檢視原始 PDF'
                }
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
      ))}
    </div>
  )

  // 詳細資料檢視 - Full detail with expandable content
  const renderDetailView = () => (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-semibold text-gray-800 line-clamp-1 flex-1">
              {item.title}
            </h3>
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <button
                onClick={() => toggleFavorite(item.id)}
                className={`p-1 rounded transition-colors ${
                  item.isFavorite
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-gray-400 hover:text-yellow-500'
                }`}
                title={item.isFavorite ? '取消收藏' : '收藏'}
              >
                <Star className={`h-4 w-4 ${item.isFavorite ? 'fill-current' : ''}`} />
              </button>
              {item.fileData && (
                <button
                  onClick={() => openViewer(item)}
                  className="p-1 text-gray-500 hover:text-blue-600 rounded"
                  title={
                    item.source === 'image' ? '檢視圖片'
                    : item.source === 'video' ? '播放影片'
                    : item.source === 'document' ? '下載文檔'
                    : '檢視原始 PDF'
                  }
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

          {/* 圖片縮圖 */}
          {item.source === 'image' && item.fileData && (
            <div
              className="mb-3 cursor-pointer rounded overflow-hidden"
              onClick={() => openViewer(item)}
            >
              <img
                src={item.fileData}
                alt={item.title}
                className="max-h-48 w-auto rounded border hover:opacity-90 transition-opacity object-contain"
              />
            </div>
          )}

          {/* 影片縮圖 */}
          {item.source === 'video' && item.fileData && (
            <div
              className="mb-3 cursor-pointer rounded overflow-hidden flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
              onClick={() => openViewer(item)}
            >
              <Play className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* 文檔縮圖 */}
          {item.source === 'document' && item.fileData && (
            <div
              className="mb-3 cursor-pointer rounded overflow-hidden flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
              onClick={() => openViewer(item)}
            >
              <File className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* 內容預覽 */}
          <div
            className="text-gray-600 text-sm mb-3 line-clamp-6 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: marked(item.content.substring(0, 1000)) as string
            }}
          />

          {/* 備註 */}
          {item.notes && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <span className="text-xs font-medium text-yellow-800">備註：</span>
              <span className="text-xs text-gray-700">{item.notes}</span>
            </div>
          )}

          {/* 元資料 */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>建立: {new Date(item.createdAt).toLocaleDateString('zh-TW')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>更新: {new Date(item.updatedAt).toLocaleDateString('zh-TW')}</span>
            </div>
            {item.category && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                <Folder className="h-3 w-3" />
                {item.category}
              </span>
            )}
            {item.sourceFile && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                來源: {item.sourceFile}
              </span>
            )}
            {item.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'detail' && renderDetailView()}

      {/* PDF/圖片檢視器 */}
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
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-800 line-clamp-1">{activeViewerTitle}</h2>
                {activeViewerType === 'pdf' && activeViewerFileDataList.length > 1 && (
                  <select
                    value={activePdfIndex}
                    onChange={(e) => switchPdf(Number(e.target.value))}
                    className="text-xs border rounded px-2 py-1 bg-gray-50 flex-shrink-0"
                  >
                    {activeViewerFileDataList.map((_, idx) => (
                      <option key={idx} value={idx}>
                        PDF {idx + 1}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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
                  onClick={closeViewer}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="關閉"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 overflow-auto flex flex-col items-center">
              {activeViewerType === 'image' ? (
                <img
                  src={activeViewerUrl}
                  alt={activeViewerTitle}
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : activeViewerType === 'video' ? (
                <video
                  src={activeViewerUrl}
                  controls
                  className="max-w-full max-h-full object-contain p-2"
                  autoPlay
                />
              ) : activeViewerType === 'document' ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <File className="h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">此文檔無法在瀏覽器中預覽</p>
                  <a
                    href={activeViewerUrl}
                    download={activeViewerTitle}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    下載文檔
                  </a>
                </div>
              ) : (
                <>
                  {pdfLoading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">渲染 PDF 中...</span>
                    </div>
                  )}

                  {pdfError && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-red-400 mb-2" />
                      <p className="text-gray-600 mb-4">{pdfError}</p>
                      <a
                        href={activeViewerUrl}
                        download={activeViewerTitle}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        下載 PDF
                      </a>
                    </div>
                  )}

                  {!pdfLoading && !pdfError && pdfPages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-gray-600 mb-4">無法渲染此 PDF，請下載檢視</p>
                      <a
                        href={activeViewerUrl}
                        download={activeViewerTitle}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        下載 PDF
                      </a>
                    </div>
                  )}

                  {!pdfLoading && pdfPages.map((page, idx) => (
                    <img
                      key={idx}
                      src={page.url}
                      alt={`PDF 第 ${idx + 1} 頁`}
                      className="max-w-full mb-2 shadow-sm"
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
