# ContentFlow AI - Onboarding Workflow Plan

## Executive Summary

This document outlines a world-class onboarding experience designed to deliver **instant value** while capturing users into a subscription funnel. The core philosophy: **show don't tell** — let users experience AI-powered content intelligence within 60 seconds of landing.

---

## The Value Proposition (For Context)

> "The basic principle of optimising content is to have a landing page for every possible question a customer may ask an AI language model."

This is the core insight we're selling. As AI assistants become the primary way people search for information, businesses need content that directly answers the questions AI models surface. ContentFlow AI identifies these opportunities and generates optimized content at scale.

---

## Onboarding Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ONBOARDING JOURNEY                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────┐  │
│  │  1. URL  │───▶│ 2. Analysis  │───▶│ 3. Profile  │───▶│ 4. Create │  │
│  │  Input   │    │   Loading    │    │   Review    │    │  Account  │  │
│  └──────────┘    └──────────────┘    └─────────────┘    └───────────┘  │
│                                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────┐  │
│  │ 5. Pick  │───▶│ 6. Category  │───▶│ 7. Subcat   │───▶│ 8. Main   │  │
│  │ Project  │    │  Generation  │    │ Generation  │    │ Workspace │  │
│  └──────────┘    └──────────────┘    └─────────────┘    └───────────┘  │
│                                                                         │
│                              ▼                                          │
│                     ┌───────────────┐                                   │
│                     │  FREE LIMIT   │──────▶ Subscription Paywall       │
│                     │  (5 articles) │                                   │
│                     └───────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: URL Input (Landing Page Hero)

### Purpose
Create an **irresistible first interaction** that delivers instant gratification. No forms, no friction — just paste a URL and watch the magic happen.

### Design Specifications

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│            ✨ Discover Your Content Opportunity Score ✨                │
│                                                                        │
│   AI assistants are answering your customers' questions.               │
│   Let's find out how many answers you're missing.                      │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 🔗  Enter your website URL...                    [ Analyze → ] │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│            No signup required. Results in 60 seconds.                  │
│                                                                        │
│   Trusted by: [Logo] [Logo] [Logo] [Logo] [Logo]                       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### UI Elements

| Element | Specification |
|---------|---------------|
| **Input Field** | Large, prominent with URL validation |
| **CTA Button** | Primary cyan gradient, pulses subtly |
| **Placeholder** | "https://your-website.com" |
| **Validation** | Real-time URL format checking |
| **Submit Trigger** | Enter key OR button click |

### Micro-copy Variations (A/B Test)
- "Analyze" / "Discover" / "Show Me" / "Find Opportunities"
- "Results in 60 seconds" / "Instant AI analysis" / "See your score"

### Technical Implementation

```typescript
interface URLAnalysisRequest {
  url: string;
  sessionId: string;  // Anonymous tracking before auth
  referrer?: string;
  utmParams?: Record<string, string>;
}
```

### Edge Cases
- **Invalid URL**: Shake animation + "Please enter a valid website URL"
- **Unreachable site**: "We couldn't reach this website. Please check the URL and try again."
- **Already analyzed**: Skip to results with "Welcome back!" message

---

## Step 2: Intelligent Analysis Loading

### Purpose
Transform waiting time into **engagement and education**. This is prime real estate for selling the value proposition.

### Design Concept: "The AI Brain"

A multi-stage loading animation that shows users exactly what's happening behind the scenes.

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                    🧠 Analyzing your-website.com                       │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                                                                │   │
│   │                    [NEURAL NETWORK ANIMATION]                  │   │
│   │                                                                │   │
│   │         ○───○───○                                              │   │
│   │        /│\ /│\ /│\     ← Data nodes lighting up               │   │
│   │       ○─○─○─○─○─○─○       as analysis progresses               │   │
│   │        \│/ \│/ \│/                                             │   │
│   │         ○───○───○                                              │   │
│   │                                                                │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ✓ Scanning page structure                           [████████░░] 80% │
│   ○ Analyzing content patterns                        [░░░░░░░░░░]     │
│   ○ Identifying target audience                       [░░░░░░░░░░]     │
│   ○ Detecting brand voice                             [░░░░░░░░░░]     │
│   ○ Mapping product categories                        [░░░░░░░░░░]     │
│   ○ Calculating opportunity score                     [░░░░░░░░░░]     │
│                                                                        │
│   ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│   💡 Did you know?                                                     │
│   "67% of B2B buyers prefer getting information from AI assistants     │
│    before talking to a salesperson."                                   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Animation Stages (Progressive Reveal)

