import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Rocket,
  Globe,
  Palette,
  Link2,
  Save,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Project } from '../../types';
import { updateDeploymentConfig, testWebhook, triggerBuild } from '../../services/deploymentService';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  project: Project;
  onClose: () => void;
  onSave: () => void;
}

export const DeploymentConfigModal: React.FC<Props> = ({ project, onClose, onSave }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState(project.settings?.deployment?.theme || '');
  const [webhookUrl, setWebhookUrl] = useState(project.settings?.deployment?.webhookUrl || '');
  const [customDomain, setCustomDomain] = useState(project.settings?.deployment?.customDomain || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [buildResult, setBuildResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Strip protocol from customDomain if present (we only want the domain)
      const cleanDomain = customDomain.trim().replace(/^https?:\/\//, '');
      await updateDeploymentConfig(project.organizationId, project.id, {
        theme: theme.trim() || undefined,
        webhookUrl: webhookUrl.trim() || undefined,
        customDomain: cleanDomain || undefined,
      });
      onSave();
    } catch (error) {
      console.error('Error saving deployment config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      const result = await testWebhook(webhookUrl.trim());
      setTestResult({
        success: result.success,
        message: result.success ? 'Webhook is valid and triggered a build!' : result.error || 'Failed to test webhook'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Error testing webhook'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerBuild = async () => {
    if (!user || !webhookUrl.trim()) return;
    setTriggering(true);
    setBuildResult(null);

    try {
      const result = await triggerBuild(project.organizationId, project.id, user.id, webhookUrl);
      setBuildResult({
        success: result.success,
        message: result.success ? 'Build triggered successfully!' : result.error || 'Failed to trigger build'
      });
    } catch (error) {
      setBuildResult({
        success: false,
        message: 'Error triggering build'
      });
    } finally {
      setTriggering(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const isValidWebhookUrl = webhookUrl.includes('api.cloudflare.com') && webhookUrl.includes('deploy_hooks');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Deployment Configuration</h2>
                <p className="text-sm text-slate-400">{project.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* IDs Reference */}
            <div className="bg-slate-800/50 border border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Terraform Reference IDs</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between bg-slate-900 px-3 py-2">
                  <span className="text-slate-500">org_id:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-cyan-400 font-mono text-xs">{project.organizationId}</code>
                    <button
                      onClick={() => copyToClipboard(project.organizationId, 'org_id')}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                      {copied === 'org_id' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-900 px-3 py-2">
                  <span className="text-slate-500">proj_id:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-cyan-400 font-mono text-xs">{project.id}</code>
                    <button
                      onClick={() => copyToClipboard(project.id, 'proj_id')}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                      {copied === 'proj_id' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Palette className="w-4 h-4 text-purple-400" />
                Theme
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., default, ribble, thisworks"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Theme folder name in the astromssn repository
              </p>
            </div>

            {/* Custom Domain */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Custom Domain
              </label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="e.g., ribble.mssnhst.com"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                The published site domain (managed via Terraform/CloudFlare)
              </p>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Link2 className="w-4 h-4 text-amber-400" />
                CloudFlare Deploy Hook URL
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-sm"
              />
              {webhookUrl && !isValidWebhookUrl && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  URL doesn't match expected CloudFlare webhook format
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Get this from CloudFlare Pages → Settings → Builds & Deployments → Deploy Hooks
              </p>
            </div>

            {/* Test/Build Results */}
            {(testResult || buildResult) && (
              <div className={`p-3 border ${
                (testResult?.success || buildResult?.success)
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  {(testResult?.success || buildResult?.success) ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${
                    (testResult?.success || buildResult?.success) ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {testResult?.message || buildResult?.message}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              {webhookUrl && (
                <>
                  <button
                    onClick={handleTest}
                    disabled={testing || !isValidWebhookUrl}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors disabled:opacity-50"
                  >
                    {testing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    Test Webhook
                  </button>
                  <button
                    onClick={handleTriggerBuild}
                    disabled={triggering || !isValidWebhookUrl}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-50"
                  >
                    {triggering ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4" />
                    )}
                    Trigger Build
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800 bg-slate-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Configuration
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
