import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  Zap,
  Building2,
  Rocket,
  Crown,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  Globe,
  Users,
  FileText,
  Search,
  BarChart3,
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { SubscriptionTier } from '../types';

// ============================================================================
// SUBSCRIPTION TIER DATA
// ============================================================================

interface TierFeature {
  name: string;
  free: string | boolean;
  basic: string | boolean;
  business: string | boolean;
  enterprise: string | boolean;
}

const TIER_FEATURES: TierFeature[] = [
  { name: 'Monthly Credits', free: '0', basic: '100', business: '500', enterprise: 'Unlimited' },
  { name: 'Projects', free: '1', basic: '3', business: '10', enterprise: 'Unlimited' },
  { name: 'Users per Project', free: '1', basic: '3', business: '10', enterprise: 'Unlimited' },
  { name: 'Articles per Month', free: '5', basic: '50', business: '200', enterprise: 'Unlimited' },
  { name: 'Research Type', free: 'Shallow (AI)', basic: 'Shallow (AI)', business: 'Deep (Real Data)', enterprise: 'Deep (Real Data)' },
  { name: 'Keyword Metrics', free: false, basic: true, business: true, enterprise: true },
  { name: 'Max Keywords per Research', free: '10', basic: '20', business: '50', enterprise: '100' },
  { name: 'Website Publishing', free: false, basic: true, business: true, enterprise: true },
  { name: 'Custom Domain', free: false, basic: false, business: true, enterprise: true },
  { name: 'Priority Support', free: false, basic: false, business: true, enterprise: true },
  { name: 'API Access', free: false, basic: false, business: false, enterprise: true },
  { name: 'Dedicated Account Manager', free: false, basic: false, business: false, enterprise: true },
];

interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ElementType;
  color: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: SubscriptionTier.STARTER,
    name: 'Basic',
    price: '$200',
    period: '/month',
    description: 'For small teams getting started',
    icon: Rocket,
    color: 'cyan',
    features: [
      '100 credits per month',
      '3 projects, 3 users each',
      '50 articles per month',
      'Keyword metrics & research',
      'Website publishing',
    ],
    cta: 'Upgrade to Basic',
  },
  {
    id: SubscriptionTier.PROFESSIONAL,
    name: 'Business',
    price: '$1,500',
    period: '/month',
    description: 'For growing content teams',
    icon: Building2,
    color: 'violet',
    popular: true,
    features: [
      '500 credits per month',
      '10 projects, 10 users each',
      '200 articles per month',
      'Deep research (real DataForSEO data)',
      'Custom domains',
      'Priority support',
    ],
    cta: 'Upgrade to Business',
  },
  {
    id: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For large organizations',
    icon: Crown,
    color: 'amber',
    features: [
      'Unlimited everything',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantees',
      'White-label options',
    ],
    cta: 'Contact Sales',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UpgradePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const currentTier = currentOrg?.subscriptionTier || SubscriptionTier.FREE;

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (tier === SubscriptionTier.ENTERPRISE) {
      // Open contact form or email
      window.location.href = 'mailto:sales@missioncontent.io?subject=Enterprise%20Inquiry';
      return;
    }

    if (tier === currentTier) {
      return; // Already on this plan
    }

    setSelectedTier(tier);
    // In a real app, this would open Stripe checkout
    // For now, just show a message
    alert(`Stripe checkout for ${tier} tier would open here. This is a demo.`);
  };

  const getTierColor = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
      slate: {
        bg: 'bg-slate-800/50',
        border: 'border-slate-700',
        text: 'text-slate-400',
        badge: 'bg-slate-700 text-slate-300',
      },
      cyan: {
        bg: 'bg-cyan-500/5',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        badge: 'bg-cyan-500/20 text-cyan-400',
      },
      violet: {
        bg: 'bg-violet-500/5',
        border: 'border-violet-500/30',
        text: 'text-violet-400',
        badge: 'bg-violet-500/20 text-violet-400',
      },
      amber: {
        bg: 'bg-amber-500/5',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-400',
      },
    };
    return colors[color] || colors.slate;
  };

  return (
    <div className="h-screen bg-slate-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Unlock Full Potential
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Scale your content production with AI-powered tools.
            All plans include our core features.
          </p>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier, index) => {
            const colors = getTierColor(tier.color);
            const Icon = tier.icon;
            const isCurrentTier = tier.id === currentTier;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative ${colors.bg} border ${colors.border} p-6 ${
                  tier.popular ? 'ring-2 ring-violet-500' : ''
                }`}
              >
                {/* Popular Badge */}
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-violet-500 text-white text-xs font-bold uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold uppercase tracking-wider">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 ${colors.badge} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Name & Price */}
                <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-white">{tier.price}</span>
                  <span className="text-slate-500">{tier.period}</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">{tier.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 ${colors.text} flex-shrink-0 mt-0.5`} />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectTier(tier.id)}
                  disabled={isCurrentTier}
                  className={`w-full py-3 font-bold uppercase tracking-wider text-sm transition-colors ${
                    isCurrentTier
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : tier.popular
                      ? 'bg-violet-600 hover:bg-violet-500 text-white'
                      : `bg-slate-800 hover:bg-slate-700 text-white`
                  }`}
                >
                  {isCurrentTier ? 'Current Plan' : tier.cta}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Free Tier Link */}
      <div className="max-w-5xl mx-auto px-6 pb-8 text-center">
        <p className="text-slate-500 text-sm">
          Just exploring?{' '}
          <button
            onClick={() => navigate(-1)}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
          >
            Continue with free tier
          </button>
          {' '}- 5 articles, 1 project, no credit card required.
        </p>
      </div>

      {/* Toggle Comparison Table */}
      <div className="max-w-5xl mx-auto px-6 pb-8">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="mx-auto flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
        >
          {showComparison ? 'Hide' : 'Show'} Full Feature Comparison
        </button>
      </div>

      {/* Feature Comparison Table */}
      {showComparison && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="max-w-5xl mx-auto px-6 pb-16"
        >
          <div className="bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left p-4 text-slate-400 font-medium">Feature</th>
                  <th className="text-center p-4 text-cyan-400 font-medium">Basic</th>
                  <th className="text-center p-4 text-violet-400 font-medium bg-violet-500/5">Business</th>
                  <th className="text-center p-4 text-amber-400 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {TIER_FEATURES.map((feature, index) => (
                  <tr key={index} className="border-b border-slate-800/50">
                    <td className="p-4 text-sm text-slate-300">{feature.name}</td>
                    <td className="p-4 text-center">
                      {typeof feature.basic === 'boolean' ? (
                        feature.basic ? (
                          <Check className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-slate-300">{feature.basic}</span>
                      )}
                    </td>
                    <td className="p-4 text-center bg-violet-500/5">
                      {typeof feature.business === 'boolean' ? (
                        feature.business ? (
                          <Check className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-white font-medium">{feature.business}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof feature.enterprise === 'boolean' ? (
                        feature.enterprise ? (
                          <Check className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-amber-400 font-medium">{feature.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>

        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5">
            <h3 className="font-bold text-white mb-2">What are credits used for?</h3>
            <p className="text-sm text-slate-400">
              Credits are used for AI operations like generating articles, research, translations, and more.
              Different operations cost different amounts of credits.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5">
            <h3 className="font-bold text-white mb-2">Do unused credits roll over?</h3>
            <p className="text-sm text-slate-400">
              No, credits refresh monthly based on your subscription tier. Unused credits do not roll over to the next month.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5">
            <h3 className="font-bold text-white mb-2">What's the difference between Shallow and Deep research?</h3>
            <p className="text-sm text-slate-400">
              Shallow research uses AI to estimate keyword metrics. Deep research uses real DataForSEO data
              for accurate search volumes, competition scores, and CPC data.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5">
            <h3 className="font-bold text-white mb-2">Can I upgrade or downgrade anytime?</h3>
            <p className="text-sm text-slate-400">
              Yes, you can change your plan at any time. When upgrading, you'll be charged a prorated amount.
              When downgrading, the change takes effect at the next billing cycle.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to scale your content?</h2>
          <p className="text-slate-400 mb-8">
            Join thousands of content teams using MissionContent to dominate search results.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleSelectTier(SubscriptionTier.PROFESSIONAL)}
              className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold uppercase tracking-wider transition-colors"
            >
              Get Started with Business
            </button>
            <a
              href="mailto:sales@missioncontent.io"
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-wider transition-colors"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
