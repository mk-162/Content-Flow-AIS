# Channel Type System

## Overview

The Channel Type system drives content generation across the platform. Each channel type has specific prompt styles optimized for that content format.

---

## Channel Types

```typescript
export type ChannelType =
  | 'blog'              // Editorial content, thought leadership
  | 'knowledge_base'    // Support docs, FAQs, troubleshooting
  | 'guides'            // Tutorials, how-tos, educational
  | 'industry_vertical' // Niche expertise, deep-dives
  | 'product_content'   // Features, benefits, comparisons
  | 'case_studies'      // Customer success stories
  | 'landing_pages'     // Conversion-focused copy
  | 'news'              // Industry news, updates, trends
  | 'comparison'        // X vs Y, alternatives, reviews
  | 'faq';              // Question-answer format
```

---

## Channel Configurations

### 1. BLOG
**Purpose:** Editorial content, thought leadership, storytelling

```typescript
{
  channelType: 'blog',

  titleStyle: {
    tone: 'editorial',
    formulas: [
      "Why [Common Belief] is Wrong (And What to Do Instead)",
      "[Number] [Adjective] [Things] That [Outcome]",
      "The [Adjective] Guide to [Topic]",
      "What [Experts/Industry] Won't Tell You About [Topic]",
      "How [We/Company] [Achieved Result] (And You Can Too)"
    ],
    avoid: ['How to', 'FAQ:', 'Step-by-step'],
    maxLength: 60
  },

  contentStyle: {
    structure: 'narrative',
    sections: ['hook', 'context', 'main_content', 'expert_insight', 'action_steps'],
    wordCount: { min: 1200, max: 1800 },
    tone: ['conversational', 'authoritative', 'engaging'],
    features: ['storytelling', 'opinions', 'examples', 'quotes']
  },

  categoryStyle: {
    promptTone: 'editorial_director',
    descriptionStyle: 'magazine_brief',
    emphasis: ['reader_transformation', 'storytelling_angles', 'exploration']
  }
}
```

**Example Category Description:**
> "Epic multi-day routes and weekend escapes across dramatic landscapes. From coastal cliff paths to moorland climbs—each route framed as an experience, not just a ride. Features terrain insights, elevation profiles, seasonal timing, and the 'type of rider' each adventure suits. Where exploration meets storytelling."

---

### 2. KNOWLEDGE_BASE
**Purpose:** Self-service support, documentation, troubleshooting

```typescript
{
  channelType: 'knowledge_base',

  titleStyle: {
    tone: 'practical',
    formulas: [
      "How to [Action] in [Product/Context]",
      "[Topic]: Getting Started Guide",
      "Troubleshooting [Problem]",
      "[Feature] Overview and Setup",
      "Understanding [Concept]"
    ],
    avoid: ['Ultimate', 'Amazing', 'You Won\'t Believe'],
    maxLength: 50
  },

  contentStyle: {
    structure: 'problem_solution',
    sections: ['problem_statement', 'solution_steps', 'troubleshooting', 'related_articles'],
    wordCount: { min: 400, max: 1000 },
    tone: ['clear', 'helpful', 'concise'],
    features: ['numbered_steps', 'screenshots', 'code_blocks', 'warnings']
  },

  categoryStyle: {
    promptTone: 'support_architect',
    descriptionStyle: 'practical_scope',
    emphasis: ['problems_solved', 'user_tasks', 'searchability']
  }
}
```

**Example Category Description:**
> "Step-by-step solutions for common account and billing issues. Covers password resets, subscription changes, payment failures, and invoice requests. Written for users who need quick answers without contacting support. Each article structured for scanning: problem, solution, related issues."

---

### 3. GUIDES
**Purpose:** Educational tutorials, how-tos, skill development

```typescript
{
  channelType: 'guides',

  titleStyle: {
    tone: 'educational',
    formulas: [
      "Complete Guide to [Topic] for [Audience]",
      "[Topic] Tutorial: From [Start] to [End]",
      "Learn [Skill] in [Timeframe]",
      "[Beginner/Advanced] Guide to [Topic]",
      "Mastering [Topic]: A Practical Guide"
    ],
    avoid: ['Quick tip', 'News:', 'Opinion:'],
    maxLength: 55
  },

  contentStyle: {
    structure: 'progressive_learning',
    sections: ['learning_objectives', 'prerequisites', 'step_by_step', 'practice_exercises', 'next_steps'],
    wordCount: { min: 1500, max: 3000 },
    tone: ['instructional', 'encouraging', 'patient'],
    features: ['learning_outcomes', 'examples', 'exercises', 'checkpoints']
  },

  categoryStyle: {
    promptTone: 'curriculum_designer',
    descriptionStyle: 'learning_journey',
    emphasis: ['skill_progression', 'practical_outcomes', 'audience_level']
  }
}
```

**Example Category Description:**
> "Foundational skills for riders new to multi-day adventures. Progresses from day-ride preparation to full bikepacking setup—covering route planning, gear selection, nutrition strategies, and campsite skills. Each guide builds on the last, taking beginners from curious to confident. Includes equipment checklists and practice ride suggestions."

