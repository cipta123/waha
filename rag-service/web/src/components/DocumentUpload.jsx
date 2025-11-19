import { useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Loader } from 'lucide-react'
import { ingestDocument } from '../api'

export default function DocumentUpload() {
  const [content, setContent] = useState('')
  const [metadata, setMetadata] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const payload = {
        content,
        metadata: metadata ? JSON.parse(metadata) : {},
        document_id: documentId || null
      }

      const response = await ingestDocument(payload)
      setResult({ success: true, data: response.data })
      
      // Clear form on success
      setContent('')
      setMetadata('')
      setDocumentId('')
    } catch (error) {
      setResult({ 
        success: false, 
        error: error.response?.data?.detail || error.message 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setContent(event.target.result)
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Upload className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
            <p className="text-sm text-gray-500">Add documents to your knowledge base</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File (Optional)
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">TXT, MD, or any text file</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.csv"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Paste or type your document content here..."
            />
          </div>

          {/* Metadata */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metadata (JSON, Optional)
            </label>
            <textarea
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder='{"source": "manual", "category": "knowledge", "author": "John"}'
            />
          </div>

          {/* Document ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document ID (Optional)
            </label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Leave empty for auto-generated ID"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !content}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Document
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl shadow-md p-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? 'Success!' : 'Error'}
              </h3>
              {result.success ? (
                <div className="mt-2 text-sm text-green-700">
                  <p>{result.data.message}</p>
                  <p className="mt-1">Document ID: <code className="bg-green-100 px-2 py-1 rounded">{result.data.document_ids[0]}</code></p>
                  <p>Documents ingested: {result.data.documents_ingested}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-red-700">{result.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