| Stage | Duration | Visual | Status Text |
|-------|----------|--------|-------------|
| 1 | 0-3s | Nodes activate top-left | "Scanning page structure..." |
| 2 | 3-6s | Wave spreads center | "Analyzing content patterns..." |
| 3 | 6-9s | Audience icons appear | "Identifying target audience..." |
| 4 | 9-12s | Voice waveform | "Detecting brand voice..." |
| 5 | 12-18s | Category tree grows | "Mapping product categories..." |
| 6 | 18-25s | Score counter | "Calculating opportunity score..." |

### Educational Carousel (Below Progress)
Rotate through compelling statistics and insights:

```typescript
const educationalFacts = [
  {
    stat: "67%",
    text: "of B2B buyers prefer getting information from AI assistants before talking to a salesperson.",
    source: "Gartner 2024"
  },
  {
    stat: "3.2x",
    text: "more likely to convert when content directly answers their specific question.",
    source: "ContentFlow Research"
  },
  {
    stat: "85%",
    text: "of product searches will happen through AI assistants by 2026.",
    source: "McKinsey Digital"
  },
  {
    stat: "12 mins",
    text: "Average time saved per content piece with AI-assisted generation.",
    source: "Customer Data"
  }
];
```

### Technical Backend Process

While the animation runs, the backend executes:

```typescript
interface WebsiteAnalysis {
  // Page scanning
  crawlHomepage(): Promise<PageContent>;
  extractMetadata(): Promise<Metadata>;

  // Content analysis
  analyzeWritingStyle(): Promise<WritingStyle>;
  detectContentTypes(): Promise<ContentType[]>;
  identifyProducts(): Promise<Product[]>;

  // Audience profiling
  inferTargetAudience(): Promise<AudienceProfile>;
  detectIndustry(): Promise<Industry>;

  // Opportunity scoring
  calculateContentGaps(): Promise<ContentGap[]>;
  scoreOpportunity(): Promise<OpportunityScore>;
}
```

---

## Step 3: Profile Review & Approval

### Purpose
Build trust by showing users we **understand their business**. Give them control to correct any misinterpretations.

