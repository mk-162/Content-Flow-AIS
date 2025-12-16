# MissionContent - Project Handover Document

**Date:** 2025-11-20
**Project:** MissionContent (AI-Powered Content Management System)
**Status:** Active Development
**Dev Server:** http://localhost:3001

---

## 📋 Project Overview

MissionContent is a multi-tenant SaaS platform for AI-powered content generation and management. Users can organize content into hierarchical categories, generate blog post titles and outlines using AI, and manage posts through a complete editorial workflow.

### Core Value Proposition
- **AI-Powered Content Generation**: Uses Google Gemini 2.5 Flash for title generation and content outlines
- **Multi-tenant Architecture**: Organizations → Projects → Categories → Posts
- **Editorial Workflow**: PENDING → GENERATING → NEEDS_REVIEW → APPROVED/REJECTED
- **Real-time Collaboration**: Firestore real-time listeners for live updates

---

## 🛠 Technology Stack

### Frontend
- **React 19.2** with TypeScript 5.8.2
- **Vite 6.4.1** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Framer Motion 12.23.24** - Animations (slide effects, transitions)
- **@uiw/react-md-editor** - WYSIWYG Markdown editor
- **Lucide React** - Icon library

### Backend/Services
- **Firebase 11.1.0**
  - Authentication (email/password)
  - Firestore (NoSQL database)
  - Real-time listeners for live updates
- **Google Gemini AI (gemini-2.5-flash)**
  - Title generation with structured JSON output
  - Content outline generation
  - Category suggestions

### Key Dependencies
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "firebase": "^11.1.0",
  "@google/genai": "^1.0.0",
  "framer-motion": "^12.23.24",
  "@uiw/react-md-editor": "^4.0.4",
  "tailwind-merge": "^2.6.0",
  "lucide-react": "^0.469.0"
}
```

---

## 🏗 Architecture

### Data Model Hierarchy

```
User (Auth)
└── Organization Membership
    └── Organization
        ├── System Prompts (custom AI prompts)
        ├── Settings (branding, limits)
        └── Projects
            ├── Project Members
            └── Categories (hierarchical)
                └── Posts
                    └── Generation Tasks
```

### Key Collections (Firestore)

**users** - User profiles and global roles
- `id`, `email`, `displayName`, `globalRole`, `createdAt`, `updatedAt`

**organizations** - Tenant containers
- `id`, `name`, `ownerId`, `subscriptionTier`, `settings`, `systemPrompts`

**organizationMembers** - Org membership
- `id` (format: `{orgId}_{userId}`), `organizationId`, `userId`, `role`

**projects** - Content projects within orgs
- `id`, `organizationId`, `name`, `description`, `createdBy`, `settings`

**categories** - Hierarchical content organization
- `id`, `projectId`, `organizationId`, `name`, `description`, `parentId`, `children[]`

**posts** - Content items
- `id`, `projectId`, `organizationId`, `categoryId`, `title`, `teaser`, `content`, `status`, `tags`, `metaKeywords`, `metaDescription`

**generationQueue** - AI generation tasks
- `id`, `type`, `organizationId`, `projectId`, `categoryId`, `status`, `progress`, `targetPostId`

**usage** - Billing/usage tracking
- `id`, `organizationId`, `projectId`, `userId`, `apiCalls`, `tokensUsed`, `cost`, `model`

---

## 📁 File Structure

```
C:\AI_Project\MissionContent\
├── src/
│   ├── components/
│   │   ├── CategoryWorkspace.tsx      # Categories page with tree view
│   │   ├── PostsWorkspace.tsx         # Posts page with WYSIWYG editor
│   │   ├── TopNav.tsx                 # App header with user menu
│   │   ├── OrganizationSelector.tsx   # Org switcher modal
│   │   └── ProtectedRoute.tsx         # Auth guard
│   ├── pages/
│   │   ├── MainWorkspace.tsx          # Main app container
│   │   ├── ProjectDashboard.tsx       # Project selection
│   │   ├── LoginPage.tsx              # Authentication
│   │   ├── SignUpPage.tsx             # User registration
│   │   └── ForgotPasswordPage.tsx     # Password reset
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Auth state management
│   │   ├── OrganizationContext.tsx    # Org state management
│   │   └── ProjectContext.tsx         # Project state management
│   ├── services/
│   │   └── geminiService.ts           # AI integration layer
│   ├── lib/
│   │   └── firebase.ts                # Firebase config
│   ├── types.ts                       # TypeScript definitions
│   ├── App.tsx                        # Root component
│   └── main.tsx                       # Entry point
├── public/
├── .env                               # Environment variables (not committed)
├── package.json
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
├── BUTTON_STATUS.md                   # Testing checklist
└── HANDOVER.md                        # This document
```

---

## ✨ Key Features Implemented

### 1. Categories Page (`CategoryWorkspace.tsx`)

**Visual Design:**
- Single unified color scheme (`#0F172A` base - dark slate)
- Progressive lightening by depth (17.5%, 32.5%, +10% per level)
- All text white for maximum readability
- 22×22px emerald-green circular badges for post counts

