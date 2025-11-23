'use client';

import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