### Design Specification

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ← Back                              ContentFlow AI                    │
│                                                                        │
│  ══════════════════════════════════════════════════════════════════   │
│                                                                        │
│         🎯 We've analyzed your-website.com                             │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  OPPORTUNITY SCORE                                              │  │
│   │                                                                 │  │
│   │          ████████████████████░░░░░░  78/100                    │  │
│   │                                                                 │  │
│   │  You're missing approximately 156 content opportunities        │  │
│   │  that could be driving traffic from AI assistants.             │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ══════════════════════════════════════════════════════════════════   │
│                                                                        │
│   📊 BUSINESS PROFILE                                    [Edit All ✏️] │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                                                                 │  │
│   │  INDUSTRY                                              [Edit]   │  │
│   │  E-commerce / Sporting Goods / Cycling Equipment                │  │
│   │                                                                 │  │
│   │  ─────────────────────────────────────────────────────────────  │  │
│   │                                                                 │  │
│   │  TARGET AUDIENCE                                       [Edit]   │  │
│   │  • Primary: Cycling enthusiasts aged 25-45                      │  │
│   │  • Secondary: Competitive amateur cyclists                      │  │
│   │  • Geographic: UK & Europe focused                              │  │
│   │  • Income: Middle to high disposable income                     │  │
│   │                                                                 │  │
│   │  ─────────────────────────────────────────────────────────────  │  │
│   │                                                                 │  │
│   │  PRODUCTS/SERVICES DETECTED                            [Edit]   │  │
│   │  • Road bikes and frames                                        │  │
│   │  • Cycling apparel and accessories                              │  │
│   │  • Bike components and parts                                    │  │
│   │  • Nutrition and hydration products                             │  │
│   │                                                                 │  │
│   │  ─────────────────────────────────────────────────────────────  │  │
│   │                                                                 │  │
│   │  BRAND VOICE                                           [Edit]   │  │
│   │  Tone: Professional yet approachable                            │  │
│   │  Style: Technical expertise with enthusiasm                     │  │
│   │  Personality: Passionate, knowledgeable, community-focused      │  │
│   │                                                                 │  │
│   │  ─────────────────────────────────────────────────────────────  │  │
│   │                                                                 │  │
│   │  CONTENT STYLE                                         [Edit]   │  │
│   │  • Long-form educational articles                               │  │
│   │  • Product comparison guides                                    │  │
│   │  • How-to tutorials with technical detail                       │  │
│   │  • Community stories and testimonials                           │  │
│   │                                                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                                                                 │  │
│   │         [ Looks Good! Continue → ]                              │  │
│   │                                                                 │  │
│   │         or make edits above to refine your profile              │  │
│   │                                                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface BusinessProfile {
  id: string;
  websiteUrl: string;
  analyzedAt: Date;

  // Core identification
  industry: {
    primary: string;
    secondary: string;
    tertiary: string;
    confidence: number;  // 0-100
  };

  // Audience profiling
  targetAudience: {
    primary: AudienceSegment;
    secondary?: AudienceSegment;
    demographics: {
      ageRange: string;
      income: string;
      geographic: string[];
    };
  };

  // Product/Service catalog
  offerings: {
    type: 'products' | 'services' | 'both';
    categories: string[];
    items: ProductItem[];
  };

  // Brand voice analysis
  brandVoice: {
    tone: string[];           // ['professional', 'approachable']
    style: string;            // 'Technical expertise with enthusiasm'
    personality: string[];    // ['passionate', 'knowledgeable']
    vocabulary: string[];     // Industry-specific terms detected
  };

  // Content analysis
  contentStyle: {
    types: ContentType[];
    averageLength: 'short' | 'medium' | 'long';
    technicalLevel: 'beginner' | 'intermediate' | 'advanced';
    mediaUsage: string[];     // ['images', 'video', 'infographics']
  };

  // Opportunity scoring
  opportunityScore: {
    overall: number;          // 0-100
    contentGaps: number;      // Estimated missing pages
    potentialTraffic: string; // "5,000-10,000 monthly visits"
    competitorComparison: string;
  };

  // Edit tracking
  userEdits: {
    field: string;
    originalValue: any;
    editedValue: any;
    editedAt: Date;
  }[];
}

interface AudienceSegment {
  name: string;
  description: string;
  painPoints: string[];
  goals: string[];
  searchBehavior: string[];
}
```

### Edit Modal Design

When user clicks [Edit]:

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Edit Target Audience                                         [×]     │
│                                                                        │
│  ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│  PRIMARY AUDIENCE                                                      │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Cycling enthusiasts aged 25-45                                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  SECONDARY AUDIENCE                                                    │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Competitive amateur cyclists                                   │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  GEOGRAPHIC FOCUS                                                      │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ UK & Europe                                                    │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  💡 Tip: Be specific! "Professional women in tech aged 30-40"          │
│     works better than "Business professionals"                         │
│                                                                        │
│                               [Cancel]  [Save Changes]                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Improvements to Consider

1. **Confidence Indicators**: Show AI confidence level for each section
   - High confidence (90%+): Green checkmark
   - Medium (70-90%): Yellow info icon
   - Low (<70%): Orange warning "Please verify"

2. **Comparison View**: "How does this compare to your competitors?"

3. **Quick Fixes**: AI-suggested improvements for each section

4. **Voice Preview**: "Here's how your brand voice would sound in content:"
   - Show a sample paragraph written in detected voice

---

## Step 4: Account Creation

### Purpose
Convert anonymous users to registered accounts at the **moment of maximum engagement** — right after they've seen the value.

### Timing Rationale
Account creation comes AFTER profile review because:
1. User has invested time and seen personalized results
2. Sunk cost psychology — they don't want to lose their analysis
3. Value has been demonstrated, not just promised

### Design Specification

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ← Back                              ContentFlow AI                    │
│                                                                        │
│  ══════════════════════════════════════════════════════════════════   │
│                                                                        │
│         🎉 Great! Let's save your profile                              │
│                                                                        │
│         Create a free account to:                                      │
│         ✓ Save your business profile                                   │
│         ✓ Generate 5 AI-powered articles free                          │
│         ✓ Access your content opportunity roadmap                      │
│         ✓ Export and publish content                                   │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│   │                                                                 │  │
│   │  ┌─────────────────────────────────────────────────────────┐   │  │
│   │  │  📧  Work email                                         │   │  │
│   │  └─────────────────────────────────────────────────────────┘   │  │
│   │                                                                 │  │
│   │  ┌─────────────────────────────────────────────────────────┐   │  │
│   │  │  🔒  Password                                           │   │  │
│   │  └─────────────────────────────────────────────────────────┘   │  │
│   │       Password strength: ████░░░░░░ Moderate                   │  │
│   │                                                                 │  │
│   │  ┌─────────────────────────────────────────────────────────┐   │  │
│   │  │  🔒  Confirm password                                   │   │  │
│   │  └─────────────────────────────────────────────────────────┘   │  │
│   │                                                                 │  │
│   │              [Create Free Account]                              │  │
│   │                                                                 │  │
│   │  ─────────────────── or ───────────────────                    │  │
│   │                                                                 │  │
│   │         [🔵 Continue with Google]                               │  │
│   │         [⬛ Continue with GitHub]                               │  │
│   │                                                                 │  │
│   │  ───────────────────────────────────────────────────────────   │  │
│   │                                                                 │  │
│   │  Already have an account? [Log in]                              │  │
│   │                                                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│   By creating an account, you agree to our Terms of Service            │
│   and Privacy Policy.                                                  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Technical Considerations

```typescript
interface OnboardingSession {
  sessionId: string;
  businessProfile: BusinessProfile;
  createdAt: Date;
  expiresAt: Date;  // 24 hours from creation
}

