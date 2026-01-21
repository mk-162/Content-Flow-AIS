import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, ArrowRight, Sparkles, Shield, Zap, BarChart3 } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { validateUrl } from '../../services/websiteAnalysisService';

export const URLInputStep: React.FC = () => {
  const { startAnalysis, loading } = useOnboarding();
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Pre-fill URL from query parameter (from home page CTA)
  // Also support ?demo=true to auto-trigger demo mode
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam && !url) {
      setUrl(urlParam);
    }

    // Dev testing: auto-trigger demo mode with ?demo=true
    const demoParam = searchParams.get('demo');
    if (demoParam === 'true' && !loading) {
      console.log('[Dev] Auto-triggering demo mode via URL param');
      startAnalysis('', true);
    }
  }, [searchParams]);

  // Real-time URL validation
  useEffect(() => {
    if (!url.trim()) {
      setError('');
      setIsValid(false);
      return;
    }

    const result = validateUrl(url);
    if (result.valid) {
      setError('');
      setIsValid(true);
    } else {
      setError(result.error || 'Invalid URL');
      setIsValid(false);
    }
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      await startAnalysis(url);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    }
  };

  return (
    <div className="text-center relative">
      {/* Mission Control Grid Background */}
      <div className="absolute inset-0 mission-grid pointer-events-none" />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-6"
        >
          <Sparkles className="w-4 h-4" />
          AI-Powered Content Intelligence
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">
          Discover Your Content
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-400">
            Opportunity Score
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
          AI assistants are answering your customers' questions.
          <br className="hidden sm:block" />
          Let's find out how many answers you're missing.
        </p>
      </motion.div>

      {/* URL Input Form - Mobile Responsive */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-2xl mx-auto mb-8 relative"
      >
        {/* Mobile: Stacked layout / Desktop: Inline layout */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-website.com"
              disabled={loading}
              className={`
                w-full pl-12 pr-4 py-4 text-base sm:text-lg
                bg-slate-900 border-2 text-white placeholder-slate-500
                focus:outline-none transition-all glow-cyan
                ${error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-cyan-500'}
                ${isValid ? 'border-emerald-500/50' : ''}
              `}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !isValid}
            className={`
              px-6 sm:px-8 py-4 font-bold text-sm uppercase tracking-wider
              flex items-center justify-center gap-2 transition-all whitespace-nowrap
              ${loading || !isValid
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer glow-cyan'
              }
            `}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        <div className="h-6 mt-2 text-left">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm font-medium flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </motion.p>
          )}
        </div>

        {/* Success indicator */}
        {isValid && !error && url && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-emerald-400 text-sm text-left flex items-center gap-1"
          >
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Valid URL - ready to analyze
          </motion.p>
        )}
      </motion.form>

      {/* Trust badges - Updated messaging per audit */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-slate-500 text-sm mb-8"
      >
        No signup required. Results in ~2 minutes.
      </motion.div>

      {/* Demo Mode Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mb-12"
      >
        <button
          onClick={() => startAnalysis('', true)}
          disabled={loading}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium underline underline-offset-4 transition-colors disabled:opacity-50"
        >
          Or try with demo data
        </button>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
      >
        <div className="p-6 bg-slate-900/50 border border-slate-800">
          <div className="w-10 h-10 bg-cyan-500/10 flex items-center justify-center mb-4 mx-auto">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="font-semibold mb-2">Instant Analysis</h3>
          <p className="text-sm text-slate-500">
            AI-powered scan of your website in seconds
          </p>
        </div>

        <div className="p-6 bg-slate-900/50 border border-slate-800">
          <div className="w-10 h-10 bg-cyan-500/10 flex items-center justify-center mb-4 mx-auto">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="font-semibold mb-2">Content Gaps</h3>
          <p className="text-sm text-slate-500">
            Identify missing content opportunities
          </p>
        </div>

        <div className="p-6 bg-slate-900/50 border border-slate-800">
          <div className="w-10 h-10 bg-cyan-500/10 flex items-center justify-center mb-4 mx-auto">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="font-semibold mb-2">Brand Voice</h3>
          <p className="text-sm text-slate-500">
            Detect your unique brand personality
          </p>
        </div>
      </motion.div>

      {/* Social proof - Using stats instead of placeholder logos */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12"
      >
        <div className="flex items-center justify-center gap-12 text-center">
          <div>
            <div className="text-2xl font-bold text-white">50K+</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Articles Generated</div>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          <div>
            <div className="text-2xl font-bold text-white">2.5M</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Monthly Traffic</div>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          <div>
            <div className="text-2xl font-bold text-white">98%</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Client Satisfaction</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default URLInputStep;
