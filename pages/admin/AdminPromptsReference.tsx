import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Code, FileText, Lightbulb, ChevronDown, ChevronRight, Copy, Check, Database, Settings, Eye, Edit3, RefreshCw } from 'lucide-react';

// Variable definitions - where they come from and how to manage them
interface VariableDefinition {
  name: string;
  source: string;
  location: string;
  viewable: boolean;
  editable: boolean;
  howToView?: string;
  howToEdit?: string;
}

const TITLE_GENERATION_VARIABLES: VariableDefinition[] = [
  {
    name: 'businessContext',
    source: 'Project Settings > Business Context',
    location: 'Firestore: organizations/{orgId}/projects/{projectId} → businessProfile',
    viewable: true,
    editable: true,
    howToView: 'Open any project → Settings → Business Context tab',
    howToEdit: 'Same location - edit fields and save'
  },
  {
    name: 'keywordContext',
    source: 'Category Keyword Research',
    location: 'Firestore: categoryResearch/{categoryId}',
    viewable: true,
    editable: false,
    howToView: 'Categories tab → Click category → "Research" button in modal',
    howToEdit: 'Cannot edit directly - click "Refresh Research" to regenerate'
  },
  {
    name: 'categoryName',
    source: 'Category Document',
    location: 'Firestore: organizations/{orgId}/projects/{projectId}/categories/{categoryId}',
    viewable: true,
    editable: true,
    howToView: 'Categories tab - visible in list',
    howToEdit: 'Click category → Edit name in modal'
  },
  {
    name: 'categoryDescription',
    source: 'Category Document',
    location: 'Firestore: organizations/{orgId}/projects/{projectId}/categories/{categoryId}',
    viewable: true,
    editable: true,
    howToView: 'Categories tab → Click category → Description field',
    howToEdit: 'Same location - edit and save'
  },
  {
    name: 'existingTitlesContext',
    source: 'Existing Posts Query',
    location: 'Firestore: organizations/{orgId}/projects/{projectId}/posts (where categoryId matches)',
    viewable: true,
    editable: false,
    howToView: 'Content Engine tab - shows all posts',
    howToEdit: 'Auto-generated from existing posts - delete posts to change'
  },
  {
    name: 'requestedCount',
    source: 'Generation Request',
    location: 'Passed as parameter when clicking "Generate Titles"',
    viewable: false,
    editable: true,
    howToView: 'N/A - runtime parameter',
    howToEdit: 'Change the number input when generating titles'
  }
];

const ARTICLE_GENERATION_VARIABLES: VariableDefinition[] = [
  {
    name: 'businessContext',
    source: 'Project Settings > Business Context',
    location: 'Firestore: organizations/{orgId}/projects/{projectId} → businessProfile',
    viewable: true,
    editable: true,
    howToView: 'Open any project → Settings → Business Context tab',
    howToEdit: 'Same location - edit fields and save'
  },
  {
    name: 'keywordContext',
    source: 'Category Keyword Research',
    location: 'Firestore: categoryResearch/{categoryId}',
    viewable: true,
    editable: false,
    howToView: 'Categories tab → Click category → "Research" button',
    howToEdit: 'Cannot edit - regenerate via "Refresh Research"'
  },
  {
    name: 'title',
    source: 'Post Document',
    location: 'Firestore: organizations/{orgId}/projects/{projectId}/posts/{postId}',
    viewable: true,
    editable: true,
    howToView: 'Content Engine → Click any post',
    howToEdit: 'Click post → Edit title field'
  },
  {
    name: 'teaser',
    source: 'Post Document',
    location: 'Firestore: organizations/{orgId}/projects/{projectId}/posts/{postId}',
    viewable: true,
    editable: true,
    howToView: 'Content Engine → Click post → Teaser field',
    howToEdit: 'Same location - edit and save'
  },
  {
    name: 'tags/keywords',
    source: 'Post Document',
    location: 'Firestore: organizations/{orgId}/projects/{projectId}/posts/{postId} → tags[]',
    viewable: true,
    editable: true,
    howToView: 'Content Engine → Click post → Tags/Keywords section',
    howToEdit: 'Same location - add/remove tags'
  },
  {
    name: 'searchIntent',
    source: 'Post Document (auto-set on title generation)',
    location: 'Firestore: organizations/{orgId}/projects/{projectId}/posts/{postId}',
    viewable: false,
    editable: false,
    howToView: 'Not currently exposed in UI',
    howToEdit: 'Set automatically when titles are generated'
  },
  {
    name: 'tone',
    source: 'Post or Project Default',
    location: 'Post document or project.businessProfile.brandVoice.tone',
    viewable: true,
    editable: true,
    howToView: 'Project Settings → Business Context → Brand Voice',
    howToEdit: 'Same location - select tone options'
  },
  {
    name: 'contentType',
    source: 'Post Document',
    location: 'Firestore: posts/{postId} → contentType',
    viewable: true,
    editable: true,
    howToView: 'Content Engine → Post editor',
    howToEdit: 'Change content type dropdown when editing post'
  }
];