// On account creation:
async function convertAnonymousToUser(
  session: OnboardingSession,
  credentials: AuthCredentials
): Promise<User> {
  // 1. Create Firebase Auth user
  const authUser = await createUser(credentials);

  // 2. Create organization from business profile
  const org = await createOrganization({
    name: extractCompanyName(session.businessProfile),
    websiteUrl: session.businessProfile.websiteUrl,
    branding: {
      brandVoice: session.businessProfile.brandVoice
    }
  });

  // 3. Link profile to organization
  await saveBusinessProfile(org.id, session.businessProfile);

  // 4. Set free tier limits
  await setSubscriptionTier(org.id, 'FREE', {
    articleLimit: 5,
    projectLimit: 1
  });

  return user;
}
```

---

## Step 5: Project Selection/Creation

### The Project Concept

This is the strategic decision point. Projects represent distinct content verticals within a business.

**Example (Cycling Company):**
- **Project 1**: Nutrition & Performance
- **Project 2**: Bike Maintenance & Care
- **Project 3**: Training & Fitness

### Pricing Model Impact

| Tier | Projects | Price Point |
|------|----------|-------------|
| FREE | 1 project | £0 |
| STARTER | 3 projects | £49/month |
| PROFESSIONAL | 10 projects | £149/month |
| ENTERPRISE | Unlimited | Custom |

### Design Approach: Guided vs. Open

**Option A: Single Project Start (Recommended)**

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│         🚀 Let's create your first project                             │
│                                                                        │
│   Based on your profile, we've identified 3 main content areas:        │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                                                                 │  │
│   │  ○  🚴 Cycling Equipment & Reviews                              │  │
│   │      Coverage: Road bikes, components, accessories              │  │
│   │      Est. opportunities: 340 content pieces                     │  │
│   │                                                                 │  │
│   │  ─────────────────────────────────────────────────────────────  │  │
│   │                                                                 │  │
│   │  ●  🍎 Nutrition & Performance           ← SELECTED             │  │
│   │      Coverage: Sports nutrition, hydration, recovery            │  │
│   │      Est. opportunities: 156 content pieces                     │  │
│   │                                                                 │  │
│   │  ─────────────────────────────────────────────────────────────  │  │
│   │                                                                 │  │
│   │  ○  🏋️ Training & Fitness                                       │  │
│   │      Coverage: Workout plans, techniques, gear guides           │  │
│   │      Est. opportunities: 210 content pieces                     │  │
│   │                                                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│   💡 Start with one project. You can add more projects later           │
│      (Starter plan and above).                                         │
│                                                                        │
│            [Continue with selected project →]                          │
│                                                                        │
│   ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│   Or create a custom project:                                          │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  Project name...                                               │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### UX Strategy for Projects

**Goal**: Simple onboarding while planting seeds for upgrades

1. **Show all detected projects** but only allow selecting ONE for free tier
2. **Visual breadcrumbs** show other projects as "locked" with upgrade path
3. **Post-onboarding nudge**: "Unlock all 3 projects for £49/month"

---

## Step 6: Category Generation

### Value Proposition Explainer

This is our **key sales moment**. Before showing categories, educate users.

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ← Back                    Nutrition & Performance                     │
│                                                                        │
│  ══════════════════════════════════════════════════════════════════   │
│                                                                        │
│   💡 THE CONTENT INTELLIGENCE PRINCIPLE                                │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                                                                 │  │
│   │  "The goal is to have a landing page for every possible        │  │
│   │   question a customer might ask an AI assistant."              │  │
│   │                                                                 │  │
│   │  When someone asks ChatGPT, Claude, or Google Gemini:          │  │
│   │                                                                 │  │
│   │    "What's the best protein powder for cyclists?"              │  │
│   │                                                                 │  │
│   │  ...you want YOUR content to be the answer.                    │  │
│   │                                                                 │  │
│   │  We'll help you map out every question in your space           │  │
│   │  and generate content that AI assistants will reference.       │  │
│   │                                                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ══════════════════════════════════════════════════════════════════   │
│                                                                        │
│   📁 STEP 1: DEFINE YOUR CONTENT CATEGORIES                            │
│                                                                        │
│   Categories are the main topics your content will cover.              │
│   We'll generate subcategories and article ideas from these.           │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                                                                 │  │
│   │  Based on your profile, here are 5 recommended categories:     │  │
│   │                                                                 │  │
│   │  ─────────────────────────────────────────────────────────────  │  │
│   │                                                                 │  │
│   │  ✓  Pre-Workout Nutrition                              [×]     │  │
│   │     Est. demand: ████████░░ High                                │  │
│   │     Target match: 94%                                           │  │
│   │                                                                 │  │
│   │  ✓  Recovery & Post-Ride                               [×]     │  │
│   │     Est. demand: ███████░░░ Medium-High                         │  │
│   │     Target match: 91%                                           │  │
│   │                                                                 │  │
│   │  ✓  Hydration Strategies                               [×]     │  │
│   │     Est. demand: ███████░░░ Medium-High                         │  │
│   │     Target match: 88%                                           │  │
│   │                                                                 │  │
│   │  ✓  Supplements & Vitamins                             [×]     │  │
│   │     Est. demand: ██████░░░░ Medium                              │  │
│   │     Target match: 85%                                           │  │
│   │                                                                 │  │
│   │  ✓  Race Day Nutrition                                 [×]     │  │
│   │     Est. demand: █████░░░░░ Medium                              │  │
│   │     Target match: 82%                                           │  │
│   │                                                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  + Add custom category...                                      │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│         [Generate 5 More]          [Generate Subcategories →]          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Category Card Design

```typescript
interface CategorySuggestion {
  id: string;
  name: string;
  description: string;

