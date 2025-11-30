import { useState, useEffect } from 'react'
import { Save, RotateCcw, Settings as SettingsIcon } from 'lucide-react'
import { getSetting, updateSetting } from '../api'

export default function Settings() {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const DEFAULT_PROMPT_HINT = "Leave empty to use the default system prompt."

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await getSetting('system_prompt')
      // If value is null, it means not set (default)
      setSystemPrompt(response.data.value || '')
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Don't alert on 404 (setting not found), just assume empty
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await updateSetting('system_prompt', systemPrompt, 'System Prompt for RAG Engine')
      alert('Settings saved successfully!')
    } catch (error) {
      alert('Failed to save settings: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to clear the custom prompt? The system will revert to the default built-in prompt.')) {
      setSystemPrompt('')
      // We can either save immediately or let user click save. 
      // Let's just clear the input and let user save.
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure the behavior of your AI assistant
            </p>
          </div>
        </div>
      </div>

      {/* System Prompt Editor */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Prompt</h3>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Revert to default"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-700">
          <p className="font-medium">Note:</p>
          <p>This prompt defines how the AI behaves, answers questions, and handles logic. 
             The context (documents) and conversation history will be automatically appended to this prompt.</p>
          <p className="mt-1 italic">{DEFAULT_PROMPT_HINT}</p>
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-4">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={15}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter custom system prompt..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
