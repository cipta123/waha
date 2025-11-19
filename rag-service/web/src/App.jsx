import { useState, useEffect } from 'react'
import { Database, MessageSquare, Upload, BarChart3, FolderOpen, MessageCircle } from 'lucide-react'
import Dashboard from './components/Dashboard'
import DocumentUploadEnhanced from './components/DocumentUploadEnhanced'
import DocumentManager from './components/DocumentManager'
import QAManager from './components/QAManager'
import ChatInterface from './components/ChatInterface'
import { healthCheck } from './api'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [health, setHealth] = useState(null)

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  const checkHealth = async () => {
    try {
      const response = await healthCheck()
      setHealth(response.data)
    } catch (error) {
      console.error('Health check failed:', error)
      setHealth(null)
    }
  }

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'upload', name: 'Upload Documents', icon: Upload },
    { id: 'manage', name: 'Manage Documents', icon: FolderOpen },
    { id: 'qa', name: 'Q&A Knowledge', icon: MessageCircle },
    { id: 'chat', name: 'Test Chat', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RAG Knowledge Base</h1>
                <p className="text-sm text-gray-500">Manage your documents and test AI responses</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${health ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {health ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard health={health} />}
        {activeTab === 'upload' && <DocumentUploadEnhanced />}
        {activeTab === 'manage' && <DocumentManager />}
        {activeTab === 'qa' && <QAManager />}
        {activeTab === 'chat' && <ChatInterface />}
      </main>
    </div>
  )
}

export default App
