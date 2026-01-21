# UX Unification Plan: Feed & Category Sections

## Overview
Unify the user experience between the Feed section and Category Content Area section to create a consistent, professional interface.

**Principle**: Use Feed section as the template (more mature UX) and bring Category section into alignment.

---

## Phase 1: Shared Components

### 1.1 Create Shared Header Component
**File**: `components/shared/WorkspaceHeader.tsx`

Extract common header elements into a reusable component:

```tsx
interface WorkspaceHeaderProps {
  // Category filter
  categories: Category[];
  posts?: Post[];
  selectedCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;

  // Sort
  sortOption: 'date' | 'name' | 'category';
  onSortChange: (sort: 'date' | 'name' | 'category') => void;
  sortOptions?: Array<{ value: string; label: string; icon: ReactNode }>;

  // Primary action
  primaryAction?: {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    count?: number;
  };

  // Optional secondary elements
  children?: ReactNode;
}
```

**Implementation**:
- Reuse `CategoryDropdown` from ProgressHeader.tsx
- Reuse search toggle/input pattern from ProgressHeader.tsx
- Standardize styling: `px-4 py-3`, `border-b`, `bg-[#111118]`

### 1.2 Create Shared Breadcrumb Component
**File**: `components/shared/CategoryBreadcrumb.tsx`

```tsx
interface CategoryBreadcrumbProps {
  breadcrumb: string[];
  variant?: 'pill' | 'inline';  // pill = Feed style, inline = minimal
  color?: 'cyan' | 'purple';    // Allow theming
  size?: 'sm' | 'md';
}
```

**Standardize on**:
- Pill style with rounded-full wrapper
- ChevronRight size: 10px
- Default color: cyan (primary brand color)

### 1.3 Refactor FeaturedImageEditor ✅ DONE
**File**: `components/feed/FeaturedImageEditor.tsx`

**COMPLETED**: Updated to match CategoryCard UX pattern:
- Click "Generate" → Dropdown appears with prompt + Generate/Cancel buttons
- Prompt NOT visible by default (cleaner UI)
- Hover on existing image shows small icon buttons in bottom-right corner
- Consistent with CategoryCard image editor behavior

---

## Phase 2: Header Unification

### 2.1 Update WorkspaceTabs.tsx
Transform from simple tab bar to full header with controls.

**Before**:
```
[Categories] [Briefs]                    [Add Category]
```

**After**:
```
[Categories] [Briefs]  | [Category ▼] [🔍] [Sort ▼]  [Add Category]
```

**Changes**:
1. Add CategoryDropdown (filter by parent category)
2. Add search input toggle
3. Add sort dropdown (A-Z, Date Created, Article Count)
4. Keep "Add Category" button but style as cyan gradient when active

### 2.2 Add State Management
**File**: `components/workspace/TabbedCategoryWorkspace.tsx`

Add new state:
```tsx
const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
const [searchQuery, setSearchQuery] = useState('');
const [sortOption, setSortOption] = useState<'name' | 'date' | 'articles'>('name');
```

Pass to both CategoriesTab and BriefsTab.

### 2.3 Update CategoriesTab.tsx
Add filtering and sorting logic:

```tsx
// Filter categories
const filteredCategories = useMemo(() => {
  let result = categories;

  // Category filter (show only selected parent + its children)
  if (categoryFilter) {
    result = result.filter(c =>
      c.id === categoryFilter || c.parentId === categoryFilter
    );
  }

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query)
    );
  }

  // Sort
  result = [...result].sort((a, b) => {
    switch (sortOption) {
      case 'name': return a.name.localeCompare(b.name);
      case 'date': return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      case 'articles': return getArticleCount(b.id) - getArticleCount(a.id);
      default: return 0;
    }
  });

  return result;
}, [categories, categoryFilter, searchQuery, sortOption]);
```

---

## Phase 3: Card Styling Unification

### 3.1 Update CategoryCard Base Styling
**File**: `components/workspace/CategoryCard.tsx`

**Change from**:
```tsx
className="border border-zinc-800/50 bg-zinc-900/50"
```

**To**:
```tsx
import { feedCard } from '../../styles/designTokens';
// ...
className={feedCard.base}  // 'bg-[#111118] border border-[#27272a]'
```

### 3.2 Unify Breadcrumb in CategoryCard
Replace current breadcrumb implementation with shared component or match Feed style:

**Change from**:
```tsx
<div className="flex items-center gap-1 text-xs">
  {categoryBreadcrumb.map((crumb, idx) => (
    <React.Fragment key={idx}>
      {idx > 0 && <ChevronRight size={12} className="text-purple-400/50" />}
      <span className={...}>{crumb}</span>
    </React.Fragment>
  ))}
</div>
```

**To**:
```tsx
<div
  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
  style={{
    backgroundColor: 'rgba(168, 85, 247, 0.15)',  // Keep purple for categories
    color: '#a855f7'
  }}
>
  {categoryBreadcrumb.map((crumb, idx) => (
    <React.Fragment key={idx}>
      {idx > 0 && <ChevronRight size={10} className="opacity-50" />}
      <span>{crumb}</span>
    </React.Fragment>
  ))}
</div>
```

