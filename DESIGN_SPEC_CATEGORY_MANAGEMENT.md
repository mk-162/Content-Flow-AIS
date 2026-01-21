# Category Management UX Design Specification

## Executive Summary

This document outlines UX improvements for category management, addressing three key needs:
1. **Per-category content quotas** - Allow users to define how much content they want in each category
2. **Subcategory creation** - Easy post-onboarding subcategory management
3. **Category page access** - Clear pathway to edit category landing pages

---

## Current State Analysis

### What Exists
- `CategoryWorkspace.tsx` - Full category management with drag-drop, research, bulk generation
- Hierarchical categories with `parentId` support
- Global `stubThreshold` in Project settings (1-25 stubs per category, applies to ALL)
- `CategoryPageEditor.tsx` - Editor for category landing pages
- Subcategory generation during onboarding only

### Pain Points
1. **Content quota is one-size-fits-all** - Can't have 10 articles in "Core Services" but only 3 in "Seasonal Updates"
2. **No obvious way to add subcategories** after onboarding
3. **Category pages buried** in the feed-based UI

---

## Proposed UX Design

### Option A: Enhanced Category Panel (Recommended)

A dedicated, always-accessible category management panel that surfaces all features.

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTENT AREAS                                    [+ Add Area]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ▼ 🏠 Home Services                              [⚙] [📄] [···]│
│    │  Target: 10 articles  │  Current: 7/10  │  █████████░      │
│    │                                                            │
│    ├─ Kitchen Renovations            [⚙] [📄]                   │
│    │    Target: 5  │  Current: 3/5   │  ██████░░░░              │
│    │                                                            │
│    ├─ Bathroom Remodels              [⚙] [📄]                   │
│    │    Target: 5  │  Current: 5/5   │  ██████████ ✓            │
│    │                                                            │
│    └─ [+ Add Subcategory]                                       │
│                                                                 │
│  ▶ 🌿 Outdoor Living                             [⚙] [📄] [···]│
│    │  Target: 8 articles  │  Current: 2/8  │  ██░░░░░░░░        │
│                                                                 │
│  ▶ 📅 Seasonal Tips                              [⚙] [📄] [···]│
│    │  Target: 4 articles  │  Current: 1/4  │  ██░░░░░░░░        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legend:
[⚙] = Category settings (quota, research, AI instructions)
[📄] = Edit category page
[···] = More actions (delete, move, duplicate)
```

#### Category Settings Modal

When clicking [⚙], show per-category settings:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙ Category Settings: Home Services                        [×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CONTENT TARGET                                                 │
│  ──────────────────────────────────────────────────────────────│
│  How many articles do you want in this category?                │
│                                                                 │
│     ○ Use project default (5)                                   │
│     ● Custom target                                             │
│                                                                 │
│        Articles target: [  10  ]  ←───────●───────→            │
│                          1              25                      │
│                                                                 │
│        □ Include subcategory content in count                   │
│                                                                 │
│  ──────────────────────────────────────────────────────────────│
│  AUTO-REPLENISHMENT                                             │
│  ──────────────────────────────────────────────────────────────│
│  When articles are published, auto-generate new stubs?          │
│                                                                 │
│     ● Yes, maintain target    ○ No, manual only                 │
│                                                                 │
│  ──────────────────────────────────────────────────────────────│
│  AI CONTEXT                                                     │
│  ──────────────────────────────────────────────────────────────│
│  Special instructions for AI when generating content:           │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ Focus on practical tips and cost-saving advice. Include     │
│  │ local regulations for Chicago area renovations.             │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  [Research Keywords]  [Deep Research]                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                               [Cancel]  [Save Settings]         │
└─────────────────────────────────────────────────────────────────┘
```

#### Add Subcategory Flow

Inline subcategory creation with AI suggestions:

