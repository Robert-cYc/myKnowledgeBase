import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { KnowledgeList } from './components/KnowledgeList'
import { KnowledgeEditor } from './components/KnowledgeEditor'
import { SearchBar } from './components/SearchBar'
import { FileImporter } from './components/FileImporter'
import { DatabaseExportImport } from './components/DatabaseExportImport'
import { AutoClassifier } from './components/AutoClassifier'
import type { KnowledgeItem } from './types'

function App() {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null)

  const handleAdd = () => {
    setEditingItem(null)
    setIsEditorOpen(true)
  }

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item)
    setIsEditorOpen(true)
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
    setEditingItem(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl p-4">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">知識庫</h1>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            新增項目
          </button>
        </header>

        <FileImporter />
        <DatabaseExportImport />
        <AutoClassifier />
        <SearchBar />
        <KnowledgeList onEdit={handleEdit} />
      </div>

      {isEditorOpen && (
        <KnowledgeEditor
          item={editingItem}
          onClose={handleCloseEditor}
          onSave={handleCloseEditor}
        />
      )}
    </div>
  )
}

export default App