### 3.3 Unify Keywords Styling
Keep color differentiation (cyan for posts, purple for categories) but ensure same structure:

```tsx
// Both should use this pattern:
<div className="flex flex-wrap gap-1.5">
  {keywords.map((kw, idx) => (
    <span
      key={idx}
      className={`px-2 py-1 text-xs rounded border ${colorClasses}`}
    >
      {kw}
    </span>
  ))}
</div>
```

---

## Phase 4: Layout Unification

### 4.1 Add Max-Width Container to CategoriesTab
**File**: `components/workspace/CategoriesTab.tsx`

**Change from**:
```tsx
<div className="flex-1 overflow-y-auto p-6 space-y-6">
```

**To**:
```tsx
<div className="flex-1 overflow-y-auto px-4 py-4">
  <div className="max-w-4xl mx-auto space-y-4">
```

### 4.2 Unify Card Spacing
Change `space-y-6` to `space-y-4` for consistency with Feed.

### 4.3 Unify Subcategory Indentation
Keep the nested layout but adjust spacing to match Feed's visual rhythm:
- `ml-6 pl-4` stays for hierarchy indication
- Border line styling stays

---

## Phase 5: Design Token Consolidation

### 5.1 Add Category-Specific Tokens
**File**: `styles/designTokens.ts`

```tsx
export const workspaceHeader = {
  container: 'flex items-center justify-between px-4 py-3 border-b border-[#27272a] bg-[#111118]',
  dropdown: 'flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 hover:border-slate-600',
  searchInput: 'pl-9 pr-8 py-1.5 bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors',
  primaryButton: 'flex items-center gap-1.5 px-4 py-2 rounded bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-medium transition-all shadow-lg shadow-cyan-500/20',
};

export const breadcrumb = {
  pill: 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
  pillCyan: 'bg-cyan-500/15 text-cyan-400',
  pillPurple: 'bg-purple-500/15 text-purple-400',
  chevron: 'opacity-50',
};
```

---

## Implementation Order

### Step 1: Create Shared Components (Low Risk)
- [ ] Create `CategoryBreadcrumb` component
- [ ] Move/refactor `FeaturedImageEditor` to shared location
- [ ] Create `WorkspaceHeader` component shell

### Step 2: Update Category Cards (Medium Risk)
- [ ] Switch CategoryCard to use `feedCard.base`
- [ ] Update breadcrumb styling to pill format
- [ ] Ensure consistent ChevronRight sizing

### Step 3: Update Layout (Medium Risk)
- [ ] Add `max-w-4xl` container to CategoriesTab
- [ ] Update padding to `px-4 py-4`
- [ ] Update spacing to `space-y-4`

### Step 4: Add Header Controls (Higher Risk)
- [ ] Add state to TabbedCategoryWorkspace
- [ ] Update WorkspaceTabs with filter/search/sort
- [ ] Wire up filtering in CategoriesTab
- [ ] Wire up filtering in BriefsTab

### Step 5: Testing & Polish
- [ ] Test all filtering combinations
- [ ] Test responsive behavior
- [ ] Verify no regressions in Feed section

---

## Files to Modify

| File | Changes |
|------|---------|
| `components/shared/CategoryBreadcrumb.tsx` | **NEW** - Shared breadcrumb component |
| `components/shared/WorkspaceHeader.tsx` | **NEW** - Shared header component |
| `components/workspace/WorkspaceTabs.tsx` | Add filter/search/sort controls |
| `components/workspace/TabbedCategoryWorkspace.tsx` | Add filter state management |
| `components/workspace/CategoriesTab.tsx` | Add filtering, update layout |
| `components/workspace/CategoryCard.tsx` | Update styling to match Feed |
| `styles/designTokens.ts` | Add new shared tokens |

---

## Visual Mockup

### Category Section Header (After)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Categories] [Briefs]   [All Categories ▼] [🔍] [A-Z ▼]   [+ Add Category] │
└─────────────────────────────────────────────────────────────────────────┘
```

### Category Card (After)
```
┌──────────────────────────────────────────────────────────────┐
│ [PARENT]  (Home Services > Plumbing)  [✓Research]  │ [Edit] [🗑] │
├──────────────────────────────────────────────────────────────┤
│ Left Column (flex-1)        │ Right Column (w-80)            │
│ - Title                     │ - Category Image               │
│ - 12 articles generated     │   (aspect-video, editable)     │
│ - Description               │ - Keywords                     │
│ - [Research] [+Subcats]     │   (purple pill tags)           │
└──────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

1. [ ] Category section header has same controls as Feed header
2. [ ] Cards use identical base styling (`feedCard.base`)
3. [ ] Breadcrumbs use pill format in both sections
4. [ ] Layout uses `max-w-4xl` centered container
5. [ ] Spacing is `space-y-4` in both sections
6. [ ] All design tokens are used consistently
7. [ ] No visual regressions in Feed section