```
┌─────────────────────────────────────────────────────────────────┐
│  + Add Subcategory to "Home Services"                      [×]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  QUICK ADD                                                      │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ Subcategory name...                              [Create]   │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ─────────────────── OR ───────────────────                     │
│                                                                 │
│  AI SUGGESTIONS based on "Home Services"        [⟳ Refresh]    │
│                                                                 │
│  ┌────────────────────────────────────────────┬───────────────┐
│  │ □ Flooring Installation                    │ High demand   │
│  │   └ Hardwood, tile, and vinyl options      │ ████████░░   │
│  ├────────────────────────────────────────────┼───────────────┤
│  │ □ Window Replacement                       │ Med demand    │
│  │   └ Energy efficiency and style upgrades   │ █████░░░░░   │
│  ├────────────────────────────────────────────┼───────────────┤
│  │ □ Basement Finishing                       │ High demand   │
│  │   └ Converting unused space                │ ███████░░░   │
│  └────────────────────────────────────────────┴───────────────┘
│                                                                 │
│  Content target for new subcategories: [5] articles each        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    [Cancel]  [Add Selected (2)]                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Option B: Inline Expansion (Simpler)

Keep current structure but add inline controls:

```
┌─────────────────────────────────────────────────────────────────┐
│  ≡ Home Services                                                │
│    Description: Professional home renovation services           │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ Articles: [  10  ]  │  ██████████░░░░░░  7/10           │  │
│    └─────────────────────────────────────────────────────────┘  │
│    [📄 Edit Page]  [✨ Generate]  [🔬 Research]  [+ Subcategory]│
│                                                                 │
│    └─ Kitchen Renovations                                       │
│       Articles: [5]  │  ██████░░░░  3/5                         │
│       [📄 Edit Page]  [✨ Generate]  [🔬 Research]              │
└─────────────────────────────────────────────────────────────────┘
```

---

### Option C: Spreadsheet-Style View (Power Users)

For users who want to manage many categories at once:

```
┌───────────────────┬────────┬─────────┬──────────┬──────────────┐
│ Category          │ Target │ Current │ Progress │ Actions      │
├───────────────────┼────────┼─────────┼──────────┼──────────────┤
│ ▼ Home Services   │ [10]   │ 7       │ ███████░ │ [📄][⚙][···]│
│   └ Kitchen       │ [5]    │ 3       │ ██████░░ │ [📄][⚙]     │
│   └ Bathroom      │ [5]    │ 5       │ ████████ │ [📄][⚙]     │
│   └ [+ Add]       │        │         │          │              │
├───────────────────┼────────┼─────────┼──────────┼──────────────┤
│ ▶ Outdoor Living  │ [8]    │ 2       │ ██░░░░░░ │ [📄][⚙][···]│
├───────────────────┼────────┼─────────┼──────────┼──────────────┤
│ ▶ Seasonal Tips   │ [4]    │ 1       │ ██░░░░░░ │ [📄][⚙][···]│
└───────────────────┴────────┴─────────┴──────────┴──────────────┘
│ TOTALS            │ 32     │ 18      │ 56%      │              │
└─────────────────────────────────────────────────────────────────┘
[+ Add Category]  [Bulk Settings]  [Generate All Missing]
```

---

## Data Model Changes

### Category Type Extension

```typescript
interface Category {
  // ... existing fields ...

  // NEW: Per-category content settings
  contentSettings?: {
    targetArticles: number;           // Override project default (null = use default)
    includeSubcategoryCount: boolean; // Count subcategory articles toward parent target
    autoReplenish: boolean;           // Auto-generate when below target
  };
}
```

### Migration Strategy

1. Existing categories get `contentSettings: undefined` (use project default)
2. Project `stubThreshold` becomes the default fallback
3. Per-category settings override when set

---

## Implementation Priority

### Phase 1: Per-Category Quotas (High Impact)
- Add `contentSettings` to Category type
- Update CategoryWorkspace to show inline quota controls
- Modify auto-generation logic to respect per-category targets
- Add settings modal for detailed configuration

### Phase 2: Subcategory Creation UX
- Add "+ Add Subcategory" button in category tree
- AI-powered subcategory suggestions
- Bulk subcategory creation

### Phase 3: Category Page Access
- Add visible [📄 Edit Page] button in category list
- Category page preview/edit slide-out panel
- Hero image quick-edit

---

## Recommendation

**Option A (Enhanced Category Panel)** is recommended because:

1. **Progressive disclosure** - Simple view by default, details on demand
2. **Clear visual hierarchy** - Progress bars show content health at a glance
3. **Discoverability** - Subcategory creation and page editing are visible, not hidden
4. **Scalability** - Works for 3 categories or 30 categories
5. **Mobile-friendly** - Collapse/expand pattern works on smaller screens

The inline quota controls make it immediately obvious what content exists and what's needed, while keeping the interface clean.

---

## Questions for User

1. **Quota inheritance**: Should subcategories count toward parent category quotas?
2. **Default behavior**: When creating a new category, should it auto-populate quota from project settings or start empty?
3. **Visual density**: Prefer the expanded tree view (Option A) or the compact spreadsheet view (Option C)?
4. **Auto-replenishment scope**: Should auto-replenishment be a global toggle or per-category setting?
