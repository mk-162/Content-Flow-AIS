# Onboarding Redesign: Channel-First Approach

## Overview

The onboarding flow needs a fundamental shift from "categories first" to "channels first". The core product being sold is **channels** - distinct content destinations on a customer's website, each serving a specific purpose.

---

## Enhanced Analysis Output

The website analysis must produce a **much more detailed report** including:

### Required Analysis Sections

1. **Brand Analysis** (1-2 paragraphs)
   - Brand identity and values
   - Unique selling propositions
   - Brand voice and tone characteristics

2. **Industry Analysis** (1-2 paragraphs)
   - Industry vertical identification
   - Market positioning
   - Competitive landscape overview

3. **Positioning Statement**
   - Clear, concise positioning statement
   - How the brand differentiates itself

4. **Target Market & Content Needs** (1-2 paragraphs)
   - Primary audience segments
   - Content consumption preferences
   - Information gaps and pain points
   - Questions the audience is asking

---

## Channel Types

The system supports multiple channel types, each serving different content purposes:

| Channel Type | Purpose | Example Use Cases |
|-------------|---------|-------------------|
| **Blog** | Editorial content, thought leadership, industry news | Company blog, news section |
| **Knowledge Base** | Self-service support, product documentation | Help center, FAQ section |
| **Guides** | Educational content, tutorials, how-tos | Resource library, learning center |
| **Industry Vertical** | Niche expertise content for specific markets | Vertical-specific microsites |
| **Archive** | Organized historical/reference content | Industry archives, research library |

---

## New Onboarding Flow

### Current Flow (TO BE REPLACED)
```
URL Input → Analysis → Profile Review → Categories → Subcategories → Account
```

### New Flow
```
URL Input → Enhanced Analysis → Profile Review → CHANNEL RECOMMENDATIONS → Select One Channel → Categories for that Channel → Account
```

---

## Channel Recommendation Step (NEW)

After analysis completes, the CTA should be: **"Recommend Channels"**

### Channel Cards Grid

Display a grid of recommended channel cards. Each card must include:

1. **Channel Type Badge**
   - Visual tag: Blog, Knowledge Base, Guides, Archive, etc.
   - Color-coded by type

2. **Project Title**
   - Compelling, actionable title for the channel
   - Example: "Product Support Knowledge Base" or "Industry Insights Blog"

3. **Value Description**
   - 2-3 sentences explaining WHY this channel will help the customer
   - Focus on business outcomes and customer benefits
   - Not features, but results

4. **Categories Preview**
   - Brief list of 3-5 main categories the channel would include
   - Shows the content structure at a glance

5. **Keyword Targeting**
   - Key search terms this channel will target
   - **Must include demand data** (monthly searches)
   - Show top 3-5 keywords with volume

### Example Channel Card

```
┌─────────────────────────────────────────────────────────┐
│  [KNOWLEDGE BASE]                              ○ Select │
│                                                         │
│  Product Support Hub                                    │
│                                                         │
│  Help your customers find answers instantly without     │
│  contacting support. Reduce ticket volume by 40% and    │
│  improve customer satisfaction with 24/7 self-service.  │
│                                                         │
│  Categories:                                            │
│  • Getting Started  • Troubleshooting  • Integrations   │
│  • Account Settings  • Billing & Plans                  │
│                                                         │
│  Target Keywords:                                       │
│  "how to setup [product]" .............. 2,400/mo      │
│  "[product] integration guide" ......... 1,800/mo      │
│  "[product] troubleshooting" ........... 890/mo        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Data Persistence

### Save All Recommendations

Even though the user selects only ONE channel during onboarding, **all recommended channels must be saved** to the user's account:

```typescript
interface ChannelRecommendation {
  id: string;
  channelType: 'blog' | 'knowledge_base' | 'guides' | 'archive' | 'industry_vertical';
  title: string;
  description: string;
  valueProposition: string;
  suggestedCategories: CategorySuggestion[];
  targetKeywords: {
    keyword: string;
    searchVolume: number;
    difficulty?: number;
  }[];
  selected: boolean;  // true for the one they chose
  savedAt: Timestamp;
}

// Store in user/org document
channelRecommendations: ChannelRecommendation[];
```

### Future Access

Users should be able to:
- View all saved channel recommendations in their dashboard
- Create new projects from saved recommendations later
- See which recommendations they haven't acted on yet

---

## Selection Requirement

**Critical UX Requirement:** During onboarding, users MUST select exactly ONE channel.

- Radio button selection (not checkbox)
- "Continue" button disabled until one is selected
- Clear messaging: "Select one channel to get started. You can create additional channels later."

---

## Selling the Channel Concept

### Key Messaging Points

1. **Each channel is a distinct destination** on their website
2. **Channels serve different purposes** - support, education, thought leadership
3. **Channels have their own content strategy** - different categories, keywords, tone
4. **Start with one, grow to many** - focus on doing one well first

### Why This Matters

The user isn't just "creating content" - they're building a strategic content channel that will:
- Drive targeted organic traffic
- Serve specific customer needs
- Position them as experts in their space
- Generate measurable business results

---

## Implementation Tasks

### Phase 1: Enhanced Analysis
- [ ] Update Gemini prompts to generate detailed brand/industry/positioning analysis
- [ ] Add new fields to BusinessProfile type for expanded analysis
- [ ] Update ProfileReviewStep to display new analysis sections

### Phase 2: Channel Recommendation System
- [ ] Create ChannelRecommendation type
- [ ] Build channel recommendation generation logic
- [ ] Create ChannelRecommendationStep component
- [ ] Design channel card component with all required fields

### Phase 3: Flow Updates
- [ ] Update OnboardingContext with channel state
- [ ] Modify step progression to include channel selection
- [ ] Update category generation to work within selected channel context
- [ ] Save all recommendations to Firestore

### Phase 4: Dashboard Integration
- [ ] Add "Saved Channels" section to project dashboard
- [ ] Allow creating new projects from saved recommendations
- [ ] Track which recommendations have been acted upon

---

## Questions to Resolve

1. Should channel recommendations be regenerated if the user edits their profile?
2. How many channels should we recommend? (3-5 seems reasonable)
3. Should we show a "recommended" badge on the best-fit channel?
4. How do we handle users who want multiple channels immediately?

---

## Notes

- This is a significant UX shift - the "channel" concept must be clearly explained
- Marketing/copy should emphasize channels as "content destinations" not just "projects"
- Consider adding a brief explainer or video about what channels are before showing recommendations
