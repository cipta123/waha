import { useState, useEffect } from 'react'
import { FileText, Database, Trash2, RefreshCw } from 'lucide-react'
import { getStats, clearDatabase } from '../api'

export default function Dashboard({ health }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await getStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all documents? This cannot be undone.')) {
      return
    }
    try {
      await clearDatabase()
      alert('Database cleared successfully')
      loadStats()
    } catch (error) {
      alert('Failed to clear database: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {health?.status || 'Unknown'}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Database className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Documents</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {health?.documents_count || 0}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vector DB</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {health?.vector_db_status || 'Unknown'}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex gap-4">
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </button>
          <button
            onClick={handleClearDatabase}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear Database
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Collection Name:</span>
            <span className="font-medium text-gray-900">{stats?.collection_name || 'documents'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Embedding Model:</span>
            <span className="font-medium text-gray-900">text-embedding-3-large</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">LLM Model:</span>
            <span className="font-medium text-gray-900">llama-3.3-70b-versatile (Groq)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
