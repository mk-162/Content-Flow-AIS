import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Terminal, Cpu, AlertTriangle, FileText, Share2, Mail, BookOpen, Lightbulb, FolderTree, Globe, HelpCircle, X, ExternalLink, Code, RotateCcw } from 'lucide-react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AdminConfig, ContentType, PromptType, ContentFormat } from '../types';
import { clearCaches } from '../services/geminiService';

// DEFAULT PROMPTS - Content Generation
const DEFAULT_CONTENT_PROMPTS: Record<ContentType, string> = {
    [ContentType.ARTICLE]: `You are an expert content writer and SEO specialist creating a comprehensive, search-optimized blog post designed to rank in position 1-3 for target keywords.

**ARTICLE BRIEF**
Topic: "{{topic}}"
Category: {{category}}
Content Format: {{contentFormat}}
Target Audience: {{targetAudience}}
Tone: {{tone}}

{{#if researchData}}
**SEO REQUIREMENTS**
Primary Keyword: {{primaryKeyword}} (use in first 100 words, H1, at least one H2, and conclusion)
Secondary Keywords: {{secondaryKeywords}} (incorporate naturally throughout)
Target Word Count: {{targetWordCount}} words
Questions to Address: {{questionsToAnswer}}
{{/if}}

{{#if competitorAnalysis}}
**COMPETITIVE DIFFERENTIATION**
Competitor average word count: {{avgCompetitorWordCount}} words
Topics competitors miss: {{missingTopics}}
Your goal: Be MORE comprehensive, address missing topics, and provide unique insights
{{/if}}

**BRAND VOICE & E-E-A-T SIGNALS**
Brand Message: {{brandMessage}}
Compliance Guidelines: {{brandCompliance}}
Target Keywords: {{keywords}}
Trust Signals: Include real examples, specific data/statistics, actionable advice, and nuanced insights

{{#if teaser}}
**Specific Focus/Angle:** {{teaser}}
{{/if}}

**ARTICLE STRUCTURE**

1. **FEATURED SNIPPET TARGET** (40-60 words)
   - Open with a direct, concise answer to the primary query
   - Format for answer box eligibility: definition, process, or list
   - Include primary keyword in this section
   - Use clear, scannable formatting

2. **Hook & Introduction** (100-150 words)
   - Start with primary keyword in first sentence
   - Present a compelling problem, statistic, or question
   - Promise what the reader will learn
   - Establish credibility briefly

3. **Main Content** ({{targetWordCount}} words across 4-6 H2 sections)

   **H2 Structure Guidelines:**
   - Each H2 should include primary or secondary keywords naturally
   - Use question-based H2s where relevant (matches voice search)
   - Follow logical progression: What → Why → How → When/Where
   - Include 2-4 H3 subsections under each H2 for depth

   **Content Requirements:**
   - Open each section with topic sentence containing keyword variant
   - Include specific examples, data points, or case studies (E-E-A-T)
   - Use short paragraphs (2-4 sentences max) for readability
   {{#if questionsToAnswer}}- Address these questions: {{questionsToAnswer}}{{/if}}
   - Add **[INTERNAL_LINK: relevant topic]** placeholders (3-5 total)

   **Content Enhancements:**
   - Use numbered lists for step-by-step processes
   - Use bullet points for features, benefits, or options
   - Include comparison tables where relevant (markdown format)
   - Bold key terms and important takeaways

4. **FAQ Section** (3-5 Q&A pairs targeting People Also Ask)
   - Format: **Q: [Question with long-tail keyword]**
   - Provide concise 2-3 sentence answers (50-75 words each)
   {{#if questionsToAnswer}}- Prioritize: {{questionsToAnswer}}{{/if}}

5. **Key Takeaways** (5-7 bullet points)
   - Summarize main insights in scannable format
   - Each bullet should be actionable or memorable
   - Incorporate keyword variations naturally

6. **Conclusion & Call to Action** (100-150 words)
   - Reinforce primary keyword and main value proposition
   - Clear, specific call to action
   - End with forward-looking statement or next step

7. **Meta Elements** (generate at end)
   - **Meta Title** (50-60 characters): Primary keyword + benefit/number
   - **Meta Description** (150-160 characters): Primary keyword, value prop, CTA

**SEO & READABILITY REQUIREMENTS**

**Keyword Optimization:**
- Primary keyword density: 1-2% (natural usage, never forced)
- Use primary keyword in: first 100 words, at least 2 H2s, conclusion, meta description
- Distribute secondary keywords across H2/H3 headings
- Use keyword variations and synonyms to avoid repetition

**E-E-A-T Signals (Expertise, Experience, Authoritativeness, Trust):**
- Include first-hand experience or real examples
- Reference specific data, statistics, or timeframes
- Use authoritative language while maintaining {{tone}} tone
- Add specific, actionable advice showing expert knowledge

**Readability:**
- Target reading level: 8th-9th grade
- Average sentence length: 15-20 words
- Paragraph length: 2-4 sentences maximum
- Use transition words for flow
- Use active voice for 80%+ of sentences

**Formatting Standards:**
- Use markdown formatting (H2, H3, bullets, bold, tables)
- Start directly with featured snippet (no preambles)
- {{#if targetWordCount}}Target {{targetWordCount}} words{{/if}}
- Never use "Here is..." or similar AI preambles`,

    [ContentType.SOCIAL_MEDIA]: `Create a compelling social media post for: "{{topic}}"

Platform: LinkedIn/Twitter
Tone: {{tone}}
Brand Message: {{brandMessage}}
Target Keywords: {{keywords}}

Structure:
- **Hook** (First line grabs attention)
- **Value Proposition** (Why should they care?)
- **Call to Action** (What should they do next?)
- **Hashtags** (3-5 relevant hashtags)

Requirements:
- Keep it concise (280 characters for Twitter, 1300 for LinkedIn)
- Use {{tone}} tone
- Include emojis where appropriate
- Make it shareable`,

    [ContentType.EMAIL]: `Write a persuasive email newsletter about: "{{topic}}"

Tone: {{tone}}
Brand Message: {{brandMessage}}
Target Audience: {{targetAudience}}

Structure:
- **Subject Line** (High open rate, 40-50 characters)
- **Preview Text** (Complements subject line)
- **Personal Greeting**
- **Body** (Value-driven, scannable)
- **Clear CTA** (Single, prominent call to action)

Requirements:
- Use {{tone}} tone
- Align with brand: {{brandMessage}}
- Focus on reader benefits
- Use markdown formatting`,

    [ContentType.CASE_STUDY]: `Draft a case study outline for: "{{topic}}"

Tone: {{tone}}
Brand Message: {{brandMessage}}

Structure:
1. **Executive Summary** (2-3 sentences)
2. **The Challenge** (What problem was faced?)
3. **The Solution** (How was it solved?)
4. **Implementation** (Step-by-step process)
5. **Results** (Quantifiable outcomes)
6. **Key Takeaways** (Lessons learned)

Requirements:
- Use {{tone}} tone
- Include specific metrics where possible
- Tell a compelling story
- Use markdown formatting`,

    [ContentType.CATEGORY_PAGE]: `Write a compelling category page introduction for: "{{topic}}"

**REQUIREMENTS:**
- 150-300 words
- Start with a hook that connects to the reader's needs
- Explain what this content category covers
- Highlight the value readers will get
- End with a subtle call-to-action to explore articles
- Use {{tone}} tone
- Professional but approachable

Return clean Markdown content only.`
};

