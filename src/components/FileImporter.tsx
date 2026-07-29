import React, { useRef, useState } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import type { SourceType } from '../types'
import { FileUp, FileText, AlertCircle, Check, Loader2 } from 'lucide-react'

export const FileImporter: React.FC = () => {
  const { importItem } = useKnowledgeStore()
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 將 PDF 文字項目轉換為 Markdown
  const convertPdfItemsToMarkdown = (pages: Array<{ items: any[] }>): string => {
    const markdownLines: string[] = []

    // 第一步：收集所有文字項目，統計字型大小分佈
    const allItems: any[] = pages.flatMap(p => p.items)
    const fontSizes: number[] = allItems
      .map((item: any) => Math.round(item.height ?? 0))
      .filter((s) => s > 0)

    // 取得常見字型大小（body size）：眾數
    const sizeFreq: Record<number, number> = {}
    for (const s of fontSizes) sizeFreq[s] = (sizeFreq[s] ?? 0) + 1
    const bodySize = fontSizes.length > 0
      ? Number(Object.entries(sizeFreq).sort((a, b) => b[1] - a[1])[0][0])
      : 12

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const { items } = pages[pageIdx]
      if (pageIdx > 0) markdownLines.push('\n---\n') // 頁面分隔線

      // 將 item 按 Y 座標分群成行
      const lineMap: Map<number, any[]> = new Map()
      for (const item of items) {
        if (!item.str?.trim()) continue
        const y = Math.round(item.transform?.[5] ?? 0)
        if (!lineMap.has(y)) lineMap.set(y, [])
        lineMap.get(y)!.push(item)
      }

      // 依 Y 降序（PDF 座標 Y 由下往上，大的 Y 是頁面上方）
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a)

      let prevWasBlank = false
      for (const y of sortedYs) {
        const lineItems = lineMap.get(y)!.sort(
          (a: any, b: any) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0)
        )
        const lineText = lineItems.map((i: any) => i.str).join('').trim()
        if (!lineText) {
          if (!prevWasBlank) markdownLines.push('')
          prevWasBlank = true
          continue
        }
        prevWasBlank = false

        // 計算行的平均字型大小
        const avgSize = lineItems.reduce((sum: number, i: any) => sum + (i.height ?? 0), 0) / lineItems.length
        const isBold = lineItems.some((i: any) => i.fontName?.toLowerCase().includes('bold'))
        const isAllCaps = lineText === lineText.toUpperCase() && /[A-Z\u4e00-\u9fff]/.test(lineText)

        // 決定 Markdown 標題等級
        if (avgSize >= bodySize * 2.0 || (avgSize >= bodySize * 1.6 && (isBold || isAllCaps))) {
          markdownLines.push(`# ${lineText}`)
        } else if (avgSize >= bodySize * 1.4 || (avgSize >= bodySize * 1.2 && isBold)) {
          markdownLines.push(`## ${lineText}`)
        } else if (avgSize >= bodySize * 1.15 || (avgSize >= bodySize * 1.05 && isBold)) {
          markdownLines.push(`### ${lineText}`)
        } else if (isBold && lineText.length < 80) {
          markdownLines.push(`**${lineText}**`)
        } else {
          markdownLines.push(lineText)
        }
      }
    }

    // 合併並清理多餘空行
    return markdownLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // 動態引入 pdfjs-dist 避免 SSR 問題
    const pdfjsLib = await import('pdfjs-dist')

    // 設定 worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    const pages: Array<{ items: any[] }> = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      pages.push({ items: textContent.items })
    }

    return convertPdfItemsToMarkdown(pages)
  }

  const extractTextFromMarkdown = async (file: File): Promise<string> => {
    const text = await file.text()
    return text
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const getMarkdownTitle = (content: string): string => {
    const lines = content.split('\n')
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/)
      if (match) {
        return match[1]
      }
    }
    return ''
  }

  const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileExtension = file.name.split('.').pop()?.toLowerCase()

    setImportStatus('loading')
    setStatusMessage(`正在處理 ${file.name}...`)

    try {
      let content = ''
      let source: SourceType = 'manual'
      let title = ''

      let fileData: string | undefined = undefined

      if (fileExtension === 'pdf') {
        source = 'pdf'
        content = await extractTextFromPDF(file)
        // 優先從 Markdown 內容中找第一個 H1 標題
        title = getMarkdownTitle(content) || file.name.replace(/\.pdf$/i, '') || '未命名'
        fileData = await fileToBase64(file)
      } else if (fileExtension === 'md' || fileExtension === 'markdown') {
        source = 'markdown'
        content = await extractTextFromMarkdown(file)
        title = getMarkdownTitle(content) || file.name.replace(/\.(md|markdown)$/, '') || '未命名'
      } else if (IMAGE_EXTENSIONS.includes(fileExtension ?? '')) {
        source = 'image'
        title = file.name.replace(/\.[^.]+$/, '') || '未命名'
        fileData = await fileToBase64(file)
        // 內容存成 Markdown 圖片語法，方便後續渲染
        content = `# ${title}\n\n![${title}](${fileData})\n`
      } else {
        throw new Error('不支援的檔案格式（支援：PDF、Markdown、圖片）')
      }

      if (!content.trim()) {
        throw new Error('無法提取檔案內容')
      }

      importItem({
        title,
        content: content.substring(0, 500000), // 最多 50 萬字元
        tags: [],
        source,
        sourceFile: file.name,
        fileData,
      })

      setImportStatus('success')
      setStatusMessage(`成功匯入「${title}」(${file.name})`)
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
          accept=".pdf,.md,.markdown,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp"
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
            {importStatus === 'loading' ? statusMessage : '點擊選擇檔案 (PDF、Markdown 或圖片)'}
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