import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Target,
  Zap,
  TrendingUp,
  CheckCircle,
  Globe,
  Sparkles
} from 'lucide-react';
import MissionLogo from '../Mission.svg';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const validateUrl = (value: string) => {
    // Simple URL validation - allows domain.com or https://domain.com
    // Also accepts anything with at least one dot for easier testing
    if (!value.trim()) return false;
    const urlPattern = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i;
    return urlPattern.test(value.trim());
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    setTouched(true);
    const valid = validateUrl(value);
    setIsValidUrl(valid);

    // Clear error when typing valid URL
    if (valid) {
      setError('');
    }
  };

  const handleAnalyze = () => {
    // If URL is entered but invalid, show error
    if (url.trim() && !isValidUrl) {
      setError('Please enter a valid website URL (e.g., example.com)');
      return;
    }

    // Navigate to onboarding, with URL if provided
    if (url.trim()) {
      navigate(`/onboarding?url=${encodeURIComponent(url.trim())}`);
    } else {
      navigate('/onboarding');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white overflow-y-auto">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={MissionLogo} alt="MissionContent" className="h-8" />
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/onboarding"
              className="text-sm bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium rounded-full mb-6">
              <Sparkles size={14} />
              AI-Powered Content Strategy
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Discover Your<br />
              <span className="text-cyan-400">Content Opportunity Score</span>
            </h1>

            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Find the content gaps your competitors are missing. Get AI-powered category
              suggestions and start ranking for keywords that matter.
            </p>
          </motion.div>

          {/* Free Analysis CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl mx-auto mb-8"
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={url}
                  onChange={handleUrlChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your website URL"
                  className={`w-full pl-12 pr-4 py-4 bg-slate-900 border text-white
                           placeholder-slate-500 focus:outline-none transition-colors
                           ${error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-cyan-500'}`}
                />
                {url && isValidUrl && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              <button
                onClick={handleAnalyze}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-4 font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
              >
                {url.trim() ? 'Analyze Free' : 'Get Started'}
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Error message */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm mt-2 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {error}
              </motion.p>
            )}

            <p className="text-xs text-slate-500 mt-3">
              Results in 60 seconds. No credit card required.
            </p>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-6 text-slate-500 text-xs"
          >
            <span className="flex items-center gap-1">
              <CheckCircle size={14} className="text-green-500" />
              Free to start
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle size={14} className="text-green-500" />
              5 free articles
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle size={14} className="text-green-500" />
              No commitment
            </span>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            What You'll Discover
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/50 border border-slate-800 p-6"
            >
              <div className="w-12 h-12 bg-cyan-500/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Content Gap Analysis</h3>
              <p className="text-slate-400 text-sm">
                Find topics your competitors rank for that you're missing.
                Identify quick wins with high search volume and low competition.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/50 border border-slate-800 p-6"
            >
              <div className="w-12 h-12 bg-cyan-500/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Category Suggestions</h3>
              <p className="text-slate-400 text-sm">
                Get personalized content categories based on your industry,
                audience, and business goals. No guesswork required.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900/50 border border-slate-800 p-6"
            >
              <div className="w-12 h-12 bg-cyan-500/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Search Volume Data</h3>
              <p className="text-slate-400 text-sm">
                See real monthly search volumes for each category.
                Prioritize content that will drive the most traffic.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            How It Works
          </h2>

          <div className="space-y-8">
            {[
              {
                step: 1,
                title: 'Enter Your Website',
                description: 'We analyze your site to understand your industry, audience, and current content.'
              },
              {
                step: 2,
                title: 'Review Your Profile',
                description: 'See what we discovered about your business and fine-tune the details.'
              },
              {
                step: 3,
                title: 'Get AI Categories',
                description: 'Receive personalized content categories with search volume and competition data.'
              },
              {
                step: 4,
                title: 'Generate Content',
                description: 'Start creating SEO-optimized articles with our AI content engine.'
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 items-start"
              >
                <div className="w-10 h-10 bg-cyan-600 flex items-center justify-center flex-shrink-0 font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <Zap className="w-12 h-12 text-cyan-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">
            Ready to Find Your Content Gaps?
          </h2>
          <p className="text-slate-400 mb-8">
            Start with a free analysis and get 5 AI-generated articles on us.
          </p>
          <button
            onClick={() => navigate('/onboarding')}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            Get Started Free
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-500">
          <span>MissionContent - AI-Powered Content Strategy</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
