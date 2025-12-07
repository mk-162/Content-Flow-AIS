import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, ArrowRight, Sparkles, Shield, Zap, BarChart3 } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { validateUrl } from '../../services/websiteAnalysisService';

export const URLInputStep: React.FC = () => {
  const { startAnalysis, loading } = useOnboarding();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

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
    <div className="text-center">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-6">
          <Sparkles className="w-4 h-4" />
          AI-Powered Content Intelligence
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Discover Your Content
          <span className="text-cyan-400"> Opportunity Score</span>
        </h1>

        <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
          AI assistants are answering your customers' questions.
          <br />
          Let's find out how many answers you're missing.
        </p>
      </motion.div>

      {/* URL Input Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-2xl mx-auto mb-8"
      >
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            <Globe className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-website.com"
            disabled={loading}
            className={`
              w-full pl-12 pr-36 py-4 text-lg
              bg-slate-900 border-2 text-white placeholder-slate-500
              focus:outline-none transition-colors
              ${error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-cyan-500'}
              ${isValid ? 'border-green-500/50' : ''}
            `}
          />
          <button
            type="submit"
            disabled={loading || !isValid}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2
              px-6 py-2.5 font-bold text-sm uppercase tracking-wider
              flex items-center gap-2 transition-all
              ${loading || !isValid
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer'
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
            className="mt-2 text-green-400 text-sm text-left flex items-center gap-1"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            Valid URL - ready to analyze
          </motion.p>
        )}
      </motion.form>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-slate-500 text-sm mb-12"
      >
        No signup required. Results in 60 seconds.
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

      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-slate-500 text-sm"
      >
        <p className="mb-4">Trusted by content teams at</p>
        <div className="flex items-center justify-center gap-8 opacity-50">
          {/* Placeholder for logo badges */}
          <div className="h-6 w-24 bg-slate-700/50" />
          <div className="h-6 w-20 bg-slate-700/50" />
          <div className="h-6 w-28 bg-slate-700/50" />
          <div className="h-6 w-24 bg-slate-700/50" />
        </div>
      </motion.div>
    </div>
  );
};

export default URLInputStep;
