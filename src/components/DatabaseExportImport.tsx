import React, { useRef, useState } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import type { ExportData, ImportMode } from '../store/knowledgeStore'
import { Download, Upload, AlertCircle, Check, FileJson, Trash2 } from 'lucide-react'

export const DatabaseExportImport: React.FC = () => {
  const { exportData, importData, clearAll, items } = useKnowledgeStore()
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const data = exportData()
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const filename = `knowledge-base-export-${timestamp}.json`

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setImportStatus('success')
    setStatusMessage(`已匯出 ${data.itemCount} 個項目`)
    setTimeout(() => {
      setImportStatus('idle')
      setStatusMessage('')
    }, 3000)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportStatus('loading')
    setStatusMessage(`正在匯入 ${file.name}...`)

    try {
      const text = await file.text()
      const data: ExportData = JSON.parse(text)

      // 驗證格式
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('檔案格式錯誤：缺少 items 陣列')
      }

      const itemCount = data.items.length

      if (importMode === 'replace') {
        if (!window.confirm(`此操作將替換所有現有資料 (${items.length} 個項目)，確認繼續？`)) {
          setImportStatus('idle')
          setStatusMessage('')
          return
        }
      }

      importData(data, importMode)

      setImportStatus('success')
      if (importMode === 'merge') {
        setStatusMessage(`成功合併匯入 ${itemCount} 個項目`)
      } else {
        setStatusMessage(`成功替換為 ${itemCount} 個項目`)
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus('error')
      setStatusMessage(
        error instanceof Error ? error.message : '匯入失敗：無法解析檔案'
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

  const handleClearAll = () => {
    if (window.confirm(`確定要清空所有資料嗎？ (${items.length} 個項目，此操作無法復原)`)) {
      clearAll()
      setImportStatus('success')
      setStatusMessage('已清空所有資料')
      setTimeout(() => {
        setImportStatus('idle')
        setStatusMessage('')
      }, 3000)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
        <FileJson className="h-5 w-5" />
        資料庫匯入/匯出
      </h3>

      <div className="space-y-4">
        {/* 匯出 */}
        <div>
          <button
            onClick={handleExport}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4" />
            匯出資料庫 ({items.length} 項)
          </button>
        </div>

        {/* 匯入 */}
        <div>
          <div className="flex gap-2 mb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={(e) => setImportMode(e.target.value as ImportMode)}
                className="text-blue-600 focus:ring-blue-500"
              />
              合併（新增項目）
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={(e) => setImportMode(e.target.value as ImportMode)}
                className="text-blue-600 focus:ring-blue-500"
              />
              替換（清空並匯入）
            </label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
            id="db-import-input"
            disabled={importStatus === 'loading'}
          />

          <label
            htmlFor="db-import-input"
            className={`flex items-center justify-center gap-2 w-full px-4 py-2 border-2 border-dashed rounded-lg transition-colors ${
              importStatus === 'loading'
                ? 'cursor-not-allowed opacity-60 bg-gray-50'
                : 'cursor-pointer hover:bg-gray-50'
            }`}
          >
            <Upload className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {importStatus === 'loading' ? statusMessage : '點擊選擇匯入檔案'}
            </span>
          </label>
        </div>

        {/* 清空 */}
        <div>
          <button
            onClick={handleClearAll}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            清空所有資料
          </button>
        </div>

        {/* 狀態訊息 */}
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
