import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Loader, Calendar, Clock, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { getAnalytics } from '../api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getAnalytics(days);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
        <div className="text-center p-8 text-gray-500">
            No analytics data available.
        </div>
    );
  }

  // Transform Data for Charts
  const chatVolumeData = data.daily_chats.map(item => ({
    date: new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    chats: item.count
  }));

  const ratioData = [
    { name: 'AI Replies', value: data.ratio?.ai_replies || 0 },
    { name: 'Human Replies', value: data.ratio?.human_replies || 0 },
  ];

  const topIntents = data.top_intents || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          <p className="text-gray-500">Overview of chatbot performance and user engagement</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200">
            {[7, 30, 90].map(d => (
                <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        days === d 
                        ? 'bg-blue-100 text-blue-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    Last {d} Days
                </button>
            ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-500 text-sm font-medium">Total Interactions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
                {chatVolumeData.reduce((acc, curr) => acc + curr.chats, 0)}
            </p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-500 text-sm font-medium">Avg AI Response Time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
                {data.avg_response_time ? data.avg_response_time.toFixed(2) : '0'} <span className="text-sm text-gray-500 font-normal">sec</span>
            </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-gray-500 text-sm font-medium">AI Handling Rate</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
                {ratioData[0].value + ratioData[1].value > 0 
                    ? Math.round((ratioData[0].value / (ratioData[0].value + ratioData[1].value)) * 100) 
                    : 0}%
            </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-gray-500 text-sm font-medium">Top Topic</span>
            </div>
            <p className="text-lg font-bold text-gray-900 truncate">
                {topIntents[0]?.intent || 'N/A'}
            </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Volume Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Chat Volume</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chatVolumeData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="chats" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* AI vs Human Ratio */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI vs Human Handling</h3>
            <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={ratioData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {ratioData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Top Topics Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Most Frequent Topics</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic / Intent</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {topIntents.length > 0 ? (
                          topIntents.map((item, index) => {
                              const total = topIntents.reduce((acc, curr) => acc + curr.count, 0);
                              const percentage = ((item.count / total) * 100).toFixed(1);
                              return (
                                  <tr key={index}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                          {item.intent}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {item.count}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                              <span className="text-sm text-gray-500 w-12">{percentage}%</span>
                                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                  <div 
                                                      className="h-full bg-blue-500 rounded-full"
                                                      style={{ width: `${percentage}%` }}
                                                  />
                                              </div>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })
                      ) : (
                          <tr>
                              <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500">
                                  No topic data available yet.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
