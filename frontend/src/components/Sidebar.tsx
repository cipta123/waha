'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchHealth, HealthResponse } from '@/lib/api';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  if (pathname === '/login') return null;

  useEffect(() => {
    // Initial health check
    checkHealth();
    
    // Poll every 30s
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetchHealth();
      setHealth(res);
    } catch (err) {
      console.error('Sidebar health check failed', err);
      setHealth(null);
    }
  };

  return (
    <aside className="flex w-16 flex-col items-center gap-6 bg-slate-900 py-6 text-white z-20 relative h-screen">
      {/* Logo */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-semibold text-sm">
        WA
      </div>

      {/* Navigation Icons */}
      <nav className="flex flex-col gap-4">
        {/* Inbox */}
        <button 
          onClick={() => router.push('/')}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            pathname === '/' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
          title="Inbox"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
            Inbox
          </span>
        </button>

        {/* Contacts */}
        <button 
          className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          title="Contacts"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
            Contacts
          </span>
        </button>

        {/* Analytics */}
        <button 
          onClick={() => router.push('/analytics')}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            pathname === '/analytics' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
          title="Analytics"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
            Analytics
          </span>
        </button>

        {/* Reports */}
        <button 
          onClick={() => router.push('/reports')}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            pathname === '/reports' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
          title="Reports"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
            Reports
          </span>
        </button>
      </nav>

      {/* Settings - Bottom section */}
      <div className="mt-auto flex flex-col gap-4">
        
        {/* Settings Dropdown */}
        <div className="relative">
          <button 
            className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${isSettingsOpen ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
            title="Settings"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {isSettingsOpen && (
            <div className="absolute left-full bottom-0 ml-2 w-48 rounded-lg bg-white py-1 shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
              <div className="px-4 py-2 text-xs text-gray-400 font-semibold uppercase">
                My Account
              </div>
              <button
                onClick={() => window.location.href = '/settings'}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Settings
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  router.push('/login');
                }}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Health Status */}
        <div className="group relative flex h-10 w-10 items-center justify-center">
          <div className={`h-2 w-2 rounded-full ${health?.status === 'ok' ? 'bg-green-400' : 'bg-gray-400'}`} />
          <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
            {health ? `API ${health.status}` : "Loading"}
          </span>
        </div>
      </div>
    </aside>
  );
}