  // Metrics that sell value
  demandScore: number;        // 0-100, visualized as bar
  demandLevel: 'Low' | 'Medium' | 'Medium-High' | 'High' | 'Very High';
  targetMatchScore: number;   // How well it matches their audience

  // AI reasoning (expandable)
  reasoning: string;          // Why this category was suggested

  // Potential
  estimatedArticles: number;  // How many articles could be generated
  searchVolume: string;       // "5,000-10,000 monthly searches"

  // State
  selected: boolean;
  isUserAdded: boolean;
}
```

### Interaction Patterns

| Action | Behavior |
|--------|----------|
| **Delete (×)** | Remove from list with undo toast |
| **Generate 5 More** | AI suggests 5 additional categories |
| **Add Custom** | Text input with AI-enhanced suggestions |
| **Expand Card** | Show full reasoning and metrics |

### "Add Custom" Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Add Custom Category                                          [×]     │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Category name...                                              │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  💡 AI Suggestions based on your input:                                │
│                                                                        │
│     [Weight Management]  [Endurance Fueling]  [Plant-Based Cycling]    │
│                                                                        │
│                                        [Cancel]  [Add Category]        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Step 7: Subcategory Generation

### Design: Progressive Tree Building

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ← Back                    Nutrition & Performance                     │
│                                                                        │
│  ══════════════════════════════════════════════════════════════════   │
│                                                                        │
│   📂 STEP 2: DEFINE SUBCATEGORIES                                      │
│                                                                        │
│   Each category expands into specific topics. These become your        │
│   content pillars — each subcategory can generate dozens of articles.  │
│                                                                        │
│  ══════════════════════════════════════════════════════════════════   │
│                                                                        │
│   ▼ Pre-Workout Nutrition                     [+ Add] [Generate 5]    │
│   │                                                                    │
│   ├── ✓ Carb Loading Strategies                               [×]     │
│   │      Est. 12 articles • High demand                                │
│   │                                                                    │
│   ├── ✓ Timing Your Pre-Ride Meals                            [×]     │
│   │      Est. 8 articles • Medium demand                               │
│   │                                                                    │
│   ├── ✓ Energy Gels and Chews                                 [×]     │
│   │      Est. 15 articles • High demand                                │
│   │                                                                    │
│   ├── ✓ Coffee and Caffeine for Cyclists                      [×]     │
│   │      Est. 10 articles • Very High demand                           │
│   │                                                                    │
│   └── ✓ Pre-Workout Supplements                               [×]     │
│          Est. 14 articles • Medium-High demand                         │
│                                                                        │
│   ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│   ▶ Recovery & Post-Ride (click to expand)    [+ Add] [Generate 5]    │
│                                                                        │
│   ▶ Hydration Strategies                      [+ Add] [Generate 5]    │
│                                                                        │
│   ▶ Supplements & Vitamins                    [+ Add] [Generate 5]    │
│                                                                        │
│   ▶ Race Day Nutrition                        [+ Add] [Generate 5]    │
│                                                                        │
│  ══════════════════════════════════════════════════════════════════   │
│                                                                        │
│   📊 CONTENT ROADMAP SUMMARY                                           │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  5 Categories • 25 Subcategories • ~285 potential articles     │  │
│   │                                                                 │  │
│   │  At your current settings, this represents approximately        │  │
│   │  6 months of content at 2 articles per day.                    │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│               [← Edit Categories]        [Finish Setup →]              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Tree Interaction Patterns

| Action | Behavior |
|--------|----------|
| **▶/▼** | Expand/collapse category |
| **Generate 5** | Generate 5 subcategories for that category |
| **+ Add** | Add custom subcategory |
| **× Delete** | Remove subcategory with undo |
| **Drag & Drop** | Reorder or move between categories |

### Visual Polish: Animated Tree Building

When "Generate 5" is clicked:
1. Loading shimmer on the category row
2. Subcategories animate in one by one (stagger: 150ms)
3. Running total updates in real-time
4. Subtle celebration animation when all categories have subcategories

---

## Step 8: Workspace Landing (With Tooltips)

### Purpose
Transition from onboarding to product usage with **guided discovery**.

### Tooltip Tour Sequence

```typescript
const tooltipTour = [
  {
    id: 'welcome',
    target: null,  // Modal overlay
    title: "🎉 Your content workspace is ready!",
    content: "You have 5 free articles to generate. Let's show you around.",
    action: "Start Tour"
  },
  {
    id: 'category-tree',
    target: '#category-sidebar',
    title: "Your Content Structure",
    content: "Here are your categories and subcategories. Click any subcategory to see its articles.",
    position: 'right'
  },
  {
    id: 'generate-button',
    target: '#generate-titles-btn',
    title: "Generate Article Ideas",
    content: "Click here to generate AI-powered article titles for any subcategory.",
    position: 'bottom'
  },
  {
    id: 'article-list',
    target: '#articles-panel',
    title: "Your Articles",
    content: "Generated articles appear here. Click any article to edit or generate full content.",
    position: 'left'
  },
  {
    id: 'free-limit',
    target: '#usage-indicator',
    title: "Free Articles Remaining",
    content: "You have 5 free articles. Upgrade anytime for unlimited generation.",
    position: 'bottom',
    action: "Got it!"
  }
];
```

### Welcome Modal

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                    🎉 Your content workspace is ready!                 │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                                                                 │  │
│   │   Nutrition & Performance                                       │  │
│   │                                                                 │  │
│   │   ├── Pre-Workout Nutrition (5 subcategories)                   │  │
│   │   ├── Recovery & Post-Ride (5 subcategories)                    │  │
│   │   ├── Hydration Strategies (5 subcategories)                    │  │
│   │   ├── Supplements & Vitamins (5 subcategories)                  │  │
│   │   └── Race Day Nutrition (5 subcategories)                      │  │
│   │                                                                 │  │
│   │   📊 285 potential articles mapped                              │  │
│   │                                                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│   You have 5 FREE articles to generate.                                │
│   Let's make them count!                                               │
│                                                                        │
│              [Take a Quick Tour]    [Start Creating →]                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Free Limit & Paywall Strategy

### Usage Indicator (Persistent)

Always visible in the header:

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]  Nutrition & Performance  ▼    ████░ 3/5 free articles  [⚙] │
└─────────────────────────────────────────────────────────────────────┘
```

