'use client';

import MessageReport from '@/components/MessageReport';

export default function ReportsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <MessageReport />
      </div>
    </div>
  );
}
