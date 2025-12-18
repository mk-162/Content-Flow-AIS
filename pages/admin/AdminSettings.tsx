import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Settings, Key, CheckCircle, XCircle, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { dataForSeoService } from '../../services/dataForSeoService';

interface AdminSettings {
  dataForSeoLogin?: string;
  dataForSeoPassword?: string;
  dataForSeoEnabled?: boolean;
  updatedAt?: Timestamp;
}

export const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'adminConfig', 'settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AdminSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const docRef = doc(db, 'adminConfig', 'settings');
      // Trim whitespace from credentials to prevent copy/paste issues
      const cleanedSettings = {
        ...settings,
        dataForSeoLogin: settings.dataForSeoLogin?.trim(),
        dataForSeoPassword: settings.dataForSeoPassword?.trim(),
        updatedAt: Timestamp.now()
      };
      await setDoc(docRef, cleanedSettings, { merge: true });

      // Update local state with trimmed values
      setSettings(cleanedSettings);

      // Clear the credentials cache
      dataForSeoService.clearCredentialsCache();

      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // First save current credentials
      await handleSave();

      // Then test connection
      const result = await dataForSeoService.testConnection();
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
          <Settings className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-sm text-slate-500">Configure integrations and system-wide settings</p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* DataForSEO Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-white">DataForSEO Integration</h2>
              <p className="text-sm text-slate-500">Real keyword data for PROFESSIONAL and ENTERPRISE tiers</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-bold text-white">Enable DataForSEO</label>
              <p className="text-xs text-slate-500">When disabled, all tiers use AI-estimated keywords</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, dataForSeoEnabled: !settings.dataForSeoEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.dataForSeoEnabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.dataForSeoEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* API Credentials */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                DataForSEO Login (Email)
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  value={settings.dataForSeoLogin || ''}
                  onChange={(e) => setSettings({ ...settings, dataForSeoLogin: e.target.value })}
                  placeholder="your-email@example.com"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-300 pl-10 pr-4 py-3 focus:border-cyan-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                DataForSEO Password (API Key)
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="password"
                  value={settings.dataForSeoPassword || ''}
                  onChange={(e) => setSettings({ ...settings, dataForSeoPassword: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-300 pl-10 pr-4 py-3 focus:border-cyan-500 outline-none text-sm"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Get your credentials at{' '}
                <a href="https://app.dataforseo.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                  app.dataforseo.com
                </a>
              </p>
            </div>
          </div>

          {/* Test Connection Result */}
          {testResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              testResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <p className={`text-sm ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={handleTestConnection}
              disabled={testing || !settings.dataForSeoLogin || !settings.dataForSeoPassword}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 disabled:text-slate-600 text-slate-300 text-sm font-medium transition-colors"
            >
              {testing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Test Connection</>
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white text-sm font-bold uppercase tracking-wider transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <h3 className="text-sm font-bold text-white mb-3">How Research Works by Tier</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <div className="flex items-start gap-2">
            <div className="w-20 text-slate-500 shrink-0">FREE</div>
            <div>AI-estimated keywords only. No real SEO metrics shown.</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-20 text-yellow-400 shrink-0">STARTER</div>
            <div>AI-estimated keywords with metrics displayed.</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-20 text-cyan-400 shrink-0">PROFESSIONAL</div>
            <div>Real DataForSEO keyword data + competitor analysis.</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-20 text-purple-400 shrink-0">ENTERPRISE</div>
            <div>Full DataForSEO data with extended limits.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
