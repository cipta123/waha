import { useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Loader, Files, Link } from 'lucide-react'
import { uploadFile, uploadFiles, ingestDocument, ingestUrl } from '../api'

export default function DocumentUploadEnhanced() {
  const [mode, setMode] = useState('file') // 'file', 'text', or 'url'
  const [selectedFiles, setSelectedFiles] = useState([])
  const [content, setContent] = useState('')
  const [metadata, setMetadata] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles(files)
  }

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return

    setLoading(true)
    setResult(null)

    try {
      let response
      if (selectedFiles.length === 1) {
        response = await uploadFile(selectedFiles[0])
      } else {
        response = await uploadFiles(selectedFiles)
      }
      
      setResult({ success: true, data: response.data })
      setSelectedFiles([])
    } catch (error) {
      setResult({ 
        success: false, 
        error: error.response?.data?.detail || error.message 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUrlSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await ingestUrl(url)
      setResult({ success: true, data: response.data })
      setUrl('')
    } catch (error) {
      setResult({ 
        success: false, 
        error: error.response?.data?.detail || error.message 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTextSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const payload = {
        content,
        metadata: metadata ? JSON.parse(metadata) : {}
      }

      const response = await ingestDocument(payload)
      setResult({ success: true, data: response.data })
      
      setContent('')
      setMetadata('')
    } catch (error) {
      setResult({ 
        success: false, 
        error: error.response?.data?.detail || error.message 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mode Selector */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMode('file')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              mode === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Upload className="w-5 h-5 inline mr-2" />
            Upload Files
          </button>
          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              mode === 'text'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Paste Text
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              mode === 'url'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Link className="w-5 h-5 inline mr-2" />
            Ingest from URL
          </button>
        </div>

        {/* File Upload Mode */}
        {mode === 'file' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Files (PDF, DOCX, TXT, MD, CSV, JSON)
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {selectedFiles.length > 0 ? (
                      <>
                        <Files className="w-12 h-12 mb-3 text-blue-600" />
                        <p className="mb-2 text-sm text-gray-700">
                          <span className="font-semibold">{selectedFiles.length} file(s) selected</span>
                        </p>
                        <ul className="text-xs text-gray-500 max-h-20 overflow-y-auto">
                          {selectedFiles.map((file, idx) => (
                            <li key={idx}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOCX, TXT, MD, CSV, JSON (multiple files supported)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.docx,.doc,.txt,.md,.csv,.json"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            </div>

            <button
              onClick={handleFileUpload}
              disabled={loading || selectedFiles.length === 0}
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
                  Upload {selectedFiles.length > 0 && `${selectedFiles.length} File(s)`}
                </>
              )}
            </button>
          </div>
        )}

        {/* URL Mode */}
        {mode === 'url' && (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter URL to Ingest
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/knowledge-page"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Ingesting...
                </>
              ) : (
                <>
                  <Link className="w-5 h-5" />
                  Ingest URL
                </>
              )}
            </button>
          </form>
        )}

        {/* Text Mode */}
        {mode === 'text' && (
          <form onSubmit={handleTextSubmit} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metadata (JSON, Optional)
              </label>
              <textarea
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder='{"source": "manual", "category": "knowledge"}'
              />
            </div>

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
        )}
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
                  <p className="mt-1">Documents ingested: {result.data.documents_ingested}</p>
                  {result.data.document_ids.length <= 3 && (
                    <div className="mt-2">
                      {result.data.document_ids.map((id, idx) => (
                        <p key={idx} className="font-mono text-xs bg-green-100 px-2 py-1 rounded inline-block mr-2 mb-1">
                          {id}
                        </p>
                      ))}
                    </div>
                  )}
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
