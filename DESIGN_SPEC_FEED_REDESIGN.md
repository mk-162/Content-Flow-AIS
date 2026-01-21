# ContentFlow AI - Feed-Based Workspace Redesign

## Executive Summary

Complete redesign from 3-column explorer layout to unified feed-based workflow. The goal: make the interface so intuitive that users immediately understand what to do, while delivering "magic moments" when AI generates valuable content.

---

## Part 1: Design Philosophy

### The Problem
- Current 3-column layout mimics Windows Explorer
- Users don't understand folder/category hierarchy
- Paralysis by choice - too many options, unclear path forward
- No clear "magic moment" when AI delivers value

### The Solution
- Single-column feed with stacked cards
- Clear workflow: Pitch → Generate → Launch
- Every card is actionable (no dead ends)
- SEO data validates decisions with real numbers

### Aesthetic Direction: "Editorial Command Center"

**Tone:** Clean, confident, data-driven yet editorial
**Inspiration:** Bloomberg Terminal meets Substack meets Linear

**Key Visual Elements:**
- Generous whitespace within cards
- Sharp geometric shapes (no border-radius)
- Data tables with clear hierarchy
- Progress indicators that feel rewarding
- Subtle animations for state changes

---

## Part 2: Typography System Update

### Current Fonts (Keep)
- Body: Plus Jakarta Sans
- Display: Space Grotesk
- Mono: JetBrains Mono

### New Typography Scale

```css
/* Headlines - for card titles */
.pitch-title {
  font-family: 'Space Grotesk';
  font-size: 1.5rem;      /* 24px */
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Sub-headlines - for section labels */
.section-label {
  font-family: 'Space Grotesk';
  font-size: 0.75rem;     /* 12px */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

/* Body - for key points */
.key-point {
  font-family: 'Plus Jakarta Sans';
  font-size: 0.9375rem;   /* 15px */
  font-weight: 500;
  line-height: 1.5;
}

/* Data - for SEO metrics */
.data-value {
  font-family: 'JetBrains Mono';
  font-size: 0.875rem;    /* 14px */
  font-weight: 500;
}
```

---

## Part 3: Color System Update

### Core Palette (Updated)

```typescript
// New color tokens for feed design
export const feedColors = {
  // Backgrounds
  background: {
    page: '#0a0a0f',        // Near black - page background
    card: '#111118',        // Card background
    cardHover: '#16161f',   // Card hover state
    elevated: '#1c1c26',    // Modals, dropdowns
  },

  // Brand colors
  brand: {
    primary: '#06b6d4',     // Cyan - primary actions
    magic: '#8b5cf6',       // Purple - AI/magic moments
    success: '#10b981',     // Green - approvals, launches
    warning: '#f59e0b',     // Amber - pending actions
  },

  // Text
  text: {
    primary: '#f4f4f5',     // Headlines, key content
    secondary: '#a1a1aa',   // Supporting text
    muted: '#52525b',       // Labels, hints
    inverse: '#0a0a0f',     // Text on bright backgrounds
  },

  // Borders
  border: {
    subtle: '#27272a',      // Card borders
    medium: '#3f3f46',      // Dividers
    focus: '#06b6d4',       // Focus states
  },

  // SEO Traffic Light System
  seo: {
    high: '#10b981',        // High volume (5K+)
    medium: '#f59e0b',      // Medium volume (1K-5K)
    low: '#ef4444',         // Low volume (<1K)
    difficulty: {
      easy: '#10b981',      // Low difficulty
      medium: '#f59e0b',    // Medium difficulty
      hard: '#ef4444',      // High difficulty
    }
  },

  // State colors
  state: {
    generating: '#8b5cf6',  // Purple pulse for AI working
    ready: '#10b981',       // Green for ready to launch
    launched: '#06b6d4',    // Cyan for published
    skipped: '#52525b',     // Muted for skipped
  }
};
```

---

## Part 4: Layout Architecture

### Global Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR (unchanged - logo, org/project, user menu)         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PROGRESS HEADER                                     │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  12 pitches  →  8 generating  →  5 ready      │  │   │
│  │  │  [████████████████████░░░░░░░░]               │  │   │
│  │  │                                 [LAUNCH ALL]   │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CONTENT FEED                                        │   │
│  │                                                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  PITCH CARD (expanded - top of stack)       │    │   │
│  │  │  ...                                        │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  PITCH CARD (collapsed)                     │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  GENERATING CARD (with progress)            │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  READY CARD (launch button prominent)       │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| Desktop (1200px+) | Centered feed, max-width 800px |
| Tablet (768-1199px) | Full width with padding |
| Mobile | Full width, simplified cards |

