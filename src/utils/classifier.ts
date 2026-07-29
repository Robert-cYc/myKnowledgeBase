/**
 * 內容分類工具
 * 依據內容關鍵字自動分類知識項目
 */

export interface ClassificationRule {
  tag: string
  keywords: string[]
  weight: number
}

// 分類規則定義（支援中英文關鍵字）
export const classificationRules: ClassificationRule[] = [
  // 技術類
  {
    tag: '技術',
    keywords: [
      '程式', '代碼', 'code', '開發', 'develop', 'programming',
      '前端', 'backend', 'fullstack', 'react', 'vue', 'angular',
      'javascript', 'typescript', 'python', 'java', 'golang', 'rust',
      'api', '資料庫', 'database', 'docker', 'kubernetes', 'aws',
      '雲端', 'cloud', 'server', '伺服器', '部署', '部署', 'git',
      '算法', '算法', 'machine learning', 'ai', '人工智慧',
      'mobile', 'ios', 'android', 'app', '應用程式',
    ],
    weight: 1,
  },
  // 學習筆記
  {
    tag: '學習',
    keywords: [
      '學習', '學習', '筆記', 'note', '筆記', '教學', 'tutorial',
      '課程', 'course', '課堂', '上課', '讀書', '讀書會',
      '研究', 'research', 'study', '學習筆記', '心得',
    ],
    weight: 1,
  },
  // 工作專案
  {
    tag: '工作',
    keywords: [
      '工作', '工作', '專案', 'project', '任務', 'task',
      '會議', 'meeting', '報告', '報告', '計劃', 'plan',
      '策略', 'strategy', '業務', '商業', 'business',
      '客戶', 'customer', '交付', 'deadline', '進度',
    ],
    weight: 1,
  },
  // 生活日記
  {
    tag: '生活',
    keywords: [
      '生活', '生活', '日記', 'diary', '日常', '休息',
      '旅遊', 'travel', '旅行', '觀光', '度假', '休假',
      '餐廳', 'food', '美食', '料理', '烹飪', 'cooking',
      '電影', 'movie', '電視', 'tv', '娛樂', 'entertainment',
      '書籍', 'book', '閱讀', 'reading', '運動', 'sport',
    ],
    weight: 1,
  },
  // 參考資料
  {
    tag: '參考',
    keywords: [
      '參考', 'reference', '資源', 'resource', '工具', 'tool',
      '連結', 'link', 'url', '網站', 'website', '網址',
      '文檔', 'documentation', '文獻', '資料', 'data',
      '範例', 'example', '範本', 'template', '模板',
    ],
    weight: 1,
  },
  // 重要
  {
    tag: '重要',
    keywords: [
      '重要', 'important', '緊急', 'urgent', '關鍵', 'critical',
      '必須', '必做', '需要注意', '警告', 'warning',
      '問題', 'problem', 'bug', '錯誤', 'error', '修復',
    ],
    weight: 1,
  },
  // 待辦
  {
    tag: '待辦',
    keywords: [
      '待辦', 'todo', 'to-do', 'to do', '待完成', '未完成',
      '需要做', '要做', '計劃中', '準備', 'preparation',
      '將來', 'future', '後續', '後續處理', 'follow up',
    ],
    weight: 1,
  },
]

/**
 * 分析文本內容並返回分類標籤
 * @param text 要分析的文本
 * @param existingTags 已有的標籤（不會重複添加）
 * @param maxTags 最大標籤數量
 * @returns 分類建議的標籤列表
 */
export function classifyContent(
  text: string,
  existingTags: string[] = [],
  maxTags: number = 5
): string[] {
  const lowerText = text.toLowerCase()
  const tagScores: Record<string, number> = {}

  for (const rule of classificationRules) {
    let score = 0
    for (const keyword of rule.keywords) {
      const lowerKeyword = keyword.toLowerCase()
      // 計算關鍵字出現次數
      const regex = new RegExp(lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const matches = lowerText.match(regex)
      if (matches) {
        score += matches.length * rule.weight
      }
    }

    if (score > 0) {
      tagScores[rule.tag] = (tagScores[rule.tag] ?? 0) + score
    }
  }

  // 按分數排序，取前 N 個
  const sortedTags = Object.entries(tagScores)
    .sort(([, a], [, b]) => b - a)
    .map(([tag]) => tag)

  // 過濾掉已存在的標籤
  const newTags = sortedTags.filter((tag) => !existingTags.includes(tag))

  return newTags.slice(0, maxTags)
}

/**
 * 為項目生成分類標籤（不修改現有標籤）
 * @param title 標題
 * @param content 內容
 * @param existingTags 已有的標籤
 * @returns 建議添加的新標籤
 */
export function suggestTags(
  title: string,
  content: string,
  existingTags: string[] = []
): string[] {
  const combinedText = `${title} ${content}`
  return classifyContent(combinedText, existingTags)
}
