import type { SourceType } from '../types'

// 將 PDF 文字項目轉換為 Markdown
export const convertPdfItemsToMarkdown = (pages: Array<{ items: any[] }>): string => {
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
      const isAllCaps = lineText === lineText.toUpperCase() && /[A-Z一-鿿]/.test(lineText)

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

export const extractTextFromPDF = async (file: File): Promise<string> => {
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

export const extractTextFromMarkdown = async (file: File): Promise<string> => {
  const text = await file.text()
  return text
}

export const extractTextFromTxt = async (file: File): Promise<string> => {
  return await file.text()
}

export const extractTextFromDocx = async (file: File): Promise<string> => {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export const extractTextFromPptx = async (file: File): Promise<string> => {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export const extractTextFromXlsx = async (file: File): Promise<string> => {
  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const lines: string[] = []

  for (const sheetName of workbook.SheetNames) {
    lines.push(`## ${sheetName}`)
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    for (const row of jsonData) {
      if (row && row.some((cell) => cell != null)) {
        lines.push(row.map((cell) => (cell != null ? String(cell) : '')).join('\t'))
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export const getMarkdownTitle = (content: string): string => {
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/)
    if (match) {
      return match[1]
    }
  }
  return ''
}

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']

export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']

export const DOCUMENT_EXTENSIONS = ['txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']

export interface ProcessedFile {
  content: string
  source: SourceType
  title: string
  fileData?: string
  fileName: string
}

export const processFile = async (file: File): Promise<ProcessedFile> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()

  let content = ''
  let source: SourceType = 'manual'
  let title = ''
  let fileData: string | undefined = undefined

  if (fileExtension === 'pdf') {
    source = 'pdf'
    content = await extractTextFromPDF(file)
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
    content = `# ${title}\n\n![${title}](${fileData})\n`
  } else if (VIDEO_EXTENSIONS.includes(fileExtension ?? '')) {
    source = 'video'
    title = file.name.replace(/\.[^.]+$/, '') || '未命名'
    fileData = await fileToBase64(file)
    content = `# ${title}\n\n<video controls width="100%" src="${fileData}"></video>\n`
  } else if (DOCUMENT_EXTENSIONS.includes(fileExtension ?? '')) {
    source = 'document'
    title = file.name.replace(/\.[^.]+$/, '') || '未命名'
    fileData = await fileToBase64(file)

    if (fileExtension === 'txt') {
      content = await extractTextFromTxt(file)
    } else if (fileExtension === 'docx' || fileExtension === 'doc') {
      content = await extractTextFromDocx(file)
    } else if (fileExtension === 'pptx' || fileExtension === 'ppt') {
      content = await extractTextFromPptx(file)
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      content = await extractTextFromXlsx(file)
    } else {
      throw new Error('不支援的文檔格式')
    }

    content = `# ${title}\n\n${content}`
  } else {
    throw new Error('不支援的檔案格式（支援：PDF、Markdown、圖片、影片、文檔）')
  }

  if (!content.trim()) {
    throw new Error('無法提取檔案內容')
  }

  return { content, source, title, fileData, fileName: file.name }
}

// 處理多個檔案並合併為單一項目
export const processFiles = async (files: File[]): Promise<{
  combinedContent: string
  combinedTitle: string
  primarySource: SourceType
  primaryFileData: string | undefined
  fileDataList: string[]
  sourceFiles: string[]
}> => {
  const results: ProcessedFile[] = []
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

  let combinedContent = ''
  let combinedTitle = ''
  let primarySource: SourceType = 'manual'
  let primaryFileData: string | undefined = undefined
  let fileDataList: string[] = []
  let sourceFiles: string[] = []

  if (results.length === 1) {
    const r = results[0]
    combinedContent = r.content
    combinedTitle = r.title
    primarySource = r.source
    primaryFileData = r.fileData
    if (r.fileData) fileDataList = [r.fileData]
    sourceFiles = [r.fileName]
  } else {
    combinedContent = results
      .map((r, i) => {
        const separator = i > 0 ? `\n\n---\n\n## ${r.title}\n\n` : ''
        return separator + r.content
      })
      .join('\n\n')
    combinedTitle = results[0].title
    primarySource = results.find((r) => r.source === 'pdf' || r.source === 'document')?.source || results[0].source
    fileDataList = results.filter((r) => r.fileData).map((r) => r.fileData!)
    primaryFileData = fileDataList[0]
    sourceFiles = results.map((r) => r.fileName)
  }

  return {
    combinedContent,
    combinedTitle,
    primarySource,
    primaryFileData,
    fileDataList,
    sourceFiles,
  }
}