**Functionality:**
- Hierarchical category tree with accordion expand/collapse
- Resizable left panel (category tree) and right panel (titles table)
- Inline editing for category names and descriptions
- Real-time progress indicators for AI generation (spinner + progress bar)
- Add Category modal with two modes:
  - Manual: Simple name/description input
  - AI Search: Query-based category suggestions
- Title generation modal with slider (1-25 titles) and context field
- Bulk operations on titles (select, generate, delete)
- Slide-left animation when moving posts to queue (1.8s duration)
- Slide-right animation when deleting posts (red background, 1.8s)

**UX Improvements:**
- Single "+" button next to page title (removed duplicate buttons)
- Post count badges aligned far right
- Action icons (Sparkles, Plus) appear on hover
- Consistent spacing: `mb-4` for root categories, `mb-1` for subcategories
- Left indentation: `pl-8` at depth 1, `pl-16` at depth 2

### 2. Posts Page (`PostsWorkspace.tsx`)

**Visual Design:**
- Resizable column divider (same as Categories page)
- Post list with checkboxes for bulk selection
- Status color coding: emerald (approved), amber (review), cyan (queue), red (rejected)

**Functionality:**
- Expandable search icon in top-right (animates to full search bar)
- Bulk select with "Bulk Approve" button
- Post status reordering: Review → In Queue → Approved
- Slide-left animation on approve (1.8s, auto-advances to next review post)
- WYSIWYG Markdown editor (@uiw/react-md-editor)
  - Edit mode: Full toolbar, markdown editing
  - Preview mode: Rendered markdown (no syntax visible)
  - Dark theme integration
  - Fixed scrolling issues (no double scrollbars)
- Meta fields: keywords, description
- Real-time task progress indicators

**Status Labels:**
- Changed "Generating" to "In Queue" throughout
- Status badge on each post card
- Active task progress bars

### 3. AI Generation System (`geminiService.ts`)

**Title Generation:**
```typescript
generateCategoryTitles(categoryName, description, count, organizationId)
// Returns: Array of { title, teaser, keywords[] }
// Uses JSON schema response for structured output
// Includes fallback mock data on error
```

**Content Generation:**
```typescript
generatePostOutline(title, categoryName, teaser, tags, organizationId)
// Returns: Markdown-formatted outline
// Includes stripPreamble() to remove AI preambles
// Prompts AI to start directly with content
```

**Category Suggestions:**
```typescript
suggestCategories(query, parentCategoryName?)
// Returns: Array of { name, description, reason }
// Mode: Root (5 suggestions) or Subcategory (6 suggestions)
```

**Preamble Removal:**
```typescript
stripPreamble(content)
// Removes: "Here is...", "Here's...", "Certainly...", etc.
// Ensures clean output without conversational prefixes
```

### 4. Queue Processing System (`MainWorkspace.tsx`)

**Architecture:**
- Client-side queue processor (runs in browser)
- Processes one task at a time sequentially
- Real-time Firestore listeners for queue updates