### Limit Reached Modal

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                    ⭐ You've used all 5 free articles                  │
│                                                                        │
│   Great progress! You've generated content for:                        │
│                                                                        │
│   • "Best Pre-Workout Meals for Long Rides"                            │
│   • "How to Recover Faster After a Century Ride"                       │
│   • "Hydration Mistakes That Kill Your Performance"                    │
│   • "Do Cyclists Really Need Protein Powder?"                          │
│   • "Race Day Nutrition: The Complete Timeline"                        │
│                                                                        │
│   ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│   📊 You still have 280 content opportunities mapped.                  │
│                                                                        │
│   Upgrade to keep generating:                                          │
│                                                                        │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│   │    STARTER      │  │  PROFESSIONAL   │  │   ENTERPRISE    │       │
│   │   £49/month     │  │   £149/month    │  │   Custom        │       │
│   │                 │  │                 │  │                 │       │
│   │ • 50 articles   │  │ • Unlimited     │  │ • Unlimited     │       │
│   │ • 3 projects    │  │ • 10 projects   │  │ • Unlimited     │       │
│   │ • Email support │  │ • Priority      │  │ • Dedicated     │       │
│   │                 │  │                 │  │                 │       │
│   │  [Choose]       │  │  [Choose]       │  │  [Contact Us]   │       │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                        │
│            [Maybe Later - Continue Browsing]                           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Post-Paywall UX (If "Maybe Later")

