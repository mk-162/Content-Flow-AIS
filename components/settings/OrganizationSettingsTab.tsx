import React, { useState, useEffect } from 'react';
import {
  Save,
  Globe,
  Type,
  Palette,
  FileText,
  Shield,
  Zap,
  Calendar,
  UploadCloud,
  Terminal,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useOrganization } from '../../contexts/OrganizationContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { GeographicTargetingSelector } from '../GeographicTargetingSelector';
import { fetchBrandInfo } from '../../services/geminiService';
import { ContentType, PromptType, PromptOverrides } from '../../types';

export const OrganizationSettingsTab: React.FC = () => {
  const { currentOrg } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [activePromptTab, setActivePromptTab] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    website: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    font: '',
    brandMessage: '',
    brandCompliance: '',
    brandImageDescription: '',
    targetAudiencePrimary: '',
    targetAudienceSecondary: '',
    ageRange: '',
    income: '',
    geographic: [] as string[],
    promptOverrides: {} as PromptOverrides,
  });

  useEffect(() => {
    if (currentOrg) {
      setFormData({
        website: currentOrg.website || '',
        primaryColor: currentOrg.customBranding?.primaryColor || '#06b6d4',
        secondaryColor: currentOrg.customBranding?.secondaryColor || '#64748b',
        font: currentOrg.customBranding?.font || '',
        brandMessage: currentOrg.brandMessage || '',
        brandCompliance: currentOrg.brandCompliance || '',
        brandImageDescription: currentOrg.brandImageStyle?.description || '',
        targetAudiencePrimary: currentOrg.targetAudience?.primary || '',
        targetAudienceSecondary: currentOrg.targetAudience?.secondary || '',
        ageRange: currentOrg.targetAudience?.demographics?.ageRange || '',
        income: currentOrg.targetAudience?.demographics?.income || '',
        geographic: currentOrg.targetAudience?.demographics?.geographic || [],
        promptOverrides: currentOrg.promptOverrides || {},
      });
    }
  }, [currentOrg]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!currentOrg) return;
    setLoading(true);
    setSuccessMsg('');

    try {
      const orgRef = doc(db, 'organizations', currentOrg.id);
      await updateDoc(orgRef, {
        website: formData.website,
        customBranding: {
          ...currentOrg.customBranding,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          font: formData.font,
        },
        brandMessage: formData.brandMessage,
        brandCompliance: formData.brandCompliance,
        brandImageStyle: {
          description: formData.brandImageDescription,
        },
        targetAudience: {
          ...currentOrg.targetAudience,
          primary: formData.targetAudiencePrimary,
          secondary: formData.targetAudienceSecondary,
          demographics: {
            ...currentOrg.targetAudience?.demographics,
            ageRange: formData.ageRange,
            income: formData.income,
            geographic: formData.geographic,
          },
        },
        promptOverrides: formData.promptOverrides,
        updatedAt: new Date(),
      });
      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchBrand = async () => {
    if (!formData.website) {
      alert('Please enter a website URL first');
      return;
    }

    setLoading(true);
    try {
      const info = await fetchBrandInfo(formData.website, currentOrg!.id);

      setFormData((prev) => ({
        ...prev,
        brandMessage: info.brandMessage || prev.brandMessage,
        brandCompliance: info.compliance || prev.brandCompliance,
        primaryColor: info.brandColors?.primary || prev.primaryColor,
        secondaryColor: info.brandColors?.secondary || prev.secondaryColor,
      }));

      setSuccessMsg('Brand info fetched successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error fetching brand info:', error);
      alert('Failed to fetch brand info. Please try again or enter manually.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!currentOrg) return <div className="text-slate-400">Loading organization...</div>;

  return (
    <div className="space-y-8">
      {/* Save Button Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{currentOrg.name}</h2>
          <p className="text-sm text-slate-400">Organization settings and brand identity</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Subscription & Credits */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Subscription & Credits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 border border-slate-700">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Current Plan</div>
            <div className="text-xl font-bold text-white capitalize">{currentOrg.subscriptionTier}</div>
          </div>
          <div className="bg-slate-950 p-4 border border-slate-700">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Credit Balance</div>
            <div className="text-xl font-bold text-white flex items-center gap-2">
              {currentOrg.credits?.balance ?? 0}
              <span className="text-sm font-normal text-slate-500">
                / {currentOrg.credits?.monthlyAllowance ?? 0} monthly
              </span>
            </div>
          </div>
          <div className="md:col-span-2 flex items-center gap-2 text-sm text-slate-400 bg-slate-950 p-3 border border-slate-700">
            <Calendar className="w-4 h-4" />
            Next refill: <span className="text-white font-medium">{formatDate(currentOrg.credits?.nextRefillAt)}</span>
          </div>
        </div>
      </section>

      {/* Website */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          Website
        </h3>
        <div className="flex gap-2">
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://example.com"
            className="flex-1 bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleFetchBrand}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors text-sm"
          >
            Fetch Brand Info
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Enter your website to auto-populate brand details</p>
      </section>

      {/* Brand Identity */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-400" />
          Brand Identity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="primaryColor"
                value={formData.primaryColor}
                onChange={handleChange}
                className="w-10 h-10 cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                name="primaryColor"
                value={formData.primaryColor}
                onChange={handleChange}
                className="flex-1 bg-slate-950 border border-slate-700 px-4 py-2 text-white focus:outline-none focus:border-cyan-500 uppercase"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="secondaryColor"
                value={formData.secondaryColor}
                onChange={handleChange}
                className="w-10 h-10 cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                name="secondaryColor"
                value={formData.secondaryColor}
                onChange={handleChange}
                className="flex-1 bg-slate-950 border border-slate-700 px-4 py-2 text-white focus:outline-none focus:border-cyan-500 uppercase"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Brand Font
            </label>
            <input
              type="text"
              name="font"
              value={formData.font}
              onChange={handleChange}
              placeholder="e.g. Inter, Roboto, Helvetica"
              className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          Target Audience
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Primary Audience
              </label>
              <input
                type="text"
                name="targetAudiencePrimary"
                value={formData.targetAudiencePrimary}
                onChange={handleChange}
                placeholder="e.g. Small Business Owners"
                className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Secondary Audience
              </label>
              <input
                type="text"
                name="targetAudienceSecondary"
                value={formData.targetAudienceSecondary}
                onChange={handleChange}
                placeholder="e.g. Marketing Managers"
                className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Age Range
              </label>
              <input
                type="text"
                name="ageRange"
                value={formData.ageRange}
                onChange={handleChange}
                placeholder="e.g. 25-45"
                className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Income Level
              </label>
              <input
                type="text"
                name="income"
                value={formData.income}
                onChange={handleChange}
                placeholder="e.g. Middle to High"
                className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <div>
            <GeographicTargetingSelector
              selectedCountries={formData.geographic}
              onChange={(countries) => setFormData((prev) => ({ ...prev, geographic: countries }))}
            />
            <p className="text-xs text-slate-500 mt-2">
              Select the countries where your audience is located.
            </p>
          </div>
        </div>
      </section>

      {/* Content Guidelines */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          Content Guidelines
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Key Marketing Message
            </label>
            <textarea
              name="brandMessage"
              value={formData.brandMessage}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. 'Innovating the future of fintech with customer-centric solutions.'"
              className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Compliance Guidelines
            </label>
            <textarea
              name="brandCompliance"
              value={formData.brandCompliance}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. 'Include a disclaimer that individual results may vary.'"
              className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </section>

      {/* Brand Image Style */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-pink-400" />
          Brand Image Style
        </h3>
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Image Brief Prompt
          </label>
          <textarea
            name="brandImageDescription"
            value={formData.brandImageDescription}
            onChange={handleChange}
            rows={3}
            placeholder="e.g. 'Minimalist, flat vector art, corporate blue color palette.'"
            className="w-full bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
          />
          <p className="text-xs text-slate-500 mt-2">
            This description applies to ALL AI-generated images for brand consistency.
          </p>
        </div>
      </section>

      {/* AI Prompt Overrides */}
      <section className="bg-slate-900 border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-400" />
          AI Prompt Overrides
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Override default AI prompts for this organization. Leave empty to use admin defaults.
        </p>

        <div className="space-y-2">
          {/* Content Prompts */}
          {Object.values(ContentType).map((type) => (
            <div key={type} className="border border-slate-700 overflow-hidden">
              <button
                onClick={() => setActivePromptTab(activePromptTab === type ? null : type)}
                className="w-full flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-white text-sm">{type}</span>
                </div>
                <span
                  className={`text-xs px-2 py-1 ${
                    formData.promptOverrides[type]
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {formData.promptOverrides[type] ? 'Custom' : 'Default'}
                </span>
              </button>
              {activePromptTab === type && (
                <div className="p-4 bg-slate-950/50 border-t border-slate-700">
                  <textarea
                    value={formData.promptOverrides[type] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        promptOverrides: { ...prev.promptOverrides, [type]: e.target.value || undefined },
                      }))
                    }
                    rows={8}
                    placeholder={`Leave empty to use Admin default for ${type}...`}
                    className="w-full bg-slate-900 border border-slate-700 px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                  {formData.promptOverrides[type] && (
                    <button
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          promptOverrides: { ...prev.promptOverrides, [type]: undefined },
                        }))
                      }
                      className="mt-2 text-xs text-red-400 hover:text-red-300"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* System Prompts */}
          {Object.values(PromptType).map((type) => (
            <div key={type} className="border border-slate-700 overflow-hidden">
              <button
                onClick={() => setActivePromptTab(activePromptTab === type ? null : type)}
                className="w-full flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white text-sm">{type}</span>
                </div>
                <span
                  className={`text-xs px-2 py-1 ${
                    formData.promptOverrides[type]
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {formData.promptOverrides[type] ? 'Custom' : 'Default'}
                </span>
              </button>
              {activePromptTab === type && (
                <div className="p-4 bg-slate-950/50 border-t border-slate-700">
                  <textarea
                    value={formData.promptOverrides[type] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        promptOverrides: { ...prev.promptOverrides, [type]: e.target.value || undefined },
                      }))
                    }
                    rows={8}
                    placeholder={`Leave empty to use Admin default for ${type}...`}
                    className="w-full bg-slate-900 border border-slate-700 px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  />
                  {formData.promptOverrides[type] && (
                    <button
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          promptOverrides: { ...prev.promptOverrides, [type]: undefined },
                        }))
                      }
                      className="mt-2 text-xs text-red-400 hover:text-red-300"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-slate-950/50 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500">
            Projects can further override these prompts. Priority: Project → Organization → Admin
          </p>
        </div>
      </section>
    </div>
  );
};
