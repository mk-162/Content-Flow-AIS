# Design Spec: Tabbed Categories/Stubs Workspace

## Overview

Replace the current single-view workspace with a tabbed interface containing two tabs:
- **Categories Tab** - Manage content categories and subcategories
- **Stubs Tab** - Manage individual content stubs (current functionality)

---

## Visual Design

### Tab Bar

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   [Categories]    [Stubs]                                    [+ Add Category]   │
│   ════════════                                                                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Tabs are left-aligned
- Active tab has underline indicator (purple `#a855f7`)
- "Add" button changes based on active tab:
  - Categories tab → "+ Add Category"
  - Stubs tab → "+ Add Stub"

### Categories Tab Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   [Categories]    [Stubs]                                    [+ Add Category]   │
│   ════════════                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   PARENT CATEGORIES                                                             │
│   ─────────────────                                                             │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                         │   │
│   │  ┌────────────┐   Productivity Tips                                     │   │
│   │  │            │   "Strategies for getting more done with less stress"   │   │
│   │  │   IMAGE    │                                                         │   │
│   │  │            │   Keywords: efficiency, time management, focus          │   │
│   │  └────────────┘   Meta: Weekly series                                   │   │
│   │                                                                         │   │
│   │   12 articles generated                         [View Articles →]       │   │
│   │                                                                         │   │
│   │   [🔬 Research]    [➕ Generate Subcategories]              [⚙️] [🗑️]   │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                         │   │
│   │  ┌────────────┐   Tech Reviews                                          │   │
│   │  │            │   "Honest takes on the latest gadgets and apps"         │   │
│   │  │   IMAGE    │                                                         │   │
│   │  │            │   Keywords: technology, reviews, gadgets                │   │
│   │  └────────────┘   Meta: Bi-weekly deep dives                            │   │
│   │                                                                         │   │
│   │   8 articles generated                          [View Articles →]       │   │
│   │                                                                         │   │
│   │   [🔬 Research]    [➕ Generate Subcategories]              [⚙️] [🗑️]   │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│                                                                                 │
│   SUBCATEGORIES                                                                 │
│   ─────────────                                                                 │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                         │   │
│   │  ┌────────────┐   Morning Routines                    ← Productivity    │   │
│   │  │            │   "Start your day with intention and purpose"           │   │
│   │  │   IMAGE    │                                                         │   │
│   │  │            │   Keywords: morning, habits, routine                    │   │
│   │  └────────────┘   Meta: Monday posts                                    │   │
│   │                                                                         │   │
│   │   5 articles generated                          [View Articles →]       │   │
│   │                                                                         │   │
│   │   [🔬 Research]    [📝 Generate Stubs]                      [⚙️] [🗑️]   │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                         │   │
│   │  ┌────────────┐   Deep Work Sessions                  ← Productivity    │   │
│   │  │            │   "Focused blocks for maximum output"                   │   │
│   │  │   IMAGE    │                                                         │   │
│   │  │            │   Keywords: focus, deep work, productivity              │   │
│   │  └────────────┘   Meta: Wednesday posts                                 │   │
│   │                                                                         │   │
│   │   3 articles generated                          [View Articles →]       │   │
│   │                                                                         │   │
│   │   [🔬 Research]    [📝 Generate Stubs]                      [⚙️] [🗑️]   │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Color Scheme

### Category Cards (Purple Theme)

```css
/* Parent Category Card */
.category-card-parent {
  background: linear-gradient(135deg, #1a1625 0%, #12111a 100%);
  border: 1px solid rgba(168, 85, 247, 0.3);  /* purple-500/30 */
  border-left: 4px solid #a855f7;              /* purple-500 accent */
}

.category-card-parent:hover {
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.1);
}

/* Subcategory Card */
.category-card-sub {
  background: linear-gradient(135deg, #161422 0%, #0f0e14 100%);
  border: 1px solid rgba(139, 92, 246, 0.25);  /* violet-500/25 */
  border-left: 4px solid #8b5cf6;              /* violet-500 accent */
}
```

### Stub Cards (Current Dark Theme - Unchanged)

```css
.stub-card {
  background: #111118;
  border: 1px solid #27272a;
}
```

### Visual Differentiation Summary

| Element | Background | Border | Left Accent |
|---------|------------|--------|-------------|
| Parent Category | `#1a1625` → `#12111a` | `purple-500/30` | `purple-500` (4px) |
| Subcategory | `#161422` → `#0f0e14` | `violet-500/25` | `violet-500` (4px) |
| Stub | `#111118` | `#27272a` | None |

---

## Component Structure

### New Components to Create

```
components/
├── workspace/
│   ├── WorkspaceTabs.tsx          # Tab bar component
│   ├── CategoriesTab.tsx          # Categories tab content
│   ├── StubsTab.tsx               # Stubs tab content (refactored from current)
│   └── CategoryCard.tsx           # Individual category card
```

### WorkspaceTabs.tsx

```tsx
interface WorkspaceTabsProps {
  activeTab: 'categories' | 'stubs';
  onTabChange: (tab: 'categories' | 'stubs') => void;
  categoryFilter?: string;  // For deep-linking from category cards
}
```