// DEFAULT PROMPTS - System Prompts
const DEFAULT_SYSTEM_PROMPTS: Record<PromptType, string> = {
    [PromptType.TITLE_GENERATION]: `You are an expert SEO Content Strategist specializing in high-CTR titles and SERP optimization.

{{#if projectContext}}
{{projectContext}}
{{/if}}
{{#if businessContext}}
{{businessContext}}
{{/if}}

Generate {{count}} high-quality, SEO-optimized blog post ideas for the category: "{{categoryName}}"

Category Description: {{categoryDescription}}

{{#if researchData}}
**KEYWORD RESEARCH DATA**
Target Keywords: {{primaryKeywords}}
Related Keywords: {{relatedKeywords}}
Questions to Address: {{questionsToAnswer}}
Content Gaps & Opportunities: {{contentGaps}}
{{/if}}

{{#if existingTitles}}
**AVOID DUPLICATES - These titles already exist:**
{{existingTitles}}

Topics already covered: {{coveredTopics}}
Generate DIFFERENT angles and perspectives.
{{/if}}

{{#if suggestedFormats}}
**CONTENT DIVERSITY - Prioritize these formats:**
{{suggestedFormats}}
{{/if}}

**SEO & CTR OPTIMIZATION FRAMEWORK**

1. **Title Structure Guidelines:**
   - Length: 50-60 characters (optimal for SERPs)
   - Place primary keyword within first 5 words when natural
   - Use numbers, years, or specific data (e.g., "7 Ways...", "2026 Guide...")
   - Include power words: proven, essential, ultimate, complete, definitive, unexpected, overlooked, hidden
   - Format: "[Number] [Power Word] [Keyword] [Benefit/Promise]"

2. **SERP Feature Targeting:**
   - "how-to" formats: Use "How to [Result]" (targets featured snippets)
   - listicles: Lead with numbers (targets list snippets)
   - questions: Mirror "People Also Ask" phrasing
   - comparisons: Use "vs" format (targets comparison tables)
   - guides: Include year + "Guide" or "Complete"

3. **Topical Authority Signals:**
   - Classify each title as:
     * **Pillar** (comprehensive, broad topic, 2000+ words)
     * **Cluster** (specific subtopic supporting a pillar, 1000-1500 words)
   - Pillar titles: "Complete Guide", "Everything You Need to Know"
   - Cluster titles: Target long-tail keywords and specific questions

4. **CTR Psychology:**
   - Use curiosity gaps moderately ("Why [Common Belief] is Wrong")
   - Include tangible benefits ("That Actually Works", "Without [Pain Point]")
   - Add time elements when relevant ("in 2026", "in 10 Minutes")

5. **Keyword Placement:**
   - Primary keyword: Position 1-5 for informational intent
   - Primary keyword: Position 3-7 for commercial intent
   - Use modifiers: "best", "top", "free", "vs", "how to", "guide"

**CRITICAL REQUIREMENTS:**
1. All ideas MUST be directly relevant to the project and business context
2. {{#if researchData}}Each title should target a specific keyword from the research{{/if}}
3. {{#if existingTitles}}Generate completely NEW angles - avoid similar topics{{/if}}
4. Balance optimization with authenticity - avoid clickbait
5. Ensure titles deliver on their promise

**OUTPUT FORMAT:**
For each idea, provide:

1. **title**: SEO-optimized title (50-60 characters, includes keyword + power word/number)
2. **teaser**: 1-2 sentence description (mention 2-3 specific subtopics)
3. **keywords**: Array of 3-5 SEO keywords (first = primary target)
4. **searchIntent**: "informational" | "commercial" | "transactional" | "navigational"
5. **contentFormat**: "how-to" | "listicle" | "comparison" | "guide" | "case-study" | "news" | "opinion" | "review"
6. **contentTier**: "pillar" | "cluster" (for topical authority strategy)
7. **serpFeature**: Primary SERP feature to target:
   - "featured-snippet" | "people-also-ask" | "list-snippet" | "table-snippet"

Return as JSON:
{
  "ideas": [{
    "title": "string",
    "teaser": "string",
    "keywords": ["primary", "secondary", "long-tail"],
    "searchIntent": "informational|commercial|transactional|navigational",
    "contentFormat": "how-to|listicle|comparison|guide|case-study|news|opinion|review",
    "contentTier": "pillar|cluster",
    "serpFeature": "featured-snippet|people-also-ask|list-snippet|table-snippet"
  }]
}`,

    [PromptType.CATEGORY_SUGGESTIONS]: `You are an Editorial Director creating compelling content categories.

Analyze the content category: "{{categoryName}}"

Task: Suggest 3 powerful ways to expand or refine this category into more specific, reader-captivating content territories.

For each suggestion, think editorially:
- What would make someone EXCITED to dive into this category?
- What specific stories, guides, or experiences could live here?
- What transformation will readers experience?

Return as JSON array of strings (each string is a specific category angle or sub-niche).`,

    [PromptType.CATEGORY_BREAKDOWN]: `You are an SEO-Driven Editorial Director creating content categories that build topical authority and organic search dominance.

{{#if parentCategory}}
**PARENT CATEGORY TO EXPAND**
└─ "{{parentCategory}}"

**TASK:** Create 6 distinct CLUSTER subcategories that expand "{{parentCategory}}" into a comprehensive topic cluster.
{{#if query}}Focus specifically on: "{{query}}"{{/if}}

**HIERARCHY CONTEXT:** You are creating CLUSTER CATEGORIES that support the parent pillar:
- Target more specific long-tail keywords than the parent
- Address specific search intents within the broader topic
- Create natural internal linking opportunities back to the parent
- Fill content gaps competitors have overlooked
{{else}}
**TASK:** Create 6 distinct, high-value PILLAR CATEGORIES related to: "{{query}}"

**HIERARCHY CONTEXT:** You are creating TOP-LEVEL PILLAR CATEGORIES:
- Target broad, high-volume search terms with strategic importance
- Serve as comprehensive hubs that can be expanded into subcategories
- Establish topical authority in distinct subject areas
- Support a scalable content architecture
{{/if}}

**CATEGORY REQUIREMENTS:**
1. Each category should feel like a gateway to exploration - not just a filing system
2. Categories must be specific - no generic "Tips & Tricks" or "Industry Basics"
3. Think editorially: what would make someone EXCITED to dive into this category?
4. Mix practical utility with storytelling potential
5. **SEO-FIRST:** Category names MUST include searchable terms people actually use

**SEO ARCHITECTURE REQUIREMENTS:**

**1. KEYWORD STRATEGY**
- Category name should contain a primary target keyword (high volume or strategic)
- Description should naturally incorporate 2-3 related semantic keywords
- Balance search volume with ranking difficulty
{{#if parentCategory}}
- Target long-tail variations of the parent topic
{{else}}
- Focus on broad head terms with subcategory expansion potential
{{/if}}

**2. SEARCH INTENT MAPPING**
Each category must serve a dominant search intent:
- **Informational:** Learning, guides, how-to content
- **Commercial:** Comparison, reviews, best-of lists
- **Navigational:** Brand/product specific
- **Transactional:** High purchase intent

Mix intents across the 6 categories to capture the full customer journey.

**3. TOPICAL AUTHORITY SIGNALS**
- Each category should cover a distinct semantic cluster
- Avoid keyword cannibalization (categories shouldn't compete for same keywords)
- Create logical progression (awareness → consideration → decision)

**4. CONTENT GAP TARGETING**
Identify opportunities competitors are missing:
- Underserved audience segments
- Emerging trends or new technologies
- Geographic or demographic niches
- Question-based content

**DESCRIPTION REQUIREMENTS - THIS IS CRITICAL:**
Each description must be a compelling EDITORIAL BRIEF (4-5 sentences) that:
- Paints a vivid picture of what content belongs here
- Uses evocative, magazine-quality language that SELLS the category
- Includes specific content angles, themes, and story hooks
- Describes the reader transformation - what they'll discover or experience
- **Naturally incorporates 2-3 semantic keywords for topical relevance**
- Makes someone WANT to explore this category

**EXAMPLE GOOD DESCRIPTION:**
"Master sophisticated email sequences that convert subscribers into customers. From welcome series and abandoned cart recovery to behavior-triggered campaigns—each guide breaks down automation workflows. Features platform comparisons, A/B testing strategies, deliverability optimization, and ROI tracking. Transform your email list into a revenue engine."

**EXAMPLE BAD DESCRIPTION:**
"Content about email marketing." (too generic, no editorial vision, missing keywords)

Return as JSON array of objects with:
- "name": Category name (2-5 words, SEO-friendly with target keyword)
- "description": Rich editorial brief (4-5 sentences, keyword-rich and compelling)
- "reason": Why this category will captivate the audience AND build topical authority
- "searchIntent": "informational" | "commercial" | "navigational" | "transactional"
- "keywordCluster": Array of 3-5 related keywords this category should target
- "contentGapOpportunity": One specific underserved angle this category addresses
{{#if parentCategory}}
- "pillarConnection": How this cluster supports the parent's topical authority
{{else}}
- "subcategoryPotential": Array of 2-3 potential subcategory expansion ideas
{{/if}}`,

    [PromptType.BRAND_RESEARCH]: `You are a Brand Analyst specializing in digital marketing.

Website URL: {{websiteUrl}}

Task: Analyze this website and extract the following brand information:

1. **Brand Voice**: Describe the tone (e.g., Professional, Casual, Witty, Authoritative)
2. **Key Marketing Message**: What is their core value proposition? (2-3 sentences)
3. **Target Audience**: Who are they speaking to?
4. **Brand Colors**: Primary and secondary colors (hex codes if visible)
5. **Compliance/Legal Notes**: Any disclaimers, legal language, or compliance requirements
6. **Content Themes**: Top 3-5 topics they focus on

Return as JSON object with these fields.

Note: If you cannot access the website directly, provide guidance on what to look for when manually reviewing the site.`
};

