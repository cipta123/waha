'use client';

import { useState, useEffect } from 'react';
import { UserManagement } from '@/components/UserManagement';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState({
    apiBaseUrl: '',
    wahaBaseUrl: '',
    wahaApiKey: '',
    webhookSecret: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('waha_config');
    if (stored) {
      setConfig(JSON.parse(stored));
    } else {
      // Set defaults
      setConfig({
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api',
        wahaBaseUrl: 'http://localhost:3000',
        wahaApiKey: '',
        webhookSecret: 'utserangkitasemua',
      });
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('waha_config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-16 flex-col items-center gap-6 bg-slate-900 py-6 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-semibold text-sm">
          WA
        </div>
        <nav className="flex flex-col gap-4">
          <button 
            className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            onClick={() => window.location.href = '/'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
              Inbox
            </span>
          </button>
        </nav>
        <div className="mt-auto flex flex-col gap-4">
          <button 
            className="group relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
              Settings
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="mt-2 text-slate-600">Configure your WhatsApp automation credentials</p>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-slate-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('general')}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                General Config
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                User Management
              </button>
            </nav>
          </div>

          {activeTab === 'general' ? (
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-slate-900">API Configuration</h2>

            <div className="space-y-6">
              {/* Backend API URL */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Backend API URL
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="http://localhost:4000/api"
                  value={config.apiBaseUrl}
                  onChange={(e) => setConfig({ ...config, apiBaseUrl: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-500">
                  URL of your NestJS backend API
                </p>
              </div>

              {/* WAHA Base URL */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  WAHA Base URL
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="http://localhost:3000"
                  value={config.wahaBaseUrl}
                  onChange={(e) => setConfig({ ...config, wahaBaseUrl: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-500">
                  URL where WAHA engine is running
                </p>
              </div>

              {/* WAHA API Key */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  WAHA API Key
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Enter your WAHA API key"
                  value={config.wahaApiKey}
                  onChange={(e) => setConfig({ ...config, wahaApiKey: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-500">
                  API key for authenticating with WAHA (set in WAHA .env)
                </p>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Webhook Secret
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="utserangkitasemua"
                  value={config.webhookSecret}
                  onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Secret for validating webhook requests (must match backend .env)
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save Configuration
              </button>
              {saved && (
                <span className="text-sm text-green-600 font-medium">
                  ✓ Configuration saved successfully!
                </span>
              )}
            </div>

            {/* Info Box */}
            <div className="mt-8 rounded-lg bg-blue-50 p-4">
              <div className="flex gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Note:</p>
                  <p>Settings are saved in your browser's localStorage. You'll need to configure these on each device/browser you use.</p>
                  <p className="mt-2">For production, these values should be set in your backend <code className="bg-blue-100 px-1 rounded">.env</code> file instead.</p>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <UserManagement />
          )}
        </div>
      </main>
    </div>
  );
}
