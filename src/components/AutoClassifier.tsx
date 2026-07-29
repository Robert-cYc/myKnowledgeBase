import React, { useState } from 'react'
import { useKnowledgeStore } from '../store/knowledgeStore'
import { suggestTags } from '../utils/classifier'
import { Tags, Sparkles, Check, AlertCircle } from 'lucide-react'

export const AutoClassifier: React.FC = () => {
  const { items, autoClassifyItem, autoClassifyAll } = useKnowledgeStore()
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleClassifyAll = () => {
    if (items.length === 0) return

    if (!window.confirm(`確定要為所有 ${items.length} 個項目自動分類嗎？`)) {
      return
    }

    setStatus('processing')
    setMessage('正在分析內容...')

    try {
      autoClassifyAll()
      setStatus('success')
      setMessage(`已完成所有項目的自動分類`)
    } catch (error) {
      setStatus('error')
      setMessage('分類失敗，請稍後再試')
    }

    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 3000)
  }

  // 計算可以分類的項目數量（尚未有標籤的項目）
  const classifiableItems = items.filter((item) => {
    const suggested = suggestTags(item.title, item.content, item.tags)
    return suggested.length > 0
  })

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
        <Tags className="h-5 w-5" />
        自動分類
      </h3>

      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          依據內容關鍵字自動添加分類標籤。
          {classifiableItems.length > 0
            ? ` 檢測到 ${classifiableItems.length} 個項目可以分類。`
            : ' 目前沒有需要分類的項目。'}
        </p>

        <button
          onClick={handleClassifyAll}
          disabled={status === 'processing' || items.length === 0 || classifiableItems.length === 0}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          {status === 'processing' ? '分類中...' : '為所有項目自動分類'}
        </button>

        {status === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            {message}
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