---

### 4. INDUSTRY_VERTICAL
**Purpose:** Niche expertise, deep technical content, authority building

```typescript
{
  channelType: 'industry_vertical',

  titleStyle: {
    tone: 'expert',
    formulas: [
      "[Year] State of [Industry Topic]",
      "Deep Dive: [Technical Topic]",
      "[Industry] Trends: What's Changing in [Year]",
      "Expert Analysis: [Topic]",
      "The Science Behind [Topic]"
    ],
    avoid: ['Simple', 'Easy', 'Quick'],
    maxLength: 60
  },

  contentStyle: {
    structure: 'analytical',
    sections: ['executive_summary', 'background', 'analysis', 'data_insights', 'implications', 'methodology'],
    wordCount: { min: 2000, max: 4000 },
    tone: ['authoritative', 'data-driven', 'technical'],
    features: ['charts', 'data_tables', 'citations', 'expert_quotes']
  },

  categoryStyle: {
    promptTone: 'industry_analyst',
    descriptionStyle: 'authority_brief',
    emphasis: ['expertise_depth', 'unique_insights', 'industry_credibility']
  }
}
```

**Example Category Description:**
> "Technical deep-dives into frame geometry, material science, and component engineering. For the mechanically curious rider who wants to understand why bikes perform the way they do. Covers aerodynamics, metallurgy, suspension kinematics, and drivetrain efficiency—backed by data, testing, and expert interviews. Where engineering meets cycling passion."

---

### 5. PRODUCT_CONTENT
**Purpose:** Product features, benefits, specs, buying guides

```typescript
{
  channelType: 'product_content',

  titleStyle: {
    tone: 'benefit_focused',
    formulas: [
      "[Product] Review: [Key Benefit]",
      "Best [Product Category] for [Use Case] ([Year])",
      "[Product] vs [Product]: Which is Right for You?",
      "[Number] Reasons to Choose [Product]",
      "[Product]: Features, Specs, and Who It's For"
    ],
    avoid: ['Maybe', 'Might', 'Could'],
    maxLength: 55
  },

  contentStyle: {
    structure: 'feature_benefit',
    sections: ['overview', 'key_features', 'benefits', 'specs', 'ideal_user', 'verdict'],
    wordCount: { min: 800, max: 1500 },
    tone: ['informative', 'objective', 'helpful'],
    features: ['spec_tables', 'pros_cons', 'comparison_charts', 'ratings']
  },

  categoryStyle: {
    promptTone: 'product_strategist',
    descriptionStyle: 'buyer_journey',
    emphasis: ['purchase_decisions', 'use_cases', 'comparison_angles']
  }
}
```

**Example Category Description:**
> "In-depth gear reviews and buying guides for every riding style. Covers bikes, components, accessories, and apparel with real-world testing and clear verdicts. Each review answers the key question: who is this for? Features spec comparisons, durability notes, and value assessments. Helping riders spend smarter."

---

### 6. CASE_STUDIES
**Purpose:** Customer success stories, social proof, results

```typescript
{
  channelType: 'case_studies',

  titleStyle: {
    tone: 'results_focused',
    formulas: [
      "How [Customer] Achieved [Result] with [Product/Method]",
      "[Customer]: From [Before] to [After]",
      "[Result]: A [Customer Type] Success Story",
      "Case Study: [Customer] [Achievement]",
      "[Number]% [Improvement]: The [Customer] Story"
    ],
    avoid: ['Guide', 'How to', 'Tutorial'],
    maxLength: 60
  },

  contentStyle: {
    structure: 'story_arc',
    sections: ['customer_intro', 'challenge', 'solution', 'implementation', 'results', 'testimonial'],
    wordCount: { min: 1000, max: 2000 },
    tone: ['narrative', 'credible', 'inspiring'],
    features: ['quotes', 'metrics', 'before_after', 'timeline']
  },

  categoryStyle: {
    promptTone: 'storyteller',
    descriptionStyle: 'success_narrative',
    emphasis: ['transformation', 'measurable_results', 'relatability']
  }
}
```

---

### 7. NEWS
**Purpose:** Industry updates, trends, timely content

```typescript
{
  channelType: 'news',

  titleStyle: {
    tone: 'newsy',
    formulas: [
      "[Company/Industry] Announces [News]",
      "Breaking: [Event/Change]",
      "[Topic] Update: What You Need to Know",
      "[Year] [Topic] Trends: [Key Insight]",
      "Report: [Finding] According to [Source]"
    ],
    avoid: ['Ultimate', 'Complete Guide', 'Everything'],
    maxLength: 55
  },

  contentStyle: {
    structure: 'inverted_pyramid',
    sections: ['lead', 'key_facts', 'context', 'implications', 'whats_next'],
    wordCount: { min: 400, max: 800 },
    tone: ['timely', 'factual', 'concise'],
    features: ['dateline', 'quotes', 'links', 'related_coverage']
  },

  categoryStyle: {
    promptTone: 'news_editor',
    descriptionStyle: 'beat_coverage',
    emphasis: ['timeliness', 'industry_impact', 'reader_relevance']
  }
}
```

