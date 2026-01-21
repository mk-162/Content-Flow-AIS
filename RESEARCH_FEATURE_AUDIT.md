# Research Feature Audit & Requirements Document

## Executive Summary

This document provides a comprehensive audit of the existing research functionality and defines requirements for integrating research into the new tabbed workspace feed pages. The research system is a critical feature that costs 20 credits and takes approximately 5-10 minutes to complete.

---

## Part 1: Current Research System Audit

### 1.1 Research Types

The system supports three research types:

| Type | Description | Tier | Cost |
|------|-------------|------|------|
| **Shallow Research** | AI-estimated keywords using Gemini | FREE/STARTER | 5 credits |
| **Deep Research** | Enhanced with DataForSEO real data | PROFESSIONAL/ENTERPRISE | 10 credits |
| **Google Deep Research** | Full market research using Gemini Deep Research agent | All tiers | 20 credits |

### 1.2 Google Deep Research Details

**Location:** `functions/src/index.ts:2168-2467`

**Process:**
1. Credit check (requires 20 credits)
2. Build rich business context from project profile
3. Fetch existing keywords if available
4. Create detailed research prompt with 7 sections:
   - Search Landscape Analysis
   - Audience Insights
   - Competitive Content Analysis
   - Data & Statistics
   - Expert Sources & Authorities
   - Content Opportunities
   - Keywords & Topics
5. Start Gemini Deep Research agent in background mode (`deep-research-pro-preview-12-2025`)
6. Poll for completion every 15 seconds (max 8 minutes)
7. Save results to category's `googleDeepResearch` field

**Output Format:** Markdown with sections, inline citations as `[Source Name](url)`

### 1.3 Research Flow Through Content Generation

**Citation Extraction:** `functions/src/index.ts:980-1044`

```typescript
// Extracts markdown links: [text](url)
const extractCitationsFromResearch = (researchContent: string) => {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  // Returns { citations: [], summary: string }
}
```

**Research Context Builder:** `functions/src/index.ts:1023-1044`

Used to inject research into generation prompts with formatted citations.

### 1.4 Where Research is Used

| Feature | How Research is Used | Location |
|---------|---------------------|----------|
| **Title Generation** | Full research context + citations injected into prompt | `processGenerateTitles()` |
| **Article Generation** | Research context shapes content, citations encouraged | `processGenerateContent()` |
| **Category Page Generation** | Uses research for comprehensive intro | `processGenerateCategoryPage()` |
| **Category Description** | AI regenerates description from research | `CategoryWorkspace.tsx:2584-2617` |
| **Apply Research** | Deletes existing posts, regenerates everything | `CategoryWorkspace.tsx:2573-2630` |

### 1.5 Current UX for Research

**Location:** `components/CategoryWorkspace.tsx`

**CategorySummaryCard features:**
- Research status indicator (none/running/complete)
- "Run Deep Research" button (20 credits)
- "View Report" button when complete
- "Apply Research" button to regenerate all content

**Research Modal:** Lines 2913-2956
- Full-width modal with markdown rendering
- Uses `marked.parse()` with `stripPreamble()`
- Shows character count

---

## Part 2: Known Issues

### 2.1 Citation Links Appearing as Chevrons

**Status:** Needs investigation

**Symptom:** User reports citation links appear as ChevronRight icons with no content.

**Analysis:**
- The `marked` library correctly parses markdown links
- TiptapViewer and TiptapEditor both configure Link extension with `text-cyan-400 underline` styling
- ChevronRight is used throughout the codebase for breadcrumbs and navigation, NOT for links
- The issue may be:
  1. Markdown links with empty text: `[](url)`
  2. Broken markdown parsing for certain URL patterns
  3. Content display issue in specific contexts

**Recommended Investigation:**
1. Check actual research content in Firestore for malformed links
2. Test the research modal with sample content containing various link formats
3. Review if any custom link rendering exists that might insert chevrons

### 2.2 No Visual Feedback on Research Duration

**Issue:** Users don't understand research takes 5-10 minutes

**Current State:** Only a loading indicator is shown

**Impact:** Users may think the system is broken or leave the page

---

## Part 3: Requirements for New Feed Pages

### 3.1 Research Button Requirements

#### R1: Research Trigger
- [ ] Add "Run Deep Research" button to parent category cards in CategoriesTab
- [ ] Button should show credit cost (20 credits)
- [ ] Button should be disabled if:
  - Research is already running
  - Insufficient credits
  - Category already has research (offer "Refresh" instead)

#### R2: Research Status Display
- [ ] Show research status on category cards:
  - **None:** "No research" with "Run Research" button
  - **Running:** Animated indicator with "Research in progress..." and estimated time remaining
  - **Complete:** "Research complete" with "View Report" link and timestamp

#### R3: Time Expectation Communication
- [ ] Before triggering: Modal explaining "This will take 5-10 minutes"
- [ ] During research: Progress indicator with elapsed time
- [ ] Consider: Push notification when complete (if user navigates away)

### 3.2 Research Report Access

#### R4: View Research Report
- [ ] "View Report" button on category cards with completed research
- [ ] Full-width modal showing formatted research content
- [ ] Markdown rendering with proper link styling
- [ ] Ability to copy report content

#### R5: Research Editing
- [ ] Allow users to edit research content post-generation
- [ ] Changes should persist and be used in subsequent generations
- [ ] Mark edited research with "Modified by user" indicator

### 3.3 Research Integration with Content Generation

#### R6: Block Briefs Without Research
- [ ] "Generate Briefs" button should be disabled if no research exists
- [ ] Show tooltip: "Run research first to generate better content"
- [ ] OR: Allow generation but show warning about reduced quality

