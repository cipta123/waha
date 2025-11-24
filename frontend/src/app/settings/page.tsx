'use client';

import { useState, useEffect } from 'react';
import { UserManagement } from '@/components/UserManagement';
import { getAiStatus, setAiStatus } from '@/lib/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState({
    apiBaseUrl: '',
    wahaBaseUrl: '',
    wahaApiKey: '',
    webhookSecret: '',
  });
  const [saved, setSaved] = useState(false);
  
  // AI Settings State
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');

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

    // Fetch AI Status
    fetchAiStatus();
  }, []);

  const fetchAiStatus = async () => {
    try {
      const res = await getAiStatus();
      setAiEnabled(res.enabled);
    } catch (err) {
      console.error('Failed to fetch AI status:', err);
    }
  };

  const handleToggleAi = async () => {
    setLoadingAi(true);
    setAiError('');
    setAiSuccess('');
    try {
      const newState = !aiEnabled;
      await setAiStatus(newState);
      setAiEnabled(newState);
      setAiSuccess(newState ? 'AI System enabled successfully' : 'AI System disabled successfully');
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (err: any) {
      setAiError(err.message || 'Failed to toggle AI settings');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('waha_config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 h-full">
      <div className="p-8">
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
              <button
                onClick={() => setActiveTab('ai')}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'ai'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                AI Settings
              </button>
            </nav>
          </div>

          {activeTab === 'general' && (
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
          )}

          {activeTab === 'users' && <UserManagement />}

          {activeTab === 'ai' && (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-slate-900">Global AI Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div>
                    <h3 className="text-lg font-medium text-slate-900">Enable AI Auto-Reply</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      When enabled, the AI will automatically reply to messages in conversations set to "AI Mode".
                      <br />
                      Disable this to stop all AI replies globally (Panic Button).
                    </p>
                  </div>
                  
                  <button
                    onClick={handleToggleAi}
                    disabled={loadingAi}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      aiEnabled ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        aiEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {aiSuccess && (
                  <div className="p-4 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-200">
                    ✓ {aiSuccess}
                  </div>
                )}

                {aiError && (
                  <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-200">
                    ⚠ {aiError}
                  </div>
                )}

                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Note:</p>
                      <p>This setting applies globally to the entire application.</p>
                      <p>If disabled, conversations in "AI Mode" will receive messages but the AI will NOT reply.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