**Task Flow:**
```
QUEUED → (processor picks up) → PROCESSING → (10-100% progress) → COMPLETED
```

**Task Types:**
1. **GENERATE_TITLES**: Creates multiple post stubs in PENDING status
2. **GENERATE_CONTENT**: Updates post with AI-generated content, sets to NEEDS_REVIEW

**Error Handling:**
- Tasks set to FAILED status on error
- Posts reset to PENDING if content generation fails
- Extensive console logging (`[Queue]`, `[Gemini]` prefixes)

### 5. Authentication & Multi-tenancy

**Auth Flow:**
```
Login/SignUp → AuthContext → Firebase Auth
→ Auto-create Organization (if none) → OrganizationContext
→ Auto-create Project (if none) → ProjectContext
→ MainWorkspace (Categories/Posts)
```

**Role System:**
- **Global Roles**: SYSTEM_ADMIN, ORG_OWNER, USER
- **Org Roles**: OWNER, ADMIN, MEMBER, VIEWER
- **Project Roles**: ADMIN, CONTENT_CREATOR, VIEWER

**Context Providers:**
- `AuthContext`: Current user, sign in/out/up
- `OrganizationContext`: Current org, org list, org switching
- `ProjectContext`: Current project, project list, project switching

---

## 🎨 Design System

### Colors

**Base Color System:**
- Base: `#0F172A` (dark slate/navy)
- Depth lightening: 17.5%, 32.5%, +10% per additional level
- All text: `text-white`

**Status Colors:**
- Approved: `text-emerald-500` / `bg-emerald-500`
- Review: `text-amber-500` / `bg-amber-500`
- In Queue: `text-cyan-500` / `bg-cyan-500`
- Rejected: `text-red-500` / `bg-red-500`
- Pending: `text-slate-500` / `bg-slate-500`

**UI Elements:**
- Primary action: `bg-cyan-600` hover `bg-cyan-500`
- Destructive: `bg-red-600` hover `bg-red-500`
- Success: `bg-emerald-600` hover `bg-emerald-500`
- Background: `bg-[#0f172a]`, `bg-[#020617]`
- Borders: `border-slate-800`, `border-slate-700`

### Typography
- Headings: `font-bold`, `tracking-tight`
- Labels: `text-xs font-bold uppercase tracking-widest`
- Body: `text-sm`, `text-slate-300`
- Monospace: `font-mono` for IDs, status, counts

### Spacing
- Main categories: `mb-4`
- Subcategories: `mb-1`
- Section padding: `p-6`
- Card padding: `p-4`
- Depth indentation: `pl-8` (depth 1), `pl-16` (depth 2)

### Animations (Framer Motion)
- Slide-left (approve): `x: -window.innerWidth`, `duration: 1.8s`, `ease: "easeInOut"`
- Slide-right (delete): `x: window.innerWidth`, `duration: 1.8s`, `ease: "easeInOut"`
- Modal entry: `y: 20`, `opacity: 0` → `y: 0`, `opacity: 1`
- Search expand: `width: 0` → `width: 200`

---

## 🔧 Configuration

