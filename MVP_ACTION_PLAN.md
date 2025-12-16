# MissionContent MVP Action Plan

## Current State Assessment

Your platform has solid architecture but the AI-generated content quality needs improvement. The prompt system is well-structured with a 3-tier hierarchy (Admin → Org → Project) but the prompts themselves need optimization.

---

## PHASE 1: PROMPT AUDIT & OPTIMIZATION (Priority: HIGH)

### 1.1 Title Generation Prompt Issues

**Current Problems:**
- Generic titles despite business context injection
- SEO optimization mentioned but not enforced
- No word count/character limits enforced
- Missing emotional triggers and specificity

**Recommended New Title Generation Prompt:**
```
You are an expert SEO Content Strategist for {{businessName}}.

**BUSINESS CONTEXT:**
{{businessContext}}

**TASK:** Generate {{count}} highly specific, click-worthy blog post titles for: "{{categoryName}}"

Category Focus: {{categoryDescription}}
{{#if geographic}}Geographic Target: {{geographic}}{{/if}}

**STRICT REQUIREMENTS:**
1. Every title MUST directly relate to {{businessName}}'s products/services
2. Include specific outcomes, numbers, or timeframes where relevant
3. Use power words: Ultimate, Essential, Proven, Complete, Step-by-Step
4. Target search intent: informational, commercial, or transactional
5. 50-60 characters maximum

**OUTPUT FORMAT (JSON):**
For each idea provide:
- title: The headline (50-60 chars, specific to THIS business)
- teaser: 2-sentence content brief explaining the angle and value
- keywords: 3-5 long-tail SEO keywords this post should rank for
- searchIntent: "informational" | "commercial" | "transactional"

**EXAMPLES OF GOOD vs BAD:**
BAD: "How to Improve Your Business" (generic)
GOOD: "5 [Industry] Strategies That Increased Revenue 40% in Q1" (specific)

Return as JSON array.
```

### 1.2 Article Content Generation Issues

**Current Problems:**
- Structure is too rigid (always 3-5 sections)
- No word count guidance
- Missing SEO best practices (intro keyword placement, internal linking hints)
- No differentiation based on content purpose

**Recommended New Article Prompt:**
```
You are writing for {{businessName}}, a {{industry}} company.

**ARTICLE BRIEF:**
- Title: "{{topic}}"
- Category: {{category}}
- Target Audience: {{targetAudience}}
- Search Intent: Help readers {{searchIntent}}
- Target Word Count: 1,200-1,800 words

**BUSINESS CONTEXT:**
{{businessContext}}

**BRAND VOICE:**
- Tone: {{tone}}
- Key Message: {{brandMessage}}
{{#if brandCompliance}}- Compliance: {{brandCompliance}}{{/if}}

**SEO REQUIREMENTS:**
- Primary Keyword: {{primaryKeyword}}
- Secondary Keywords: {{keywords}}
- Include primary keyword in first 100 words
- Use H2/H3 headings with keywords naturally included

**CONTENT STRUCTURE:**

1. **Hook** (50-100 words)
   - Start with a compelling statistic, question, or pain point
   - Establish why this matters NOW

2. **Context** (100-150 words)
   - What readers will learn
   - Why {{businessName}} is qualified to teach this

3. **Main Content** (800-1200 words)
   - 3-5 actionable sections with H2 headings
   - Each section: problem → solution → example
   - Include specific examples from {{industry}}
   - Add bullet points for scanability

4. **Expert Insight** (100-150 words)
   - Unique perspective from {{businessName}}'s experience
   - What most people get wrong

5. **Action Steps** (100-150 words)
   - 3-5 specific next steps readers can take
   - Include one CTA related to {{businessName}}'s services

**FORMATTING:**
- Use markdown (## for H2, ### for H3)
- Bold key phrases
- Use bullet lists for 3+ items
- No fluff or filler content
- Every sentence must add value

Start directly with the hook. No preamble.
```

### 1.3 Category Suggestion Issues

**Current Problem:** Generic category suggestions not tailored to business

**Recommended Fix:**
```
You are a Content Strategist for {{businessName}} in the {{industry}} industry.

**BUSINESS CONTEXT:**
{{businessContext}}

{{#if parentCategory}}
**TASK:** Create 6 subcategories under "{{parentCategory}}" that would attract {{businessName}}'s ideal customers.
{{else}}
**TASK:** Suggest 5 top-level content categories for {{businessName}}'s blog.
{{/if}}

**REQUIREMENTS:**
- Each category must align with {{businessName}}'s services/products
- Focus on problems their customers actually have
- Consider search volume and competition
- Think about the buyer's journey (awareness → consideration → decision)

**FOR EACH CATEGORY PROVIDE:**
- name: 2-4 word category name
- description: One sentence explaining the content angle
- reason: Why this category will attract qualified leads
- buyerStage: "awareness" | "consideration" | "decision"
- estimatedSearchVolume: "high" | "medium" | "low"

Return as JSON array.
```

---

## PHASE 2: MVP FEATURE CHECKLIST

### 2.1 Must-Have for Launch (Week 1)

| Feature | Status | Action Needed |
|---------|--------|---------------|
| User Authentication | ✅ Done | - |
| Organization/Project Creation | ✅ Done | - |
| Category Management | ✅ Done | - |
| Title Generation | ⚠️ Works but quality low | Update prompts |
| Content Generation | ⚠️ Works but quality low | Update prompts |
| Content Editor | ✅ Done | - |
| Approve/Reject Flow | ✅ Done | - |
| **Prompt Audit** | ❌ Needed | Phase 1 above |