### CategoryCard.tsx

```tsx
interface CategoryCardProps {
  category: Category;
  isParent: boolean;
  parentName?: string;           // For subcategories, show "← Parent Name"
  articleCount: number;          // Count of stubs in this category
  onResearch: () => void;
  onGenerateSubcategories?: () => void;  // Only for parents
  onGenerateStubs?: () => void;          // Only for subcategories
  onViewArticles: () => void;    // Jump to Stubs tab with filter
  onEdit: () => void;
  onDelete: () => void;
}
```

---

## Card Layout Specification

### Category Card Dimensions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  padding: 20px                                                              │
│                                                                             │
│  ┌──────────────┐                                                           │
│  │              │  Title (text-xl font-semibold text-white)                 │
│  │    IMAGE     │  Description (text-sm text-zinc-400, max 2 lines)         │
│  │   120x80px   │                                                           │
│  │              │  Keywords: (text-xs text-zinc-500)                        │
│  └──────────────┘  Meta: (text-xs text-zinc-500)                            │
│       ↑                                                                     │
│   gap: 16px                                                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  (divider: border-t border-zinc-800, margin-y: 12px)                        │
│                                                                             │
│  12 articles generated                              [View Articles →]       │
│  (text-sm text-purple-400)                          (text-sm text-purple-400 hover:underline)
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [🔬 Research]  [➕ Generate Subcategories]                     [⚙️] [🗑️]   │
│  (buttons)      (buttons)                                       (icons)     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Button Styles

```tsx
// Research Button
<button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg flex items-center gap-2">
  <FlaskConical size={16} />
  Research
</button>

// Generate Subcategories Button (Parent only)
<button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg flex items-center gap-2 border border-zinc-700">
  <Plus size={16} />
  Generate Subcategories
</button>

// Generate Stubs Button (Subcategory only)
<button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg flex items-center gap-2">
  <FileText size={16} />
  Generate Stubs
</button>

// View Articles Link
<button className="text-sm text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1">
  View Articles
  <ArrowRight size={14} />
</button>
```

---

## Article Count & Filtering

### Counting Articles

```tsx
// In CategoriesTab.tsx or via context
const getArticleCount = (categoryId: string): number => {
  return stubs.filter(stub => stub.categoryId === categoryId).length;
};
```

### "View Articles" Navigation

When user clicks "View Articles →":

1. Switch to Stubs tab
2. Apply category filter
3. Scroll to top

```tsx
const handleViewArticles = (categoryId: string, categoryName: string) => {
  // Update URL or state
  setActiveTab('stubs');
  setCategoryFilter(categoryId);

  // Optional: Update URL for deep-linking
  // router.push(`/workspace?tab=stubs&category=${categoryId}`);
};
```

### Filter UI on Stubs Tab

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   [Categories]    [Stubs]                                        [+ Add Stub]   │
│                   ════════                                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   Filtering by: Morning Routines                              [✕ Clear Filter] │
│   ──────────────────────────────────────────────────────────────────────────── │
│                                                                                 │
│   [Stub Card 1...]                                                              │
│   [Stub Card 2...]                                                              │
│   [Stub Card 3...]                                                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Section Headers

### Categories Tab Sections

```tsx
{/* Parent Categories Section */}
<div className="mb-8">
  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    <Folder size={20} className="text-purple-400" />
    Parent Categories
    <span className="text-sm font-normal text-zinc-500">({parentCategories.length})</span>
  </h2>

  <div className="space-y-4">
    {parentCategories.map(category => (
      <CategoryCard key={category.id} category={category} isParent={true} ... />
    ))}
  </div>
</div>

{/* Subcategories Section */}
<div>
  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    <FolderOpen size={20} className="text-violet-400" />
    Subcategories
    <span className="text-sm font-normal text-zinc-500">({subcategories.length})</span>
  </h2>

  <div className="space-y-4">
    {subcategories.map(category => (
      <CategoryCard
        key={category.id}
        category={category}
        isParent={false}
        parentName={getParentName(category.parentId)}
        ...
      />
    ))}
  </div>
</div>
```

---

## Interactions & Workflows

### 1. Research Button Click

```
User clicks [Research] on any category
    ↓
If research not already done:
    → Show confirmation: "Research costs 20 credits. Continue?"
    → On confirm: Start research, show loading state
    → On complete: Update category.researchData, show success toast

If research already done:
    → Show option to "Refresh Research" (costs 20 credits)
```

### 2. Generate Subcategories (Parent Categories Only)

```
User clicks [Generate Subcategories] on parent category
    ↓
AddSubcategoryModal opens (existing component)
    ↓
AI generates subcategory suggestions
    ↓
User selects/edits suggestions
    ↓
On save: New subcategories created with parentId = this category's ID
    ↓
Subcategories appear in "Subcategories" section below
```

### 3. Generate Stubs (Subcategories Only)