- Read-only mode for generated content
- Can still edit/refine existing 5 articles
- Can still view category structure
- Generate buttons show lock icon
- Persistent upgrade banner (non-intrusive)

---

## Recommended Improvements

### 1. **Instant Value Acceleration**

| Current | Improvement |
|---------|-------------|
| URL → Loading → Profile | URL → Micro-preview (3s) → Full profile |

Show a "teaser" result within 3 seconds:
```
"We found 156 content opportunities for your-website.com"
```

### 2. **Social Proof Integration**

Add throughout onboarding:
- "12,453 businesses analyzed this month"
- "Join 2,340 content creators using ContentFlow"
- Industry-specific testimonials

### 3. **Progressive Commitment**

Instead of one account creation step:
1. **Email only** after URL analysis (lightest commitment)
2. **Password** after category generation
3. **Profile details** after first article generation

### 4. **Competitor Comparison**

On the profile page:
```
"Your competitors have 3x more content in the 'Recovery' category"
```

### 5. **Quick Win Generator**

Identify ONE high-impact article to generate immediately:
```
"🎯 Quick Win: Generate this article first
   'Best Recovery Drinks for Cyclists'
   - 2,400 monthly searches
   - Low competition
   - High relevance to your audience"
```

### 6. **Save & Resume**

For drop-offs mid-onboarding:
- Email capture early
- Magic link to resume exactly where they left off
- "Your analysis is waiting" email after 24 hours

### 7. **Team Invitation (Future)**

During account creation:
```
"Want to collaborate? Invite team members (you can do this later)"
```

### 8. **Content Calendar Preview**

After subcategories:
```
"At 2 articles/week, here's your 6-month content calendar..."
[Visual calendar with article dots]
```

---

## Technical Architecture

### New Components Required