---

## Part 5: Component Specifications

### 5.1 Progress Header

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ PITCHES  │  │GENERATING│  │  READY   │  │ LAUNCHED │   │
│  │    12    │→ │    8     │→ │    5     │→ │    23    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────────────────────────┘   │
│  48 articles total • 5 ready to launch                     │
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────┐    │
│  │  ⚙️ SETTINGS         │  │  🚀 LAUNCH 5 ARTICLES  │    │
│  └──────────────────────┘  └─────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**States:**
- Empty: "Add your first category to start generating content"
- Generating: Pulsing purple glow on progress bar
- Ready: Green highlight on "Ready" count, prominent launch button
- All launched: Celebration state with confetti

### 5.2 Pitch Card (Primary Decision Point)

```
┌─────────────────────────────────────────────────────────────┐
│  PITCH                                         💡 category │
│                                                             │
│  "10 Sustainable Manufacturing Practices                    │
│   That Cut Costs by 30%"                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  KEY POINTS                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Energy-efficient equipment ROI breakdown          │   │
│  │ • Waste reduction strategies with case studies      │   │
│  │ • Water recycling systems comparison                │   │
│  │ • Employee engagement in sustainability programs    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TARGET KEYWORDS                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  KEYWORD                      VOLUME    DIFFICULTY  │   │
│  │  ──────────────────────────────────────────────────│   │
│  │  sustainable manufacturing    8,100/mo   Medium    │   │
│  │  green manufacturing          3,200/mo   Easy      │   │
│  │  eco-friendly production      1,400/mo   Easy      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────┐          ┌───────────────────────┐  │
│  │    ✗ SKIP         │          │   ✓ GENERATE ARTICLE  │  │
│  └───────────────────┘          └───────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Visual Details:**
- Title: Space Grotesk, 24px, -0.02em tracking
- Key points: Plus Jakarta Sans, 15px, bullet color = cyan
- Keywords table: JetBrains Mono for numbers
- Volume badges: Color-coded (green/amber/red based on volume)
- Difficulty badges: Color-coded (green=easy, amber=medium, red=hard)

**Animation:**
- Card enters with subtle fade + scale (0.98 → 1.0)
- Skip: Card slides left and fades
- Generate: Card pulses purple, then slides up

### 5.3 Generating Card

```
┌─────────────────────────────────────────────────────────────┐
│  GENERATING                                    ⏳ ~2 min    │
│                                                             │
│  "10 Sustainable Manufacturing Practices                    │
│   That Cut Costs by 30%"                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────────────────────────┘   │
│  Writing introduction...                                    │
│                                                             │
│  KEY POINTS (will be covered)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Energy-efficient equipment ROI                    │   │
│  │ ✓ Waste reduction strategies                        │   │
│  │ ○ Water recycling systems (in progress)             │   │
│  │ ○ Employee engagement                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────┐                                   │
│  │    ✗ CANCEL         │                                   │
│  └─────────────────────┘                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Visual Details:**
- Purple glow effect on card border
- Progress bar with gradient fill (purple → cyan)
- Checkmarks animate in as sections complete
- Estimated time counts down

### 5.4 Ready Card

```
┌─────────────────────────────────────────────────────────────┐
│  READY TO LAUNCH                              ✓ category   │
│                                                             │
│  "10 Sustainable Manufacturing Practices                    │
│   That Cut Costs by 30%"                                   │
│                                                             │
│  KEY POINTS (covered in article)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Energy-efficient equipment ROI breakdown          │   │
│  │ ✓ Waste reduction strategies with case studies      │   │
│  │ ✓ Water recycling systems comparison                │   │
│  │ ✓ Employee engagement in sustainability programs    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TARGET KEYWORDS                                            │
│  sustainable manufacturing (8.1K) • green manufacturing... │
│                                                             │
│  ┌─────────────────────┐          ┌───────────────────────┐│
│  │  👁️ PREVIEW         │          │   🚀 LAUNCH           ││
│  └─────────────────────┘          └───────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Visual Details:**
- Green left border (4px)
- All checkmarks green
- Preview opens article in slide-over panel
- Launch button is prominent (green background)

**Animation:**
- Launch: Card rockets upward with trail effect
- Confetti burst on successful launch

### 5.5 Collapsed Card (for list view)

```
┌─────────────────────────────────────────────────────────────┐
│  💡 "10 Sustainable Manufacturing..."   8.1K   ▶ GENERATE  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ⏳ "10 Sustainable Manufacturing..."   65%    ○ CANCEL    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ✓ "10 Sustainable Manufacturing..."   8.1K   🚀 LAUNCH    │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 6: Page-by-Page Changes