---

### 8. COMPARISON
**Purpose:** Product comparisons, alternatives, reviews

```typescript
{
  channelType: 'comparison',

  titleStyle: {
    tone: 'analytical',
    formulas: [
      "[Product A] vs [Product B]: [Year] Comparison",
      "Best [Product] Alternatives to [Popular Option]",
      "[Number] Best [Products] for [Use Case] Compared",
      "[Product A] or [Product B]? Here's How to Choose",
      "Comparing [Category]: Which [Product] Wins?"
    ],
    avoid: ['Ultimate', 'Amazing', 'Perfect'],
    maxLength: 55
  },

  contentStyle: {
    structure: 'comparative_analysis',
    sections: ['overview', 'comparison_criteria', 'head_to_head', 'use_case_recommendations', 'verdict'],
    wordCount: { min: 1200, max: 2000 },
    tone: ['objective', 'balanced', 'decisive'],
    features: ['comparison_tables', 'ratings', 'pros_cons', 'winner_badges']
  },

  categoryStyle: {
    promptTone: 'analyst',
    descriptionStyle: 'decision_support',
    emphasis: ['objectivity', 'clear_winners', 'use_case_matching']
  }
}
```

---

### 9. FAQ
**Purpose:** Question-answer format, quick answers

```typescript
{
  channelType: 'faq',

  titleStyle: {
    tone: 'question',
    formulas: [
      "What is [Topic]?",
      "How Does [Topic] Work?",
      "Why [Question]?",
      "Can I [Action]?",
      "What's the Difference Between [A] and [B]?"
    ],
    avoid: ['Guide', 'Ultimate', 'Complete'],
    maxLength: 50
  },

  contentStyle: {
    structure: 'question_answer',
    sections: ['direct_answer', 'explanation', 'examples', 'related_questions'],
    wordCount: { min: 200, max: 600 },
    tone: ['direct', 'helpful', 'scannable'],
    features: ['tldr', 'bullet_points', 'related_links']
  },

  categoryStyle: {
    promptTone: 'helpful_expert',
    descriptionStyle: 'question_clusters',
    emphasis: ['common_questions', 'search_intent', 'quick_answers']
  }
}
```

---

## Implementation

### 1. Add to Project Type

```typescript
// types.ts
export interface Project {
  // ... existing fields
  channelType?: ChannelType;  // Drives prompt selection
}
```

### 2. Channel Config Lookup

```typescript
// services/channelConfig.ts
export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  blog: BLOG_CONFIG,
  knowledge_base: KNOWLEDGE_BASE_CONFIG,
  // ... etc
};

export function getChannelConfig(channelType: ChannelType): ChannelConfig {
  return CHANNEL_CONFIGS[channelType] || CHANNEL_CONFIGS.blog;
}
```

### 3. Prompt Selection

```typescript
// In generation functions
const config = getChannelConfig(project.channelType || 'blog');

// Use config.titleStyle for title generation
// Use config.contentStyle for article generation
// Use config.categoryStyle for category suggestions
```

### 4. Category Generation Example

```typescript
function getCategoryPrompt(channelType: ChannelType): string {
  const config = getChannelConfig(channelType);

  if (config.categoryStyle.promptTone === 'editorial_director') {
    return EDITORIAL_CATEGORY_PROMPT;
  } else if (config.categoryStyle.promptTone === 'support_architect') {
    return KNOWLEDGE_BASE_CATEGORY_PROMPT;
  }
  // ... etc
}
```

---

## Prompt Templates by Channel Type

### BLOG Category Prompt
```
You are an Editorial Director creating compelling content categories for a media brand.
[Editorial brief style, magazine-quality, storytelling focus]
```

### KNOWLEDGE_BASE Category Prompt
```
You are a Support Content Architect organizing help documentation.
[Problem-solution focus, searchable titles, task-oriented]
```

### GUIDES Category Prompt
```
You are a Curriculum Designer creating a learning pathway.
[Skill progression, learning outcomes, audience level]
```

### PRODUCT_CONTENT Category Prompt
```
You are a Product Content Strategist planning buyer enablement content.
[Purchase journey, use cases, comparison angles]
```

---

## Migration Notes

1. **Existing projects** default to `channelType: 'blog'` if not set
2. **Onboarding** sets channelType from selected channel recommendation
3. **Category/Title/Content generation** checks `project.channelType` and uses appropriate prompt
4. **Admin can override** by setting channelType in project settings

---

## Files to Update

| File | Change |
|------|--------|
| `types.ts` | Add `channelType` to Project interface |
| `services/channelConfig.ts` | NEW: Channel configuration definitions |
| `services/geminiService.ts` | Use channel config for category prompts |
| `functions/src/index.ts` | Use channel config for title/article prompts |
| `contexts/OnboardingContext.tsx` | Set channelType from selected channel |
| `components/ProjectSettings.tsx` | Allow editing channelType |
