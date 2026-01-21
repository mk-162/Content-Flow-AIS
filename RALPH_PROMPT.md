# Ralph Loop Prompt: Feed-Based Workspace Redesign

## Mission
Transform ContentFlow AI from 3-column explorer to single-column feed. Focus on UX validation with mock SEO data.

## Source Documents
- `DESIGN_SPEC_FEED_REDESIGN.md` - Full visual specifications
- `types.ts` - Current type definitions
- `styles/designTokens.ts` - Current design tokens

## Key Decisions (Pre-Resolved)
- Use MOCK SEO data (API exists but use hardcoded for now)
- Cloud Function changes ARE in scope
- No backward compatibility needed (not live)
- Existing PENDING posts → PITCH status
- Existing NEEDS_REVIEW posts → READY status

---

## PHASE 1: Type System Updates
**Goal**: Update data model for new workflow

### Tasks
1. Read `types.ts` to understand current PostStatus enum
2. Update PostStatus enum:
   ```typescript
   enum PostStatus {
     PITCH = 'PITCH',
     SKIPPED = 'SKIPPED',
     GENERATING = 'GENERATING',
     READY = 'READY',
     PUBLISHED = 'PUBLISHED',
   }
   ```
3. Add pitch interface to Post type:
   ```typescript
   pitch?: {
     headline: string;
     keyPoints: string[];
     targetKeywords: {
       keyword: string;
       volume: number;
       difficulty: 'easy' | 'medium' | 'hard';
     }[];
   };
   ```
4. Add TaskType.GENERATE_PITCH and TaskType.GENERATE_FROM_PITCH if TaskType enum exists

### Verification
```bash
npx tsc --noEmit
```
Must pass with no errors.

### Checkpoint
If types compile, proceed to Phase 2.

---

## PHASE 2: Design Tokens Update
**Goal**: Add new color system for feed design

### Tasks
1. Read `styles/designTokens.ts`
2. Add feedColors object (from DESIGN_SPEC Part 3):
   ```typescript
   export const feedColors = {
     background: {
       page: '#0a0a0f',
       card: '#111118',
       cardHover: '#16161f',
       elevated: '#1c1c26',
     },
     brand: {
       primary: '#06b6d4',
       magic: '#8b5cf6',
       success: '#10b981',
       warning: '#f59e0b',
     },
     text: {
       primary: '#f4f4f5',
       secondary: '#a1a1aa',
       muted: '#52525b',
       inverse: '#0a0a0f',
     },
     border: {
       subtle: '#27272a',
       medium: '#3f3f46',
       focus: '#06b6d4',
     },
     seo: {
       high: '#10b981',
       medium: '#f59e0b',
       low: '#ef4444',
     },
     state: {
       generating: '#8b5cf6',
       ready: '#10b981',
       launched: '#06b6d4',
       skipped: '#52525b',
     }
   };
   ```
3. Add feedTypography object for new text styles
4. Add feedCard object for card variants

### Verification
```bash
npx tsc --noEmit
```

### Checkpoint
If compiles, proceed to Phase 3.

---

## PHASE 3: Create Feed Components Directory
**Goal**: Set up component structure

### Tasks
1. Create directory `components/feed/`
2. Create `components/feed/index.ts` for exports

### Verification
Directory exists and index.ts is valid TypeScript.

---

## PHASE 4: KeywordTable Component
**Goal**: Reusable SEO data display

### Tasks
1. Create `components/feed/KeywordTable.tsx`
2. Component shows keyword, volume (formatted with K suffix), difficulty badge
3. Use mock data structure:
   ```typescript
   const MOCK_KEYWORDS = [
     { keyword: 'sustainable manufacturing', volume: 8100, difficulty: 'medium' as const },
     { keyword: 'green manufacturing', volume: 3200, difficulty: 'easy' as const },
     { keyword: 'eco-friendly production', volume: 1400, difficulty: 'easy' as const },
   ];
   ```
4. Color-code difficulty: easy=green, medium=amber, hard=red
5. Export from index.ts

### Verification
```bash
npx tsc --noEmit
```

---

## PHASE 5: PitchCard Component
**Goal**: Primary decision card with Generate/Skip

### Tasks
1. Create `components/feed/PitchCard.tsx`
2. Props: `{ post: Post, onGenerate: (id: string) => void, onSkip: (id: string) => void }`
3. Sections:
   - Header: "PITCH" label + category badge
   - Title: post.title or post.pitch?.headline (Space Grotesk, 24px)
   - Key Points: bullet list from post.pitch?.keyPoints or generate 4 mock points
   - Keywords: use KeywordTable with post.pitch?.targetKeywords or MOCK_KEYWORDS
   - Actions: Skip button (ghost), Generate button (primary cyan)
4. Use framer-motion for enter animation
5. Use feedColors from designTokens
6. Export from index.ts

### Verification
```bash
npx tsc --noEmit
```

---

## PHASE 6: GeneratingCard Component
**Goal**: Progress state with cancel option

### Tasks
1. Create `components/feed/GeneratingCard.tsx`
2. Props: `{ post: Post, progress?: number, onCancel: (id: string) => void }`
3. Sections:
   - Header: "GENERATING" label + estimated time
   - Title: same as PitchCard
   - Progress bar: purple gradient, animated
   - Key Points: with checkmarks for completed sections
   - Cancel button