```
/components/onboarding/
├── URLInput.tsx              # Hero URL input with validation
├── AnalysisLoading.tsx       # Multi-stage loading animation
├── BusinessProfileReview.tsx # Profile display with edit
├── ProfileEditModal.tsx      # Individual field editor
├── ProjectSelector.tsx       # Project selection/creation
├── CategoryGenerator.tsx     # Category suggestions UI
├── SubcategoryGenerator.tsx  # Subcategory tree builder
├── OnboardingTooltips.tsx    # Guided tour component
├── UsageIndicator.tsx        # Free limit display
└── PaywallModal.tsx          # Upgrade prompts
```

### New Services

```
/services/
├── websiteAnalyzer.ts        # URL crawling and analysis
├── profileGenerator.ts       # AI profile generation
├── opportunityScorer.ts      # Content gap analysis
└── onboardingTracker.ts      # Analytics and progress
```

### State Management

```typescript
interface OnboardingState {
  step: OnboardingStep;
  sessionId: string;

  // Step 1
  websiteUrl: string | null;

  // Step 2-3
  businessProfile: BusinessProfile | null;
  profileEdits: ProfileEdit[];

  // Step 4
  user: User | null;
  organization: Organization | null;

  // Step 5
  selectedProject: ProjectSuggestion | null;

  // Step 6-7
  categories: CategorySuggestion[];
  subcategories: Map<string, SubcategorySuggestion[]>;

  // Completion
  isComplete: boolean;
  completedAt: Date | null;
}

type OnboardingStep =
  | 'url_input'
  | 'analyzing'
  | 'profile_review'
  | 'account_creation'
  | 'project_selection'
  | 'category_generation'
  | 'subcategory_generation'
  | 'workspace_intro'
  | 'complete';
```

### Analytics Events

```typescript
const onboardingEvents = {
  'onboarding_started': { url: string },
  'url_submitted': { url: string, valid: boolean },
  'analysis_completed': { duration: number, score: number },
  'profile_reviewed': { editsCount: number },
  'profile_approved': { editsCount: number },
  'account_created': { method: 'email' | 'google' | 'github' },
  'project_selected': { projectName: string, isAISuggested: boolean },
  'categories_generated': { count: number },
  'category_added_manual': { name: string },
  'category_deleted': { name: string },
  'subcategories_generated': { categoryId: string, count: number },
  'onboarding_completed': { totalDuration: number, projectId: string },
  'onboarding_abandoned': { step: OnboardingStep, duration: number },
  'paywall_shown': { articlesUsed: number },
  'paywall_converted': { tier: string },
  'paywall_dismissed': {},
};
```

---

## Implementation Priority

### Phase 1: Core Flow (MVP)
1. URL input component
2. Basic loading animation
3. Profile generation (using Gemini)
4. Profile review page
5. Account creation flow
6. Basic category/subcategory generation

### Phase 2: Polish
1. Advanced loading animation
2. Profile edit modals
3. Project selector with AI suggestions
4. Enhanced category UI with metrics
5. Subcategory tree visualization

### Phase 3: Conversion Optimization
1. Tooltip tour system
2. Usage indicator
3. Paywall modal
4. Analytics integration
5. A/B testing framework

### Phase 4: Advanced Features
1. Competitor comparison
2. Content calendar preview
3. Team invitation flow
4. Magic link resume
5. Progressive commitment model

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| URL submission rate | >40% of landing visitors | Analytics |
| Analysis completion | >85% of submissions | Analytics |
| Account creation | >60% of profile reviewers | Analytics |
| Onboarding completion | >75% of account creators | Analytics |
| Time to first article | <5 minutes | Analytics |
| Free→Paid conversion | >8% | Stripe |
| Onboarding NPS | >50 | Survey |

---

## Open Questions

1. **Project Complexity**: Should we hide the project concept entirely for free tier and just auto-create "My First Project"?

2. **Category Limits**: Should free tier be limited in categories/subcategories, or just articles?

3. **URL Re-analysis**: Can users re-analyze their URL later? Should this cost an article?

4. **Profile Sharing**: Can users share their opportunity score/profile publicly (viral potential)?

5. **Bulk Operations**: Should we offer "generate all subcategories" as a premium feature?

---

*Document Version: 1.0*
*Last Updated: November 2024*
*Author: ContentFlow AI Team*