### Environment Variables (.env)
```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Firebase Security Rules (Important!)
Currently using test mode - **MUST** implement proper security rules before production:

```javascript
// Example rules structure needed:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /organizations/{orgId} {
      allow read: if request.auth != null && isOrgMember(orgId);
      allow write: if request.auth != null && isOrgAdmin(orgId);
    }
    // ... more rules needed
  }
}
```

### Firestore Indexes
May need composite indexes for:
- `posts`: (`organizationId`, `projectId`, `status`)
- `categories`: (`projectId`, `parentId`)
- `generationQueue`: (`status`, `startedAt`)

---

## 🚀 Development Workflow

### Setup
```bash
cd "C:\AI_Project\MissionContent"
npm install
npm run dev  # Starts on http://localhost:3001
```

### Common Tasks

**Add new component:**
1. Create in `src/components/`
2. Import Lucide icons if needed
3. Use Tailwind for styling
4. Add TypeScript interfaces in `types.ts` if needed

**Add new Firestore collection:**
1. Define interface in `types.ts`
2. Add CRUD functions in relevant context or page
3. Set up real-time listener with `onSnapshot`
4. Update security rules (when implemented)

**Modify AI prompts:**
1. Edit functions in `services/geminiService.ts`
2. Adjust `responseSchema` for JSON responses
3. Test with various inputs
4. Update `stripPreamble()` if new preamble patterns appear

**Add new page:**
1. Create in `src/pages/`
2. Add route in `App.tsx`
3. Wrap with `<ProtectedRoute>` if auth required
4. Add to navigation if needed

### Git Workflow (Not yet initialized)
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

---

## ✅ Testing Status

All major functionality tested and working. See `BUTTON_STATUS.md` for detailed testing checklist.

**Summary:**
- 40+ buttons/interactions tested ✅
- All CRUD operations working ✅
- Real-time updates functioning ✅
- AI generation working ✅
- Animations smooth ✅

**Known Non-Issues (already fixed):**
- Favicon 404 (fixed with inline SVG)
- Timestamp conversion (using `.toDate()`)
- Undefined photoURL (excluded from user object)

---

## 🐛 Known Issues / TODOs

### High Priority
1. **Firebase Security Rules**: Currently in test mode - CRITICAL for production
2. **Error Boundaries**: Add React error boundaries for graceful failures
3. **Offline Support**: Handle network disconnections
4. **Rate Limiting**: Implement for AI API calls

### Medium Priority
1. **Settings Page**: User preferences, notifications (shows "Coming Soon")
2. **Project Settings**: Edit, archive, delete projects (shows "Coming Soon")
3. **Team Invitations**: Email-based invites (UI placeholder exists)
4. **Usage Analytics**: Display API usage and costs (UI placeholder exists)
5. **Admin Panel**: System prompt management for SYSTEM_ADMIN role

### Low Priority / Nice to Have
1. **Undo/Redo**: For content editing
2. **Keyboard Shortcuts**: Power user features
3. **Export**: Posts to various formats (PDF, DOCX, etc.)
4. **Image Upload**: For post content
5. **Rich Text Enhancements**: Tables, code blocks, embeds
6. **Dark/Light Theme Toggle**: Currently fixed dark theme
7. **Mobile Responsiveness**: Desktop-first design currently

### Performance Optimizations
1. **Virtualization**: For large post/category lists
2. **Lazy Loading**: Images and content
3. **Debouncing**: Search inputs and auto-save
4. **Memoization**: Heavy render components
5. **Code Splitting**: Route-based chunks

---

## 🔐 Security Considerations

### Current State (DEVELOPMENT ONLY)
- Firebase in test mode (all read/write allowed)
- API keys in `.env` (add to `.gitignore`)
- No CORS restrictions
- No rate limiting
- Client-side queue processing (exposed to tampering)

### Production Requirements
1. **Firestore Security Rules**: Role-based access control
2. **Cloud Functions**: Move queue processing to server-side
3. **API Key Management**: Use Cloud Functions to hide Gemini API key
4. **Rate Limiting**: Prevent abuse of AI endpoints
5. **Input Validation**: Sanitize all user inputs
6. **XSS Protection**: Ensure markdown rendering is safe
7. **HTTPS Only**: Enforce secure connections
8. **Audit Logging**: Track all data mutations

---

## 📊 Cost Considerations

### Gemini AI (Pay-as-you-go)
- **gemini-2.5-flash**: ~$0.001 per 1000 tokens
- Title generation: ~500-1000 tokens per request
- Content generation: ~2000-5000 tokens per request
- **Estimated**: $0.10-$0.50 per 100 posts generated

### Firebase (Spark/Blaze Plan)
- **Firestore**: $0.18/100K reads, $0.18/100K writes
- **Authentication**: Free up to 10K MAU (monthly active users)
- **Hosting**: Free tier likely sufficient for static assets
- **Cloud Functions**: $0.40/million invocations (if moved to backend)

### Usage Tracking
Already implemented in Firestore (`usage` collection):
- Captures: `organizationId`, `userId`, `apiCalls`, `tokensUsed`, `cost`, `model`
- Can be used for billing, quotas, analytics

---

## 📝 Code Patterns & Conventions

### State Management
```typescript
// Context pattern for global state
const [state, setState] = useState(initialValue);

