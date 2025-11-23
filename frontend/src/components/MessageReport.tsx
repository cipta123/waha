'use client';

import { useState, useEffect } from 'react';
import { fetchMessageReports } from '@/lib/api';
import { Loader, Search, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function MessageReport() {
  const [messages, setMessages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agentId, setAgentId] = useState('');
  const [intent, setIntent] = useState('');
  const [search, setSearch] = useState('');
  
  // Pagination
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    loadData();
  }, [offset, limit]); // Reload when page changes

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMessageReports({
        start_date: startDate,
        end_date: endDate,
        agent_id: agentId,
        intent: intent,
        search: search,
        limit,
        offset
      });
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0); // Reset to page 1
    loadData();
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Message Reports</h2>
          <p className="text-gray-500">Detailed log of all interactions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Agent / Type</label>
                <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">All Messages</option>
                    <option value="ai">🤖 AI Only</option>
                    <option value="human">👤 Human Only (All)</option>
                    {/* We could populate specific agents here if we fetch them */}
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search / Intent</label>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search content..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                </div>
            </div>
            <div>
                <button 
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                    <Filter className="w-4 h-4" /> Filter
                </button>
            </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role / Agent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latency</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {loading ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center">
                                <div className="flex justify-center">
                                    <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                                </div>
                            </td>
                        </tr>
                    ) : messages.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                No messages found matching your criteria.
                            </td>
                        </tr>
                    ) : (
                        messages.map((msg) => (
                            <tr key={msg.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                    {new Date(msg.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {msg.user_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {msg.role === 'user' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            User
                                        </span>
                                    ) : msg.agent_id ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            👤 {msg.agent_id}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            🤖 AI
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={msg.content}>
                                    {msg.content}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {msg.intent || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {msg.response_time ? `${msg.response_time.toFixed(2)}s` : '-'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
                Showing {messages.length > 0 ? offset + 1 : 0} to {Math.min(offset + limit, total)} of {total} results
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0 || loading}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total || loading}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
