import React, { useRef, useState } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import { processFiles } from '../utils/fileProcessor'
import { FileUp, FileText, AlertCircle, Check, Loader2 } from 'lucide-react'

export const FileImporter: React.FC = () => {
  const { importItem } = useKnowledgeStore()
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setImportStatus('loading')
    setStatusMessage(`正在處理 ${files.length} 個檔案...`)

    try {
      const { combinedContent, combinedTitle, primarySource, primaryFileData, fileDataList, sourceFiles } = await processFiles(files)

      importItem({
        title: combinedTitle,
        content: combinedContent.substring(0, 500000), // 最多 50 萬字元
        tags: [],
        source: primarySource,
        sourceFile: sourceFiles.join(', '),
        fileData: primaryFileData,
        fileDataList: fileDataList.length > 0 ? fileDataList : undefined,
      })

      setImportStatus('success')
      setStatusMessage(`成功匯入 ${sourceFiles.length} 個檔案為一個項目`)
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus('error')
      setStatusMessage(
        error instanceof Error ? error.message : '匯入失敗'
      )
    }

    // 重置檔案輸入
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // 清除訊息
    setTimeout(() => {
      setImportStatus('idle')
      setStatusMessage('')
    }, 4000)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
        <FileUp className="h-5 w-5" />
        匯入檔案
      </h3>

      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.md,.markdown,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.mp4,.webm,.ogg,.mov,.avi,.mkv,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          multiple
          onChange={handleFileImport}
          className="hidden"
          id="file-input"
          disabled={importStatus === 'loading'}
        />

        <label
          htmlFor="file-input"
          className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
            importStatus === 'loading'
              ? 'cursor-not-allowed opacity-60 bg-gray-50'
              : 'cursor-pointer hover:bg-gray-50'
          }`}
        >
          {importStatus === 'loading' ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : (
            <FileText className="h-5 w-5 text-gray-400" />
          )}
          <span className="text-sm text-gray-600">
            {importStatus === 'loading' ? statusMessage : '點擊選擇檔案 (PDF、Markdown、圖片、影片或文檔)'}
          </span>
        </label>

        {importStatus === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            {statusMessage}
          </div>
        )}

        {importStatus === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  )
}