### 2.2 Should-Have for Launch (Week 2)

| Feature | Status | Action Needed |
|---------|--------|---------------|
| Onboarding Flow | ✅ Done | Test end-to-end |
| Website Analysis | ✅ Done | Verify accuracy |
| Credit System | ✅ Done | Set pricing tiers |
| Admin Dashboard | ✅ Done | - |
| Export to Markdown | ❌ Missing | Add export button |

### 2.3 Nice-to-Have (Post-Launch)

| Feature | Status | Notes |
|---------|--------|-------|
| WordPress Publishing | ⚠️ Partial | Has service, needs UI |
| Image Generation | ✅ Done | DALL-E 3 integration |
| Team Invitations | ❌ Missing | Email system needed |
| Usage Analytics | ⚠️ Partial | Tracking exists, UI needed |

---

## PHASE 3: PROMPT AUDIT PROCESS

### Step 1: Document Current Output Quality

1. Generate 10 titles for 3 different categories
2. Generate full content for 5 posts
3. Rate each output 1-5 on:
   - Relevance to business (is it actually about YOUR topic?)
   - Specificity (does it include concrete details?)
   - SEO quality (proper keywords, structure?)
   - Readability (flows well, no fluff?)
   - Actionability (reader knows what to do?)

### Step 2: Identify Patterns in Poor Output

Common issues to look for:
- [ ] Generic content that could apply to any business
- [ ] Missing business context despite it being provided
- [ ] Wrong tone (too formal/informal)
- [ ] Weak headlines that don't compel clicks
- [ ] Content that doesn't match the teaser promise
- [ ] SEO keywords not naturally integrated
- [ ] Missing calls-to-action

### Step 3: Iterate on Prompts

For each prompt type:
1. Update prompt in Admin panel
2. Generate 5 test outputs
3. Compare quality to baseline
4. If improved, keep. If not, try different approach
5. Document what worked/didn't work

### Step 4: A/B Testing Framework

Create prompt variants:
- **Variant A:** More detailed instructions
- **Variant B:** More examples of good/bad output
- **Variant C:** Stronger constraints (word counts, etc.)

Test each variant with 10 generations, pick winner.

---

## PHASE 4: TECHNICAL IMPROVEMENTS

### 4.1 Quick Wins (1-2 days)

1. **Add word count to content generation**
   - Track generated content length
   - Show word count in editor
   - Warn if under 800 words

2. **Add "Regenerate" button for titles**
   - Let users regenerate individual titles they don't like
   - Faster iteration than regenerating all

3. **Add prompt preview**
   - Show users what prompt will be sent (with variables filled)
   - Helps debug why content is off

### 4.2 Medium-Term (1-2 weeks)

1. **Content Quality Score**
   - After generation, run quick analysis
   - Check: word count, keyword density, readability score
   - Show score to user before they edit

2. **Prompt Templates Library**
   - Pre-built prompts for different industries
   - Users can select template as starting point

3. **Generation History**
   - Store all generated content (not just approved)
   - Let users see previous generations
   - Useful for comparing prompt changes

---

## PHASE 5: LAUNCH CHECKLIST

### Pre-Launch (3 days before)

- [ ] All prompts updated and tested
- [ ] Generate 20+ pieces of content, verify quality
- [ ] Test complete user flow: signup → onboarding → generation → approval
- [ ] Verify Firebase security rules are production-ready
- [ ] Set up error monitoring (Sentry or similar)
- [ ] Test on mobile browsers
- [ ] Prepare support documentation

### Launch Day

- [ ] Deploy to production Firebase hosting
- [ ] Verify all environment variables set
- [ ] Test signup flow with new email
- [ ] Monitor Firebase console for errors
- [ ] Have rollback plan ready

### Post-Launch (Week 1)

- [ ] Monitor user-generated content quality
- [ ] Collect feedback on AI outputs
- [ ] Track generation success/failure rates
- [ ] Iterate on prompts based on real usage

---

## RECOMMENDED IMMEDIATE ACTIONS

### Today:
1. **Update Title Generation Prompt** - Copy the improved version above into Admin Prompts
2. **Update Article Generation Prompt** - Copy the improved version above
3. **Test with 5 generations** - Verify quality improved

### This Week:
4. Run full prompt audit (Phase 3 steps)
5. Fix any remaining prompt issues
6. Test complete user journey
7. Prepare for launch

### Next Week:
8. Soft launch to limited users
9. Gather feedback
10. Iterate and improve

---

## METRICS TO TRACK

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Title Relevance | 4+/5 avg | Manual review sample |
| Content Quality | 4+/5 avg | Manual review sample |
| Generation Success Rate | >95% | Firebase logs |
| User Retention | >40% week 2 | Analytics |
| Content Approval Rate | >60% | Track approved/rejected |

---

## QUESTIONS TO ANSWER BEFORE LAUNCH

1. **Pricing:** How many credits per generation? What's the free tier?
2. **Target User:** Who is the ideal first customer?
3. **Differentiation:** Why use this vs ChatGPT directly?
4. **Support:** How will users get help?
5. **Feedback Loop:** How will you collect improvement suggestions?

---

*Last Updated: December 2024*
*Status: Ready for prompt audit execution*