### 6.1 MainWorkspace.tsx (Complete Rewrite)

**Current:** 3-column layout with sidebar navigation
**New:** Single feed with progress header

**Changes Required:**
1. Remove CategoryWorkspace, PostsWorkspace split
2. Replace with new `ContentFeed` component
3. Keep sidebar but simplify to: Feed | Published | Settings
4. Add ProgressHeader component at top

**New Structure:**
```tsx
<MainWorkspace>
  <TopBar />
  <div className="flex">
    <Sidebar /> {/* Simplified: Feed, Published, Settings */}
    <main className="flex-1">
      <ProgressHeader />
      <ContentFeed />
    </main>
  </div>
</MainWorkspace>
```

### 6.2 New Components to Create

| Component | Purpose |
|-----------|---------|
| `ContentFeed.tsx` | Main feed container, handles sorting/filtering |
| `PitchCard.tsx` | Pitch display with SEO data |
| `GeneratingCard.tsx` | Article generation progress |
| `ReadyCard.tsx` | Ready to launch state |
| `ProgressHeader.tsx` | Stats + launch all button |
| `ArticlePreview.tsx` | Slide-over for previewing |
| `KeywordTable.tsx` | Reusable SEO data display |
| `LaunchCelebration.tsx` | Confetti + success animation |

### 6.3 Components to Remove/Deprecate

| Component | Reason |
|-----------|--------|
| `CategoryWorkspace.tsx` | Replaced by ContentFeed |
| `PostsWorkspace.tsx` | Merged into ContentFeed |
| Category tree components | No longer needed |

### 6.4 Components to Keep (Updated Styling)

| Component | Updates Needed |
|-----------|----------------|
| `TopBar.tsx` | Minor color updates |
| `ProjectSettings.tsx` | Style updates only |
| `LivePostsWorkspace.tsx` | Rename to "Published", update styling |
| `CreditManagementModal.tsx` | Style updates only |

### 6.5 OnboardingFlow Changes

Update onboarding to match new workflow:
1. URL input (unchanged)
2. Analysis (unchanged)
3. Category selection (unchanged)
4. **NEW:** "Here's your first batch of pitches" - show feed preview
5. **NEW:** Quick tutorial on Generate/Skip workflow

---

## Part 7: Data Model Updates

### 7.1 Post Status Updates

```typescript
// Current statuses
enum PostStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
}

// New statuses for pitch workflow
enum PostStatus {
  PITCH = 'PITCH',              // New: Ready for generate/skip decision
  SKIPPED = 'SKIPPED',          // New: User skipped this pitch
  GENERATING = 'GENERATING',    // Same: AI writing content
  READY = 'READY',              // Renamed from NEEDS_REVIEW
  PUBLISHED = 'PUBLISHED',      // Same: Live on site
}
```

### 7.2 Post Schema Updates

```typescript
interface Post {
  // Existing fields...

  // New pitch fields
  pitch?: {
    headline: string;           // The article title/hook
    keyPoints: string[];        // Bullet points of coverage
    targetKeywords: {
      keyword: string;
      volume: number;           // Monthly search volume
      difficulty: 'easy' | 'medium' | 'hard';
    }[];
    estimatedWordCount?: number;
  };

  // New for "Ready" state
  generatedAt?: Timestamp;
  wordCount?: number;
}
```

### 7.3 Generation Task Updates

```typescript
enum TaskType {
  // Existing...
  GENERATE_PITCH = 'GENERATE_PITCH',  // New: Generate pitch only
  GENERATE_FROM_PITCH = 'GENERATE_FROM_PITCH',  // New: Full article from approved pitch
}
```

---

## Part 8: Animation Specifications

### 8.1 Card Entrance
```css
@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
/* Duration: 300ms, Easing: cubic-bezier(0.16, 1, 0.3, 1) */
```

### 8.2 Skip Animation
```css
@keyframes cardSkip {
  to {
    opacity: 0;
    transform: translateX(-100px);
  }
}
/* Duration: 250ms */
```

### 8.3 Generate/Launch Animation
```css
@keyframes cardLaunch {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.02); }
  100% { transform: translateY(-100vh) scale(0.8); opacity: 0; }
}
/* Duration: 500ms */
```