#### R7: Research Context in Briefs
- [ ] Each generated brief should include:
  - Target keywords from research
  - Relevant questions to answer
  - Suggested angle based on content gaps
- [ ] Display these on PitchCard for user reference

#### R8: Citation Flow
- [ ] Citations from research should flow into article generation prompts
- [ ] Generated articles should include proper markdown links
- [ ] Display citations in article preview with clickable links

### 3.4 Subcategory Research Inheritance

#### R9: Parent Research Availability
- [ ] Subcategories should have access to parent's research context
- [ ] When generating briefs for subcategory, include relevant parent research
- [ ] Consider: Option to run separate research for subcategories

### 3.5 Research Refresh

#### R10: Refresh Research
- [ ] "Refresh Research" button for categories with existing research
- [ ] Show age of current research (e.g., "Last updated 3 days ago")
- [ ] Confirm before refreshing (costs 20 credits again)
- [ ] Keep previous research accessible until new one completes

---

## Part 4: Technical Implementation Plan

### 4.1 CategoryCard Updates

Add to `components/workspace/CategoryCard.tsx`:

```typescript
interface CategoryCardProps {
  // ... existing props
  researchStatus?: 'none' | 'running' | 'complete';
  researchAge?: Date;
  onRunResearch?: () => void;
  onViewResearch?: () => void;
}
```

### 4.2 Research Modal Component

Create `components/workspace/ResearchReportModal.tsx`:

```typescript
interface ResearchReportModalProps {
  category: Category;
  onClose: () => void;
  onEdit?: (content: string) => void;
}
```

### 4.3 Research Status Hook

Create `hooks/useResearchStatus.ts`:

```typescript
export function useResearchStatus(categoryId: string) {
  // Returns: { status, content, generatedAt, isStale, timeRemaining }
  // Polls for updates when status is 'running'
}
```

### 4.4 Brief Generation Blocking

Update `components/workspace/CategoryCard.tsx`:

```typescript
// In subcategory card
const canGenerateBriefs = hasResearch || parentHasResearch;

<button
  disabled={!canGenerateBriefs}
  title={!canGenerateBriefs ? "Run research on parent category first" : undefined}
>
  Generate Briefs
</button>
```

---

## Part 5: UI/UX Specifications

### 5.1 Research Button States

```
[Default]
┌─────────────────────────────────┐
│ 🔬 Run Deep Research (20 cr)   │
└─────────────────────────────────┘

[Running]
┌─────────────────────────────────┐
│ ⟳ Researching... ~5 min left   │
└─────────────────────────────────┘

[Complete]
┌─────────────────────────────────┐
│ ✓ Research Complete · View     │
└─────────────────────────────────┘
```

### 5.2 Pre-Research Confirmation Modal

```
┌─────────────────────────────────────────┐
│ Run Deep Research                        │
├─────────────────────────────────────────┤
│                                          │
│  This will analyze market trends,        │
│  competitor content, and search data     │
│  for "[Category Name]"                   │
│                                          │
│  ⏱️ Takes 5-10 minutes                   │
│  💰 Costs 20 credits                     │
│                                          │
│  You can navigate away - we'll notify    │
│  you when research is complete.          │
│                                          │
├─────────────────────────────────────────┤
│        [Cancel]     [Start Research]     │
└─────────────────────────────────────────┘
```

### 5.3 Research Progress Indicator

Display on category card while research is running:
- Animated border/glow effect
- Progress percentage (calculated from poll count)
- Elapsed time counter
- "Cancel" option (if possible)

---

## Part 6: Data Model Considerations

### 6.1 Current Research Storage

Research is stored directly on the Category document:

```typescript
interface Category {
  googleDeepResearch?: {
    content: string;
    generatedAt: Timestamp;
    status: 'running' | 'complete' | 'failed';
    error?: string;
  };
}
```

### 6.2 Proposed Enhancements

```typescript
interface Category {
  googleDeepResearch?: {
    content: string;
    generatedAt: Timestamp;
    status: 'running' | 'complete' | 'failed';
    error?: string;
    // New fields:
    editedContent?: string;  // User-modified version
    editedAt?: Timestamp;
    citations?: Citation[];  // Pre-extracted for quick access
    keyInsights?: string[];  // AI-summarized key points
  };
}
```

---

## Part 7: Migration Path

### Phase 1: Core Integration
1. Add research status display to CategoryCard
2. Add research trigger button with confirmation modal
3. Add research report modal

### Phase 2: Enhanced UX
4. Add time estimation and progress tracking
5. Implement research editing capability
6. Add "block briefs without research" logic

### Phase 3: Advanced Features
7. Add push notifications for research completion
8. Add research inheritance for subcategories
9. Add research refresh with comparison view

---

## Appendix A: File References

| File | Purpose |
|------|---------|
| `functions/src/index.ts:2168-2467` | Google Deep Research processing |
| `functions/src/index.ts:980-1044` | Citation extraction and formatting |
| `services/researchService.ts` | Client-side shallow/deep research |
| `components/CategoryWorkspace.tsx:2549-2634` | CategorySummaryCard with research |
| `components/CategoryWorkspace.tsx:2913-2956` | Research report modal |
| `components/workspace/CategoryCard.tsx` | New category cards (needs research) |
| `components/workspace/CategoriesTab.tsx` | Tab showing category list |
| `components/TiptapEditor.tsx` | Markdown rendering for research |

---

## Appendix B: Credit Costs Reference

| Action | Cost |
|--------|------|
| Shallow Research | 5 credits |
| Deep Research (DataForSEO) | 10 credits |
| Google Deep Research | 20 credits |
| Generate 1 Brief | 1 credit |
| Generate Article | 5 credits |
| Generate Category Page | 3 credits |

---

*Document Version: 1.0*
*Created: Based on codebase audit*
*Status: Ready for review*