const CATEGORY_SUGGESTION_VARIABLES: VariableDefinition[] = [
  {
    name: 'fullContext (projectContext)',
    source: 'Project Document + Business Profile',
    location: 'Firestore: organizations/{orgId}/projects/{projectId}',
    viewable: true,
    editable: true,
    howToView: 'Project Settings → all tabs',
    howToEdit: 'Project Settings - edit name, description, business profile'
  },
  {
    name: 'existingCategoriesContext',
    source: 'Existing Categories Query',
    location: 'Firestore: organizations/{orgId}/projects/{projectId}/categories',
    viewable: true,
    editable: false,
    howToView: 'Categories tab - shows all categories',
    howToEdit: 'Auto-generated - add/remove categories to change'
  },
  {
    name: 'parentCategory',
    source: 'Selected Parent Category',
    location: 'Runtime - selected category when creating subcategories',
    viewable: true,
    editable: true,
    howToView: 'Category being expanded',
    howToEdit: 'Select different parent category'
  },
  {
    name: 'query',
    source: 'User Input',
    location: 'Runtime - search/filter text entered by user',
    viewable: true,
    editable: true,
    howToView: 'Text you type in the search/suggestion box',
    howToEdit: 'Type different text'
  }
];

// These are the actual prompts from functions/src/index.ts
const CLOUD_FUNCTION_PROMPTS = {
  titleGeneration: {
    name: 'Title Generation',
    description: 'Used by processGenerateTitles() in Cloud Functions when generating blog post titles for a category.',
    location: 'functions/src/index.ts (lines ~1082-1122)',
    variables: TITLE_GENERATION_VARIABLES,
    prompt: `You are an SEO Content Strategist creating blog post titles for a specific business and category.

{{businessContext}}

**CATEGORY**
Name: {{categoryName}}
{{categoryDescription}}

{{keywordContext}}
{{existingTitlesContext}}

---

**TASK:** Generate {{requestedCount}} unique, SEO-optimized blog post titles for the "{{categoryName}}" category.

**TITLE RULES - MUST FOLLOW:**
1. DO NOT use colons with catchy prefixes (BAD: "Power Up: Best Keto Meals", "Fuel Right: Carb Loading Tips")
2. DO NOT use generic clickbait patterns (BAD: "X Ways to...", "The Ultimate Guide to...")
3. DO include target keywords naturally - especially high-volume keywords from research above
4. Titles should be 50-60 characters for optimal SERP display
5. Make titles specific and actionable - what will the reader learn?
6. Match search intent - what would someone actually type into Google?

**GOOD TITLE EXAMPLES:**
- "Best Carbohydrate Sources for Endurance Cycling"
- "How to Calculate Protein Needs for Cyclists"
- "Pre-Race Breakfast Ideas That Won't Cause GI Issues"
- "Hydration Strategies for Long Distance Rides"

**BAD TITLE EXAMPLES:**
- "Fuel Your Ride: The Complete Guide to Cycling Nutrition" (colon pattern)
- "10 Amazing Tips for Better Performance" (generic clickbait)
- "Everything You Need to Know About Eating" (too vague)

For each title, provide:
1. title: An SEO-optimized title following the rules above
2. teaser: 1-2 sentences describing the article angle and value to reader
3. keywords: 3-5 target keywords this article would rank for
4. searchIntent: "informational", "transactional", or "comparison"

Return as JSON array.`
  },
  articleGeneration: {
    name: 'Article Generation',
    description: 'Used by processGenerateContent() in Cloud Functions when generating full article content.',
    location: 'functions/src/index.ts (lines ~1322-1374)',
    variables: ARTICLE_GENERATION_VARIABLES,
    prompt: `You are an expert content writer creating SEO-optimized content for a specific business.

{{businessContext}}

**CATEGORY**
Name: {{categoryName}}
{{categoryDesc}}

**ARTICLE TO WRITE**
Title: {{title}}
{{teaser}}
{{tags}}
Search Intent: {{searchIntent}}

{{keywordContext}}

---

**CONTENT REQUIREMENTS:**

1. **Format:** {{contentType}}
2. **Tone:** {{tone}}
3. **Length:** 1000-1500 words (comprehensive but focused)

**STRUCTURE:**
- DO NOT include the title - it will be added separately
- Start with an engaging introduction (2-3 sentences) that hooks the reader
- Use H2 (##) for main sections, H3 (###) for subsections
- Include 4-6 main sections with clear, descriptive headings
- End with a practical conclusion or call-to-action

**SEO BEST PRACTICES:**
- Include primary keywords in the first 100 words
- Use keywords naturally throughout - don't force them
- Write for humans first, search engines second
- Address the search intent directly
- Answer questions the target audience would have

**QUALITY STANDARDS:**
- Be specific and actionable - no fluff or filler
- Use concrete examples relevant to the industry
- Include practical tips the reader can apply
- Avoid generic advice that could apply to any topic
- Stay focused on the title topic - don't go off on tangents

**DO NOT:**
- Start with "Here is..." or "Sure..." or any preamble
- Use excessive exclamation points or hype language
- Include placeholder text like [insert X here]
- Write generic content that ignores the business context
- Use colon-style subheadings like "Tip 1: Do This"

Write the article now in clean Markdown format.`
  },
  categorySuggestions: {
    name: 'Category Suggestions (Client-side)',
    description: 'Used by suggestCategories() in geminiService.ts. This one DOES use Admin Prompts if configured.',
    location: 'services/geminiService.ts (lines ~1177-1244)',
    variables: CATEGORY_SUGGESTION_VARIABLES,
    prompt: `You are an expert Content Strategist specializing in AI-optimized content for search and AI assistants.

{{fullContext}}
{{existingCategoriesContext}}

---

**TASK:** Suggest 6 distinct, high-value content categories for this business.
{{query}}

CRITICAL REQUIREMENTS:
1. Categories MUST be directly relevant to the business's industry, products, or services
2. Categories should target specific problems/questions the target audience has
3. Focus on topics that people actively search for or ask AI assistants about
4. Categories should be specific enough to generate focused, actionable articles
5. DO NOT suggest generic categories like "Industry News" or "Tips & Tricks" - be specific!

DESCRIPTION REQUIREMENTS - Each description MUST explain:
- WHAT content belongs in this category (specific topics)
- WHO it helps (the target customer/reader)
- WHY it matters to them (the benefit/problem solved)

Example good description: "Guides for first-time road bike buyers on frame materials, sizing, and component choices. Helps new cyclists make confident purchasing decisions and avoid common expensive mistakes."

Example bad description: "Information about buying bikes." (too vague, no customer benefit)

IMPORTANT: Return a JSON array of objects. Each object MUST have:
- "name": The category name (2-4 words, specific to the business)
- "description": A customer-benefit-focused description (2-3 sentences as described above)
- "reason": Why this category will attract and help the target audience`
  }
};