### 8.4 Progress Bar Pulse
```css
@keyframes progressPulse {
  0%, 100% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
}
```

---

## Part 9: Implementation Plan

### Phase 1: Foundation (Core Components)
1. Update `designTokens.ts` with new color system
2. Create `PitchCard.tsx` component
3. Create `GeneratingCard.tsx` component
4. Create `ReadyCard.tsx` component
5. Create `ProgressHeader.tsx` component
6. Create `ContentFeed.tsx` container

### Phase 2: Integration
1. Update `MainWorkspace.tsx` to use new layout
2. Create `ArticlePreview.tsx` slide-over
3. Add launch animations
4. Update sidebar navigation

### Phase 3: Data Layer
1. Update Post type definitions
2. Create pitch generation service
3. Update existing generation flow to two-step

### Phase 4: Polish
1. Add skeleton loading states
2. Implement confetti celebration
3. Add keyboard shortcuts (J/K to navigate, G to generate, S to skip)
4. Accessibility audit

### Phase 5: Migration
1. Update onboarding flow
2. Create migration for existing posts
3. Update published posts view
4. QA and testing

---

## Part 10: Files to Modify

### High Priority (Core Experience)
- [ ] `styles/designTokens.ts` - New color system
- [ ] `types.ts` - Post status and schema updates
- [ ] `pages/MainWorkspace.tsx` - Complete layout overhaul
- [ ] `components/PostsWorkspace.tsx` - Replace with ContentFeed
- [ ] `components/CategoryWorkspace.tsx` - Deprecate/archive

### New Files to Create
- [ ] `components/feed/ContentFeed.tsx`
- [ ] `components/feed/PitchCard.tsx`
- [ ] `components/feed/GeneratingCard.tsx`
- [ ] `components/feed/ReadyCard.tsx`
- [ ] `components/feed/ProgressHeader.tsx`
- [ ] `components/feed/KeywordTable.tsx`
- [ ] `components/feed/ArticlePreview.tsx`
- [ ] `components/feed/LaunchCelebration.tsx`
- [ ] `services/pitchGenerationService.ts`

### Medium Priority (Supporting)
- [ ] `components/layout/TopBar.tsx` - Style updates
- [ ] `components/LivePostsWorkspace.tsx` - Rename, restyle
- [ ] `components/ui/Card.tsx` - New variants
- [ ] `components/ui/Badge.tsx` - SEO badges
- [ ] `index.html` - Animation keyframes

### Lower Priority (Polish)
- [ ] `components/onboarding/*` - Update for new workflow
- [ ] `components/ProjectSettings.tsx` - Style alignment
- [ ] `hooks/useKeyboardNavigation.ts` - New hook

---

## Part 11: Success Metrics

### User Experience
- [ ] Time to first action < 5 seconds (vs current ~30 seconds)
- [ ] Users understand workflow without explanation
- [ ] Generate/Skip ratio tracked (healthy = 70%+ generate)

### Technical
- [ ] Feed renders 100 cards without jank
- [ ] Animations run at 60fps
- [ ] No layout shifts during loading

### Engagement
- [ ] Magic moment: first article generation triggers delight
- [ ] Launch moment: visible celebration reinforces success
- [ ] Progress header creates "one more" motivation

---

## Appendix A: Sample Code Snippets

### PitchCard Component Structure

```tsx
interface PitchCardProps {
  post: Post;
  onGenerate: (postId: string) => void;
  onSkip: (postId: string) => void;
  isExpanded?: boolean;
}

export const PitchCard: React.FC<PitchCardProps> = ({
  post,
  onGenerate,
  onSkip,
  isExpanded = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-[#111118] border border-[#27272a]"
    >
      {/* Card content */}
    </motion.div>
  );
};
```

### Progress Header Component Structure

```tsx
interface ProgressHeaderProps {
  stats: {
    pitches: number;
    generating: number;
    ready: number;
    launched: number;
  };
  onLaunchAll: () => void;
  onSettings: () => void;
}
```

---

## Appendix B: Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `J` | Move to next card |
| `K` | Move to previous card |
| `G` | Generate article (on pitch card) |
| `S` | Skip pitch |
| `L` | Launch article (on ready card) |
| `P` | Preview article |
| `Shift+L` | Launch all ready articles |
| `?` | Show keyboard shortcuts |

---

*Document Version: 1.0*
*Last Updated: January 2026*