4. Purple glow effect on border (use box-shadow)
5. Export from index.ts

### Verification
```bash
npx tsc --noEmit
```

---

## PHASE 7: ReadyCard Component
**Goal**: Launch state with preview option

### Tasks
1. Create `components/feed/ReadyCard.tsx`
2. Props: `{ post: Post, onLaunch: (id: string) => void, onPreview: (id: string) => void }`
3. Sections:
   - Header: "READY TO LAUNCH" + green left border (4px)
   - Title: same styling
   - Key Points: all with green checkmarks
   - Keywords: condensed inline format
   - Actions: Preview button (ghost), Launch button (green, prominent)
4. Export from index.ts

### Verification
```bash
npx tsc --noEmit
```

---

## PHASE 8: ProgressHeader Component
**Goal**: Stats dashboard with Launch All

### Tasks
1. Create `components/feed/ProgressHeader.tsx`
2. Props: `{ stats: { pitches: number, generating: number, ready: number, launched: number }, onLaunchAll: () => void, onSettings: () => void }`
3. Layout:
   - 4 stat boxes in a row (PITCHES → GENERATING → READY → LAUNCHED)
   - Progress bar showing overall completion
   - Summary text: "X articles total • Y ready to launch"
   - Settings button (ghost), Launch All button (green, disabled if ready=0)
4. Export from index.ts

### Verification
```bash
npx tsc --noEmit
```

---

## PHASE 9: ContentFeed Component
**Goal**: Main container that renders appropriate cards

### Tasks
1. Create `components/feed/ContentFeed.tsx`
2. Props: `{ posts: Post[], onGenerate, onSkip, onCancel, onLaunch, onPreview }`
3. Logic:
   - Filter and sort posts by status
   - Render PitchCard for status === 'PITCH'
   - Render GeneratingCard for status === 'GENERATING'
   - Render ReadyCard for status === 'READY'
   - Skip PUBLISHED and SKIPPED (they go elsewhere)
4. Empty state: "No content to review. Add categories to generate pitches."
5. Use AnimatePresence for card transitions
6. Export from index.ts

### Verification
```bash
npx tsc --noEmit
```

---

## PHASE 10: Update MainWorkspace Layout
**Goal**: Replace 3-column with feed layout

### Tasks
1. Read `pages/MainWorkspace.tsx` thoroughly
2. Keep: TopBar, sidebar structure, Firebase listeners, notification system
3. Remove: CategoryWorkspace and PostsWorkspace rendering for Screen.CATEGORIES and Screen.POSTS
4. Add: Import ContentFeed and ProgressHeader from components/feed
5. Update Screen enum usage:
   - Screen.CATEGORIES → rename to Screen.FEED or reuse
   - When Screen.FEED active, render ProgressHeader + ContentFeed
6. Compute stats from posts array for ProgressHeader
7. Wire up handlers: onGenerate, onSkip, onLaunch etc to existing Firebase functions
8. Simplify sidebar: Feed, Published (was Live Posts), Settings

### Verification
```bash
npm run build
```
Must complete without errors.

---

## PHASE 11: Integration Testing
**Goal**: Verify the app loads and renders

### Tasks
1. Run `npm run dev` (or equivalent)
2. Check browser console for errors
3. If errors, fix them
4. Verify:
   - App loads without crash
   - Feed view shows (even if empty)
   - ProgressHeader renders
   - Sidebar navigation works

### Verification
```bash
npm run build
```
Build must pass.

---

## PHASE 12: Cloud Function Updates (If Time Permits)
**Goal**: Add GENERATE_PITCH task type

### Tasks
1. Find Cloud Functions directory (likely `functions/`)
2. Locate task processing logic
3. Add handler for TaskType.GENERATE_PITCH that:
   - Takes category context
   - Generates pitch with headline, keyPoints, mock keywords
   - Creates Post with status PITCH
4. This is lower priority - skip if blocked

### Verification
```bash
cd functions && npm run build
```
If exists and applicable.

---

## Success Criteria (ALL must be true)

1. `npm run build` passes with zero errors
2. New components exist in `components/feed/`:
   - KeywordTable.tsx
   - PitchCard.tsx
   - GeneratingCard.tsx
   - ReadyCard.tsx
   - ProgressHeader.tsx
   - ContentFeed.tsx
   - index.ts
3. `types.ts` has updated PostStatus enum with PITCH, SKIPPED, READY
4. `MainWorkspace.tsx` uses new feed layout
5. `designTokens.ts` has feedColors object

---

## Completion Promise

When ALL success criteria are met and `npm run build` passes:

<promise>FEED_REDESIGN_COMPLETE</promise>

---

## Escape Hatch

If stuck after 40 iterations:
1. Document what's blocking in a file called `RALPH_BLOCKERS.md`
2. List what was completed vs what remains
3. Output: <promise>FEED_REDESIGN_COMPLETE</promise>

---

## Anti-Patterns to Avoid

- Do NOT create new files without reading existing patterns first
- Do NOT skip verification steps
- Do NOT make assumptions about imports - read the files
- Do NOT proceed to next phase if current phase verification fails
- Do NOT delete CategoryWorkspace.tsx or PostsWorkspace.tsx - just stop rendering them