// Real-time Firestore listener
useEffect(() => {
  const unsubscribe = onSnapshot(query, (snapshot) => {
    // Update state
  });
  return () => unsubscribe();
}, [dependencies]);
```

### Component Structure
```typescript
interface Props {
  // Props typed explicitly
}

export const ComponentName: React.FC<Props> = ({ props }) => {
  // 1. State hooks
  // 2. Effect hooks
  // 3. Handler functions
  // 4. Render helpers
  // 5. Return JSX
};
```

### Styling Patterns
```typescript
// Conditional classes with template literals
className={`
  base-classes
  ${condition ? 'true-classes' : 'false-classes'}
  ${dynamicValue && 'optional-classes'}
`}

// Inline styles for dynamic values
style={{ backgroundColor: getColorForDepth(depth) }}
```

### Error Handling
```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error("❌ [Context] Error:", error);
  // Don't throw - fail gracefully
}
```

### Console Logging
Use prefixed logs for easier debugging:
```typescript
console.log('[Queue] Processing task:', task);
console.log('[Gemini] Generated titles:', titles);
console.error('❌ [Auth] Sign in failed:', error);
```

---

## 🎯 Next Steps Recommendations

### Immediate (Week 1)
1. Implement Firebase security rules
2. Add comprehensive error boundaries
3. Set up proper Git repository
4. Create `.gitignore` (exclude `.env`, `node_modules`, `dist`)
5. Add loading states for all async operations

### Short-term (Month 1)
1. Move queue processing to Cloud Functions
2. Implement Settings page
3. Add Project settings management
4. Build Team Invitations system
5. Create Usage Analytics dashboard
6. Add input validation and sanitization

### Medium-term (Month 2-3)
1. Implement Advanced Admin Panel
2. Add export functionality
3. Build notification system
4. Optimize performance (virtualization, lazy loading)
5. Improve mobile responsiveness
6. Add comprehensive testing (Jest, React Testing Library)

### Long-term (Month 4+)
1. Multi-language support (i18n)
2. Advanced AI features (custom prompts, fine-tuning)
3. Integration with CMS platforms (WordPress, etc.)
4. SEO optimization tools
5. Analytics and reporting
6. White-label/custom branding for enterprise

---

## 📚 Useful Resources

### Documentation
- [React 19 Docs](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Google AI for Developers](https://ai.google.dev/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

### Key Files to Review
1. `types.ts` - Complete data model
2. `services/geminiService.ts` - AI integration
3. `components/CategoryWorkspace.tsx` - Main UI patterns
4. `contexts/AuthContext.tsx` - Auth patterns
5. `pages/MainWorkspace.tsx` - Queue processing

---

## 💬 Support & Questions

For clarification on:
- **Architecture decisions**: Review this document and code comments
- **Data models**: See `types.ts` and Firestore collection structure
- **AI prompts**: Check `services/geminiService.ts`
- **UI patterns**: Reference `CategoryWorkspace.tsx` and `PostsWorkspace.tsx`
- **Testing**: See `BUTTON_STATUS.md`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Next Review:** After implementing security rules

---

## Appendix A: Quick Command Reference

```bash
# Development
npm run dev              # Start dev server (port 3001)
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Firebase
firebase login           # Authenticate
firebase deploy          # Deploy (when configured)
firebase emulators:start # Local testing

# Testing
# (Not yet configured - recommend adding)
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## Appendix B: Environment Setup Checklist

- [ ] Node.js 20.18.0 installed
- [ ] Firebase project created
- [ ] Gemini API key obtained
- [ ] `.env` file created with all variables
- [ ] `npm install` completed successfully
- [ ] Dev server starts without errors
- [ ] Firebase Authentication enabled (email/password)
- [ ] Firestore database created
- [ ] Test user account created

---

*End of Handover Document*
