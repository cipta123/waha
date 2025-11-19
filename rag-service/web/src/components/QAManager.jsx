import { useState, useEffect } from 'react'
import { MessageCircle, Plus, Trash2, RefreshCw, Tag, FolderOpen, Calendar, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { addQAPair, listQAPairs, deleteQAPair } from '../api'

export default function QAManager() {
  const [qaPairs, setQAPairs] = useState([])
  const [filteredQAPairs, setFilteredQAPairs] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Form state
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadQAPairs()
  }, [])

  // Filter and search effect
  useEffect(() => {
    let filtered = [...qaPairs]
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(qa => 
        qa.question.toLowerCase().includes(query) ||
        qa.answer.toLowerCase().includes(query) ||
        (qa.category && qa.category.toLowerCase().includes(query)) ||
        (qa.tags && qa.tags.some(tag => tag.toLowerCase().includes(query)))
      )
    }
    
    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(qa => qa.category === filterCategory)
    }
    
    setFilteredQAPairs(filtered)
    setCurrentPage(1) // Reset to first page when filter changes
  }, [qaPairs, searchQuery, filterCategory])

  const loadQAPairs = async () => {
    try {
      setLoading(true)
      const response = await listQAPairs()
      setQAPairs(response.data.qa_pairs)
    } catch (error) {
      console.error('Failed to load Q&A pairs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setSubmitting(true)
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t)
      
      await addQAPair(question, answer, category || null, tagsArray)
      
      // Reset form
      setQuestion('')
      setAnswer('')
      setCategory('')
      setTags('')
      setShowForm(false)
      
      // Reload list
      await loadQAPairs()
      
      alert('Q&A pair added successfully!')
    } catch (error) {
      alert('Failed to add Q&A pair: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (qaId) => {
    if (!confirm('Are you sure you want to delete this Q&A pair?')) return

    try {
      await deleteQAPair(qaId)
      await loadQAPairs()
      alert('Q&A pair deleted successfully')
    } catch (error) {
      alert('Failed to delete Q&A pair: ' + error.message)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  // Get unique categories
  const categories = [...new Set(qaPairs.map(qa => qa.category).filter(Boolean))]

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredQAPairs.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredQAPairs.length / itemsPerPage)

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterCategory('')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Q&A Knowledge Base</h2>
            <p className="text-gray-600 mt-1">
              Add question-answer pairs for your AI assistant
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadQAPairs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Q&A
            </button>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Q&A Pair</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question *
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What is your question?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer *
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide the answer..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Product, Support, General"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., pricing, features, support"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Q&A Pair'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions, answers, categories, or tags..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
            
            {(searchQuery || filterCategory) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        {(searchQuery || filterCategory) && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredQAPairs.length} of {qaPairs.length} Q&A pairs
          </div>
        )}
      </div>

      {/* Q&A List */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Q&A Pairs ({filteredQAPairs.length})
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading Q&A pairs...</p>
          </div>
        ) : filteredQAPairs.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {qaPairs.length === 0 
                ? 'No Q&A pairs yet. Add some to get started.'
                : 'No Q&A pairs match your search criteria.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {currentItems.map((qa) => (
              <div
                key={qa.qa_id}
                className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Question */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-600 uppercase">Question</span>
                      </div>
                      <p className="text-gray-900 font-medium">{qa.question}</p>
                    </div>

                    {/* Answer */}
                    <div className="mb-3 pl-7">
                      <span className="text-xs font-semibold text-green-600 uppercase mb-2 block">Answer</span>
                      <p className="text-gray-700">{qa.answer}</p>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 pl-7">
                      {qa.category && (
                        <div className="flex items-center gap-1">
                          <FolderOpen className="w-4 h-4" />
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                            {qa.category}
                          </span>
                        </div>
                      )}
                      
                      {qa.tags && qa.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-4 h-4" />
                          {qa.tags.map((tag, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs">{formatDate(qa.created_at)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-3 pl-7 font-mono">
                      ID: {qa.qa_id}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(qa.qa_id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Q&A pair"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredQAPairs.length)} of {filteredQAPairs.length} results
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, idx) => {
                      const pageNum = idx + 1
                      // Show first, last, current, and adjacent pages
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      } else if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return <span key={pageNum} className="px-2">...</span>
                      }
                      return null
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
