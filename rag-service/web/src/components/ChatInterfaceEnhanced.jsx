import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Bot, User, Loader, FileText, ChevronDown, ChevronRight, Edit, Save, X } from 'lucide-react'
import { queryRAG, addQAPair } from '../api'

export default function ChatInterface() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedSources, setExpandedSources] = useState({})
  const [editingMessage, setEditingMessage] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  
  const messagesEndRef = useRef(null)

  const toggleSources = (messageIndex) => {
    setExpandedSources(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!editingMessage) {
        scrollToBottom()
    }
  }, [messages, editingMessage])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Prepare history
      const history = messages.map(({ role, content }) => ({ role, content }));
      const response = await queryRAG(input, history)
      const aiMessage = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources,
        timestamp: new Date(),
        query: input // Store original query for potential correction
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage = {
        role: 'error',
        content: error.response?.data?.detail || error.message,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (message, index) => {
    setEditingMessage(index)
    setEditContent(message.content)
  }

  const cancelEditing = () => {
    setEditingMessage(null)
    setEditContent('')
  }

  const saveCorrection = async (message, index) => {
    if (!editContent.trim()) return
    
    setSavingEdit(true)
    try {
        // 1. Add to Q&A Database
        await addQAPair(
            message.query, // The original question
            editContent, // The corrected answer
            'correction', // Category
            ['human-correction', 'feedback'] // Tags
        )

        // 2. Update local message state
        setMessages(prev => prev.map((msg, i) => 
            i === index ? { ...msg, content: editContent, isCorrected: true } : msg
        ))
        
        setEditingMessage(null)
        // Optional: Show success notification
    } catch (error) {
        console.error('Failed to save correction:', error)
        alert('Failed to save correction. Please try again.')
    } finally {
        setSavingEdit(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-16rem)] flex flex-col bg-white rounded-xl shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-200">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Test & Train</h2>
          <p className="text-sm text-gray-500">Test answers and correct them to train the AI</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Training</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Ask a question. If the AI answer is wrong, click the <Edit className="w-3 h-3 inline" /> icon to correct it.
              The correction will be saved to the knowledge base immediately.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role !== 'user' && (
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'error' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <Bot className={`w-5 h-5 ${message.role === 'error' ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
              )}
              
              <div className={`flex flex-col max-w-[70%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                
                {/* Message Content Area */}
                <div className={`relative group prose prose-sm max-w-none rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white prose-invert'
                    : message.role === 'error'
                    ? 'bg-red-50 text-red-900 border border-red-200'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  
                  {/* Edit Mode */}
                  {editingMessage === index ? (
                    <div className="w-[600px] max-w-full bg-white rounded-lg border border-blue-200 shadow-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Edit className="w-4 h-4 text-blue-600" />
                            Correct Answer & Train AI
                        </h4>
                        <textarea 
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Type the correct answer here..."
                            className="w-full h-[300px] p-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none bg-gray-50 text-gray-900 resize-y font-sans leading-relaxed"
                        />
                        <div className="flex justify-between items-center mt-3">
                            <span className="text-xs text-gray-500 italic">
                                * This correction will be saved to knowledge base
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={cancelEditing}
                                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => saveCorrection(message, index)}
                                    disabled={savingEdit}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-all"
                                >
                                    {savingEdit ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save & Train
                                </button>
                            </div>
                        </div>
                    </div>
                  ) : (
                    /* Normal Display Mode */
                    <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        
                        {/* Edit Button (Only for AI messages) */}
                        {message.role === 'assistant' && (
                            <button
                                onClick={() => startEditing(message, index)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/80 rounded-full hover:bg-white shadow-sm text-gray-500 hover:text-blue-600"
                                title="Correct this answer"
                            >
                                <Edit className="w-3 h-3" />
                            </button>
                        )}
                    </>
                  )}
                </div>
                
                {/* Sources Toggle */}
                {message.sources && message.sources.length > 0 && !editingMessage && (
                  <div className="mt-2 w-full">
                    <button
                      onClick={() => toggleSources(index)}
                      className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      {expandedSources[index] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span>Sources ({message.sources.length})</span>
                    </button>
                    
                    {expandedSources[index] && (
                      <div className="mt-2 space-y-1">
                        {message.sources.map((source, idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs">
                            <div className="flex items-start gap-2">
                              <FileText className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                              <p className="text-gray-700 line-clamp-2">{source.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Status Indicator */}
                {message.isCorrected && (
                    <span className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Save className="w-3 h-3" /> Corrected & Saved to KB
                    </span>
                )}
                
                <span className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <Loader className="w-5 h-5 text-gray-600 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Type your question..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