type PromptKey = keyof typeof CLOUD_FUNCTION_PROMPTS;

export const AdminPromptsReference: React.FC = () => {
  const navigate = useNavigate();
  const [expandedPrompts, setExpandedPrompts] = useState<Set<PromptKey>>(new Set(['titleGeneration']));
  const [copiedPrompt, setCopiedPrompt] = useState<PromptKey | null>(null);

  const togglePrompt = (key: PromptKey) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedPrompts(newExpanded);
  };

  const copyPrompt = async (key: PromptKey) => {
    await navigator.clipboard.writeText(CLOUD_FUNCTION_PROMPTS[key].prompt);
    setCopiedPrompt(key);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  return (
    <div className="h-screen bg-[#0f172a] text-slate-200 font-sans overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto p-8 pb-16">
        <button
          onClick={() => navigate('/admin/prompts')}
          className="flex items-center text-slate-500 hover:text-cyan-400 mb-8 transition-colors text-sm uppercase tracking-wider font-medium"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Admin Prompts
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center">
            <Code size={24} className="mr-3 text-cyan-500" />
            Active Cloud Function Prompts
          </h1>
          <p className="text-slate-400 text-sm">
            These are the actual prompts hardcoded in the Cloud Functions. To modify them, edit the source code in <code className="text-cyan-400 bg-slate-800 px-2 py-0.5">functions/src/index.ts</code> and redeploy.
          </p>
        </div>

        {/* Info Box */}
        <div className="mb-8 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <h3 className="text-cyan-400 font-bold text-sm mb-2">Context Variables Injected at Runtime</h3>
          <p className="text-cyan-300/80 text-xs mb-3">
            The Cloud Functions inject the following context into prompts:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><code className="text-cyan-400">businessContext</code> - Project name, business profile, industry, target audience</div>
            <div><code className="text-cyan-400">keywordContext</code> - Keyword research data (if available)</div>
            <div><code className="text-cyan-400">categoryName/Desc</code> - Category details</div>
            <div><code className="text-cyan-400">existingTitlesContext</code> - Existing posts for deduplication</div>
          </div>
        </div>

        {/* Prompts List */}
        <div className="space-y-4">
          {(Object.keys(CLOUD_FUNCTION_PROMPTS) as PromptKey[]).map((key) => {
            const prompt = CLOUD_FUNCTION_PROMPTS[key];
            const isExpanded = expandedPrompts.has(key);
            const isCopied = copiedPrompt === key;

            return (
              <div key={key} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => togglePrompt(key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {key === 'titleGeneration' && <Lightbulb size={20} className="text-amber-400" />}
                    {key === 'articleGeneration' && <FileText size={20} className="text-emerald-400" />}
                    {key === 'categorySuggestions' && <Code size={20} className="text-purple-400" />}
                    <div className="text-left">
                      <h3 className="text-white font-bold text-sm">{prompt.name}</h3>
                      <p className="text-slate-500 text-xs">{prompt.location}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={20} className="text-slate-400" />
                  )}
                </button>

                {/* Content */}
                {isExpanded && (
                  <div className="border-t border-slate-800">
                    <div className="p-4 bg-slate-950/50">
                      <p className="text-slate-400 text-sm mb-4">{prompt.description}</p>

                      {/* Variables Documentation */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Database size={16} className="text-purple-400" />
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Context Variables</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 rounded overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-800/50 border-b border-slate-700">
                                <th className="text-left p-2 text-slate-400 font-bold">Variable</th>
                                <th className="text-left p-2 text-slate-400 font-bold">Source</th>
                                <th className="text-center p-2 text-slate-400 font-bold w-16">View</th>
                                <th className="text-center p-2 text-slate-400 font-bold w-16">Edit</th>
                                <th className="text-left p-2 text-slate-400 font-bold">How to Access</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prompt.variables.map((variable, idx) => (
                                <tr key={variable.name} className={idx % 2 === 0 ? 'bg-slate-950/30' : ''}>
                                  <td className="p-2">
                                    <code className="text-cyan-400 bg-slate-800 px-1 py-0.5 rounded text-[11px]">
                                      {variable.name}
                                    </code>
                                  </td>
                                  <td className="p-2 text-slate-300">{variable.source}</td>
                                  <td className="p-2 text-center">
                                    {variable.viewable ? (
                                      <Eye size={14} className="text-emerald-400 inline" />
                                    ) : (
                                      <span className="text-slate-600">-</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    {variable.editable ? (
                                      <Edit3 size={14} className="text-amber-400 inline" />
                                    ) : (
                                      <RefreshCw size={14} className="text-slate-500 inline" />
                                    )}
                                  </td>
                                  <td className="p-2 text-slate-400 text-[11px]">
                                    {variable.howToView || variable.howToEdit}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><Eye size={10} className="text-emerald-400" /> Viewable in UI</span>
                          <span className="flex items-center gap-1"><Edit3 size={10} className="text-amber-400" /> Editable</span>
                          <span className="flex items-center gap-1"><RefreshCw size={10} className="text-slate-500" /> Regenerate only</span>
                        </div>
                      </div>

                      {/* Prompt Template */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Prompt Template</span>
                        <button
                          onClick={() => copyPrompt(key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors rounded"
                        >
                          {isCopied ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              Copy
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="bg-slate-950 border border-slate-800 p-4 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar">
                        {prompt.prompt}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <h4 className="text-white font-bold text-sm mb-2">How to Modify These Prompts</h4>
          <ol className="text-slate-400 text-sm space-y-2 list-decimal list-inside">
            <li>Edit <code className="text-cyan-400 bg-slate-900 px-1">functions/src/index.ts</code></li>
            <li>Find the <code className="text-cyan-400 bg-slate-900 px-1">processGenerateTitles</code> or <code className="text-cyan-400 bg-slate-900 px-1">processGenerateContent</code> function</li>
            <li>Modify the prompt template string</li>
            <li>Build: <code className="text-cyan-400 bg-slate-900 px-1">cd functions && npm run build</code></li>
            <li>Deploy: <code className="text-cyan-400 bg-slate-900 px-1">firebase deploy --only functions:processGenerationQueue</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
};