const DEFAULT_SUMMARY_PROMPT = `Summarize the following content in 2-3 sentences, capturing the main value proposition and key takeaways.
Content: {{content}}`;

// DEFAULT PROMPTS - Image Generation
const DEFAULT_IMAGE_GENERATION_PROMPT = `Create a professional, high-quality image for a blog post.

{{#if brandStyle}}
Brand Style: {{brandStyle}}
{{/if}}

Scene: {{prompt}}

Requirements:
- Clean, modern aesthetic
- Professional lighting
- High resolution quality
- Suitable for web/blog use
- No text overlays unless specifically requested
- Photorealistic or appropriate style as indicated`;

type TabType = 'content' | 'system' | 'image';

export const AdminPrompts: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [config, setConfig] = useState<AdminConfig | null>(null);
    const [activeMainTab, setActiveMainTab] = useState<TabType>('content');
    const [activeContentTab, setActiveContentTab] = useState<ContentType>(ContentType.ARTICLE);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [activeSystemTab, setActiveSystemTab] = useState<PromptType>(PromptType.TITLE_GENERATION);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                console.log('Fetching admin config...');
                console.log('Current User:', auth.currentUser?.uid);

                const docRef = doc(db, 'adminConfig', 'prompts');
                console.log('Doc Ref:', docRef.path);

                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as AdminConfig;

                    // Ensure all content types have defaults
                    Object.values(ContentType).forEach(type => {
                        if (!data.prompts[type]) {
                            data.prompts[type] = DEFAULT_CONTENT_PROMPTS[type];
                        }
                    });

                    // Ensure all system prompts have defaults
                    Object.values(PromptType).forEach(type => {
                        if (!data.prompts[type]) {
                            data.prompts[type] = DEFAULT_SYSTEM_PROMPTS[type];
                        }
                    });

                    if (!data.prompts.summaryPrompt) data.prompts.summaryPrompt = DEFAULT_SUMMARY_PROMPT;
                    if (!data.prompts.imageGenerationPrompt) data.prompts.imageGenerationPrompt = DEFAULT_IMAGE_GENERATION_PROMPT;
                    setConfig(data);
                } else {
                    // Initialize with defaults if not exists
                    const defaultConfig: AdminConfig = {
                        prompts: {
                            ...DEFAULT_CONTENT_PROMPTS,
                            ...DEFAULT_SYSTEM_PROMPTS,
                            summaryPrompt: DEFAULT_SUMMARY_PROMPT,
                            imageGenerationPrompt: DEFAULT_IMAGE_GENERATION_PROMPT
                        },
                        modelVersion: 'gemini-2.0-flash',
                        updatedAt: Timestamp.now()
                    };
                    setConfig(defaultConfig);

                    // Auto-save defaults
                    await setDoc(docRef, defaultConfig);
                    console.log('Created default admin config');
                }
            } catch (error) {
                console.error('Error fetching admin config:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const handlePromptChange = (key: string, value: string) => {
        if (!config) return;
        setConfig({
            ...config,
            prompts: {
                ...config.prompts,
                [key]: value
            }
        });
    };

    // Reset a single prompt to its default value
    const handleResetToDefault = (key: string) => {
        if (!config) return;
        const defaultValue =
            DEFAULT_CONTENT_PROMPTS[key as ContentType] ||
            DEFAULT_SYSTEM_PROMPTS[key as PromptType] ||
            (key === 'summaryPrompt' ? DEFAULT_SUMMARY_PROMPT : '') ||
            (key === 'imageGenerationPrompt' ? DEFAULT_IMAGE_GENERATION_PROMPT : '');

        if (defaultValue) {
            setConfig({
                ...config,
                prompts: {
                    ...config.prompts,
                    [key]: defaultValue
                }
            });
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        setSuccessMsg('');

        try {
            const docRef = doc(db, 'adminConfig', 'prompts');
            await setDoc(docRef, {
                ...config,
                updatedAt: Timestamp.now()
            });

            // Clear caches so new prompts take effect immediately
            clearCaches();
            console.log('[AdminPrompts] Caches cleared after save');

            setSuccessMsg('Prompts saved successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error('Error saving prompts:', error);
            alert('Failed to save prompts');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-slate-400">Loading admin config...</div>;

    const getContentIcon = (type: ContentType) => {
        switch (type) {
            case ContentType.ARTICLE: return <FileText size={18} />;
            case ContentType.SOCIAL_MEDIA: return <Share2 size={18} />;
            case ContentType.EMAIL: return <Mail size={18} />;
            case ContentType.CASE_STUDY: return <BookOpen size={18} />;
        }
    };

    const getSystemIcon = (type: PromptType) => {
        switch (type) {
            case PromptType.TITLE_GENERATION: return <Lightbulb size={18} />;
            case PromptType.CATEGORY_SUGGESTIONS: return <FolderTree size={18} />;
            case PromptType.CATEGORY_BREAKDOWN: return <FolderTree size={18} />;
            case PromptType.BRAND_RESEARCH: return <Globe size={18} />;
        }
    };

    return (
        <div className="h-screen bg-[#0f172a] text-slate-200 font-sans overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto p-8 pb-16">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-slate-500 hover:text-cyan-400 mb-8 transition-colors text-sm uppercase tracking-wider font-medium"
                >
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Dashboard
                </button>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1 flex items-center">
                            <Terminal size={24} className="mr-3 text-purple-500" />
                            Admin Prompt Management
                        </h1>
                        <p className="text-slate-500 text-sm">Configure all AI prompts used throughout the system.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                        <Save size={16} className="mr-2" />
                        {saving ? 'Saving...' : 'Save All Prompts'}
                    </button>
                </div>

                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-400 text-sm">
                        {successMsg}
                    </div>
                )}

                {/* Warning Banner - Prompts Not Active */}
                <div className="mb-6 p-5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-orange-400 font-bold text-sm mb-2">These Prompts Are Not Currently Active</h3>
                            <p className="text-orange-300/80 text-sm mb-3">
                                Title generation and article generation are handled by Cloud Functions with hardcoded prompts.
                                Editing prompts here will <strong>not</strong> affect those generations until we connect them.
                            </p>
                            <p className="text-orange-300/80 text-sm mb-4">
                                Currently, only <strong>Category Suggestions</strong> and <strong>Category Breakdown</strong> use these admin prompts.
                            </p>
                            <Link
                                to="/admin/prompts-reference"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-bold uppercase tracking-wider transition-colors"
                            >
                                <Code size={14} />
                                View Active Cloud Function Prompts
                                <ExternalLink size={12} />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* Model Info */}
                    <section className="bg-slate-900 p-6 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center">
                            <Cpu size={20} className="mr-3 text-cyan-400" />
                            <div>
                                <h3 className="text-sm font-bold text-white">Active AI Model</h3>
                                <p className="text-slate-500 text-xs">The model currently used for generation tasks.</p>
                            </div>
                        </div>
                        <select
                            value={config?.modelVersion}
                            onChange={(e) => setConfig({ ...config!, modelVersion: e.target.value })}
                            className="px-4 py-2.5 bg-slate-950 border border-slate-700 font-mono text-sm text-cyan-400 cursor-pointer hover:border-cyan-500 focus:border-cyan-500 outline-none"
                        >
                            <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended)</option>
                            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                            <option value="gemini-2.0-flash">gemini-2.0-flash (Legacy)</option>
                        </select>
                    </section>

                    {/* Prompts */}
                    <section className="bg-slate-900 p-6 border border-slate-800">
                        <div className="flex items-center mb-6 p-3 bg-amber-500/5 border-l-4 border-amber-500">
                            <AlertTriangle size={16} className="mr-2 text-amber-400 shrink-0" />
                            <p className="text-amber-400 text-xs">
                                Warning: Changing these prompts will affect all future AI generation.
                                Ensure you keep the placeholder variables (e.g. {'{{topic}}'}) intact.
                            </p>
                        </div>

                        {/* Main Tabs: Content vs System */}
                        <div className="flex space-x-1 mb-6 border-b border-slate-700">
                            <button
                                onClick={() => setActiveMainTab('content')}
                                className={`px-5 py-2.5 font-bold uppercase text-xs tracking-wider transition-colors ${activeMainTab === 'content'
                                    ? 'text-cyan-400 border-b-2 border-cyan-400 -mb-px bg-slate-800/50'
                                    : 'text-slate-500 hover:text-white'
                                    }`}
                            >
                                Content Generation
                            </button>
                            <button
                                onClick={() => setActiveMainTab('system')}
                                className={`px-5 py-2.5 font-bold uppercase text-xs tracking-wider transition-colors ${activeMainTab === 'system'
                                    ? 'text-purple-400 border-b-2 border-purple-400 -mb-px bg-slate-800/50'
                                    : 'text-slate-500 hover:text-white'
                                    }`}
                            >
                                System Prompts
                            </button>
                            <button
                                onClick={() => setActiveMainTab('image')}
                                className={`px-5 py-2.5 font-bold uppercase text-xs tracking-wider transition-colors ${activeMainTab === 'image'
                                    ? 'text-emerald-400 border-b-2 border-emerald-400 -mb-px bg-slate-800/50'
                                    : 'text-slate-500 hover:text-white'
                                    }`}
                            >
                                Image Generation
                            </button>
                        </div>

                        {/* Content Generation Prompts */}
                        {activeMainTab === 'content' && (
                            <>
                                <div className="flex space-x-1 mb-6 border-b border-slate-800">
                                    {Object.values(ContentType).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setActiveContentTab(type)}
                                            className={`flex items-center px-4 py-2 transition-colors text-xs font-bold uppercase tracking-wider ${activeContentTab === type
                                                ? 'bg-slate-800 text-cyan-400 border-t border-x border-slate-700'
                                                : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                                                }`}
                                        >
                                            <span className="mr-2">{getContentIcon(type)}</span>
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-white mb-1">
                                            {activeContentTab} Generation Prompt
                                        </label>
                                        <p className="text-slate-500 text-xs mb-3">
                                            Used when generating {activeContentTab.toLowerCase()} content.
                                        </p>
                                        <textarea
                                            value={config?.prompts[activeContentTab] || ''}
                                            onChange={(e) => handlePromptChange(activeContentTab, e.target.value)}
                                            rows={20}
                                            className="w-full bg-slate-950 border border-slate-700 p-4 text-slate-300 font-mono text-sm focus:outline-none focus:border-cyan-500 leading-relaxed"
                                        />
                                        <button
                                            onClick={() => handleResetToDefault(activeContentTab)}
                                            className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 transition-colors"
                                        >
                                            <RotateCcw size={12} />
                                            Reset to Default
                                        </button>

                                        {/* Variable Documentation */}
                                        <div className="mt-4 p-4 bg-slate-950 border border-slate-700">
                                            <div className="flex items-center mb-2">
                                                <HelpCircle size={16} className="mr-2 text-cyan-400" />
                                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Available Variables</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div><code className="text-cyan-400">{'{{topic}}'}</code> - Post title</div>
                                                <div><code className="text-cyan-400">{'{{category}}'}</code> - Category name</div>
                                                <div><code className="text-cyan-400">{'{{contentFormat}}'}</code> - Content format type</div>
                                                <div><code className="text-cyan-400">{'{{targetAudience}}'}</code> - Target audience</div>
                                                <div><code className="text-cyan-400">{'{{tone}}'}</code> - Content tone</div>
                                                <div><code className="text-cyan-400">{'{{brandMessage}}'}</code> - Brand message</div>
                                                <div><code className="text-cyan-400">{'{{brandCompliance}}'}</code> - Compliance guidelines</div>
                                                <div><code className="text-cyan-400">{'{{keywords}}'}</code> - Target keywords</div>
                                                <div><code className="text-cyan-400">{'{{teaser}}'}</code> - Post teaser/focus</div>
                                                <div><code className="text-cyan-400">{'{{researchData}}'}</code> - Has research (for #if)</div>
                                                <div><code className="text-cyan-400">{'{{primaryKeyword}}'}</code> - Primary SEO keyword</div>
                                                <div><code className="text-cyan-400">{'{{secondaryKeywords}}'}</code> - Secondary keywords</div>
                                                <div><code className="text-cyan-400">{'{{targetWordCount}}'}</code> - Target word count</div>
                                                <div><code className="text-cyan-400">{'{{questionsToAnswer}}'}</code> - FAQs to address</div>
                                                <div><code className="text-cyan-400">{'{{competitorAnalysis}}'}</code> - Has competitor data</div>
                                                <div><code className="text-cyan-400">{'{{avgCompetitorWordCount}}'}</code> - Avg competitor length</div>
                                                <div><code className="text-cyan-400">{'{{missingTopics}}'}</code> - Topics competitors miss</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* System Prompts */}
                        {activeMainTab === 'system' && (
                            <>
                                <div className="flex space-x-1 mb-6 border-b border-slate-800">
                                    {Object.values(PromptType).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setActiveSystemTab(type)}
                                            className={`flex items-center px-4 py-2 transition-colors text-xs font-bold uppercase tracking-wider ${activeSystemTab === type
                                                ? 'bg-slate-800 text-purple-400 border-t border-x border-slate-700'
                                                : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                                                }`}
                                        >
                                            <span className="mr-2">{getSystemIcon(type)}</span>
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-white mb-1">
                                            {activeSystemTab} Prompt
                                        </label>
                                        <p className="text-slate-500 text-xs mb-3">
                                            {activeSystemTab === PromptType.TITLE_GENERATION && 'Used when generating blog post titles and ideas.'}
                                            {activeSystemTab === PromptType.CATEGORY_SUGGESTIONS && 'Used to suggest improvements for existing categories.'}
                                            {activeSystemTab === PromptType.CATEGORY_BREAKDOWN && 'Used to suggest subcategories or new categories.'}
                                            {activeSystemTab === PromptType.BRAND_RESEARCH && 'Used to analyze a website and extract brand information.'}
                                        </p>
                                        <textarea
                                            value={config?.prompts[activeSystemTab] || ''}
                                            onChange={(e) => handlePromptChange(activeSystemTab, e.target.value)}
                                            rows={20}
                                            className="w-full bg-slate-950 border border-slate-700 p-4 text-slate-300 font-mono text-sm focus:outline-none focus:border-purple-500 leading-relaxed"
                                        />
                                        <button
                                            onClick={() => handleResetToDefault(activeSystemTab)}
                                            className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 transition-colors"
                                        >
                                            <RotateCcw size={12} />
                                            Reset to Default
                                        </button>

                                        {/* Variable Documentation for System Prompts */}
                                        <div className="mt-4 p-4 bg-slate-950 border border-slate-700">
                                            <div className="flex items-center mb-2">
                                                <HelpCircle size={16} className="mr-2 text-purple-400" />
                                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Available Variables</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {activeSystemTab === PromptType.TITLE_GENERATION && (
                                                    <>
                                                        <div><code className="text-purple-400">{'{{count}}'}</code> - Number of titles to generate</div>
                                                        <div><code className="text-purple-400">{'{{categoryName}}'}</code> - Category name</div>
                                                        <div><code className="text-purple-400">{'{{categoryDescription}}'}</code> - Category description</div>
                                                        <div><code className="text-purple-400">{'{{researchData}}'}</code> - Has research (for #if)</div>
                                                        <div><code className="text-purple-400">{'{{primaryKeywords}}'}</code> - Target keywords</div>
                                                        <div><code className="text-purple-400">{'{{relatedKeywords}}'}</code> - Related keywords</div>
                                                        <div><code className="text-purple-400">{'{{questionsToAnswer}}'}</code> - FAQs to address</div>
                                                        <div><code className="text-purple-400">{'{{contentGaps}}'}</code> - Content opportunities</div>
                                                        <div><code className="text-purple-400">{'{{existingTitles}}'}</code> - Existing post titles</div>
                                                        <div><code className="text-purple-400">{'{{coveredTopics}}'}</code> - Topics already covered</div>
                                                        <div><code className="text-purple-400">{'{{suggestedFormats}}'}</code> - Recommended formats</div>
                                                    </>
                                                )}
                                                {activeSystemTab === PromptType.CATEGORY_SUGGESTIONS && (
                                                    <>
                                                        <div><code className="text-purple-400">{'{{categoryName}}'}</code> - Category name</div>
                                                    </>
                                                )}
                                                {activeSystemTab === PromptType.CATEGORY_BREAKDOWN && (
                                                    <>
                                                        <div><code className="text-purple-400">{'{{parentCategory}}'}</code> - Parent category (if any)</div>
                                                        <div><code className="text-purple-400">{'{{query}}'}</code> - Search query or focus</div>
                                                    </>
                                                )}
                                                {activeSystemTab === PromptType.BRAND_RESEARCH && (
                                                    <>
                                                        <div><code className="text-purple-400">{'{{websiteUrl}}'}</code> - Website URL to analyze</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-800 pt-6">
                                        <label className="block text-sm font-bold text-white mb-1">Summary Generation Prompt</label>
                                        <p className="text-slate-500 text-xs mb-3">Used for generating teasers and summaries.</p>
                                        <textarea
                                            value={config?.prompts.summaryPrompt || ''}
                                            onChange={(e) => handlePromptChange('summaryPrompt', e.target.value)}
                                            rows={6}
                                            className="w-full bg-slate-950 border border-slate-700 p-4 text-slate-300 font-mono text-sm focus:outline-none focus:border-purple-500 leading-relaxed"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Image Generation Prompt */}
                        {activeMainTab === 'image' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-white mb-1">
                                        Image Generation System Prompt
                                    </label>
                                    <p className="text-slate-500 text-xs mb-3">
                                        Used when generating images for blog posts. This prompt wraps around user-provided scene descriptions.
                                    </p>
                                    <textarea
                                        value={config?.prompts.imageGenerationPrompt || ''}
                                        onChange={(e) => handlePromptChange('imageGenerationPrompt', e.target.value)}
                                        rows={15}
                                        className="w-full bg-slate-950 border border-slate-700 p-4 text-slate-300 font-mono text-sm focus:outline-none focus:border-emerald-500 leading-relaxed"
                                    />

                                    {/* Variable Documentation */}
                                    <div className="mt-4 p-4 bg-slate-950 border border-slate-700">
                                        <div className="flex items-center mb-2">
                                            <HelpCircle size={16} className="mr-2 text-emerald-400" />
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Available Variables</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><code className="text-emerald-400">{'{{prompt}}'}</code> - User's scene description</div>
                                            <div><code className="text-emerald-400">{'{{brandStyle}}'}</code> - Organization brand style</div>
                                            <div><code className="text-emerald-400">{'{{#if brandStyle}}...{{/if}}'}</code> - Conditional block</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Hierarchy Override</h4>
                                    <p className="text-slate-500 text-xs">
                                        This is the <span className="text-cyan-400">Admin Default</span> prompt. Organizations and Projects can override this in their settings.
                                        Priority: <span className="text-emerald-400">Project</span> → <span className="text-purple-400">Organization</span> → <span className="text-cyan-400">Admin</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};