```
User clicks [Generate Stubs] on subcategory
    ↓
If no research done:
    → Prompt: "Research required first. Run research? (20 credits)"

If research done:
    → Open stub generation modal/flow
    → AI generates stub suggestions based on research
    → User reviews/edits
    → Stubs created with categoryId = this subcategory's ID
```

### 4. View Articles Click

```
User clicks [View Articles →]
    ↓
Switch to Stubs tab
    ↓
Apply filter: categoryId = clicked category's ID
    ↓
Show filter bar: "Filtering by: {Category Name}" [Clear]
    ↓
Display only stubs matching filter
```

---

## State Management

### Tab State

```tsx
// In MainWorkspace.tsx or parent component
const [activeTab, setActiveTab] = useState<'categories' | 'stubs'>('categories');
const [stubFilter, setStubFilter] = useState<{
  categoryId?: string;
  categoryName?: string;
} | null>(null);

// Clear filter when switching tabs manually
const handleTabChange = (tab: 'categories' | 'stubs') => {
  if (tab === 'categories') {
    setStubFilter(null);  // Clear filter when going back to categories
  }
  setActiveTab(tab);
};

// Set filter when clicking "View Articles"
const handleViewArticles = (categoryId: string, categoryName: string) => {
  setStubFilter({ categoryId, categoryName });
  setActiveTab('stubs');
};
```

### Filtered Stubs

```tsx
// In StubsTab.tsx
const filteredStubs = useMemo(() => {
  if (!stubFilter?.categoryId) return stubs;
  return stubs.filter(stub => stub.categoryId === stubFilter.categoryId);
}, [stubs, stubFilter]);
```

---

## Empty States

### No Parent Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   PARENT CATEGORIES                                                         │
│   ─────────────────                                                         │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │              📁                                                     │   │
│   │                                                                     │   │
│   │         No parent categories yet                                    │   │
│   │                                                                     │   │
│   │    Create your first category to organize your content              │   │
│   │                                                                     │   │
│   │              [+ Add Category]                                       │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### No Subcategories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   SUBCATEGORIES                                                             │
│   ─────────────                                                             │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │              📂                                                     │   │
│   │                                                                     │   │
│   │         No subcategories yet                                        │   │
│   │                                                                     │   │
│   │    Use "Generate Subcategories" on a parent category above          │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### No Stubs (Filtered)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Filtering by: Morning Routines                          [✕ Clear Filter] │
│   ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │              📝                                                     │   │
│   │                                                                     │   │
│   │         No articles in "Morning Routines" yet                       │   │
│   │                                                                     │   │
│   │    Go back and use "Generate Stubs" to create content               │   │
│   │                                                                     │   │
│   │              [← Back to Categories]                                 │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Create `WorkspaceTabs.tsx` component
- [ ] Create `CategoriesTab.tsx` component
- [ ] Create `CategoryCard.tsx` component
- [ ] Refactor existing stub list into `StubsTab.tsx`
- [ ] Update `MainWorkspace.tsx` to use tabbed layout

### Phase 2: Category Cards
- [ ] Implement category card layout with image, title, description
- [ ] Add keywords and meta display
- [ ] Implement purple/violet color theme
- [ ] Add parent indicator for subcategories ("← Parent Name")

### Phase 3: Article Count & Navigation
- [ ] Calculate article count per category
- [ ] Implement "View Articles →" link
- [ ] Add filter state management
- [ ] Show filter bar on Stubs tab when filtered
- [ ] Implement "Clear Filter" functionality

### Phase 4: Actions
- [ ] Wire up Research button to existing research flow
- [ ] Wire up "Generate Subcategories" to `AddSubcategoryModal`
- [ ] Implement "Generate Stubs" flow for subcategories
- [ ] Add settings (⚙️) and delete (🗑️) actions

### Phase 5: Polish
- [ ] Add empty states for all scenarios
- [ ] Add loading states for research/generation
- [ ] Add success/error toasts
- [ ] Test deep-linking and filter persistence
- [ ] Responsive design for mobile

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `components/workspace/WorkspaceTabs.tsx` | Create | Tab bar component |
| `components/workspace/CategoriesTab.tsx` | Create | Categories tab content |
| `components/workspace/StubsTab.tsx` | Create | Refactored stubs list |
| `components/workspace/CategoryCard.tsx` | Create | Category card component |
| `pages/MainWorkspace.tsx` | Modify | Add tab state, render tabs |
| `styles/designTokens.ts` | Modify | Add category color tokens |
| `types.ts` | Modify | Add any new types if needed |

---

## Design Tokens to Add

```typescript
// In styles/designTokens.ts

export const categoryColors = {
  parent: {
    background: 'linear-gradient(135deg, #1a1625 0%, #12111a 100%)',
    border: 'rgba(168, 85, 247, 0.3)',
    borderHover: 'rgba(168, 85, 247, 0.5)',
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.1)',
  },
  subcategory: {
    background: 'linear-gradient(135deg, #161422 0%, #0f0e14 100%)',
    border: 'rgba(139, 92, 246, 0.25)',
    borderHover: 'rgba(139, 92, 246, 0.4)',
    accent: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.1)',
  },
};
```
