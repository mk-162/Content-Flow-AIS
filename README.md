# MissionContent - Multi-Tenant SaaS Platform

A production-ready, multi-tenant content generation platform powered by Google Gemini AI, Firebase, and React.

## 🚀 Features

### ✅ Currently Implemented

#### **Authentication & User Management**
- Email/password authentication
- User registration with validation
- Password reset functionality
- Role-based access control (System Admin, Org Owner, User)
- Protected routes

#### **Multi-Tenancy Architecture**
- Organization management (create, switch, manage)
- Project management within organizations
- Real-time data synchronization
- Tenant data isolation with Firestore security rules

#### **Content Generation**
- AI-powered blog title generation
- Content outline generation
- Category management with hierarchical structure
- Post management with status tracking
- Generation queue system

#### **User Interface**
- Modern, responsive design
- Dark theme with cyan accents
- Collapsible sidebar navigation
- Real-time notifications
- Project dashboard with statistics

### 🚧 Planned Features

- Cloud Functions for background processing
- System Admin panel for prompt management
- Email-based invitation system
- Usage tracking and analytics dashboard
- Stripe integration for billing
- Team collaboration features
- Content versioning
- Export functionality

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase account (free tier works)
- Google Gemini API key

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd "C:\AI_Project\MissionContent"
npm install
```

### 2. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the wizard
3. Enable these services:
   - **Authentication** → Sign-in method → Email/Password (Enable)
   - **Firestore Database** → Create database (Start in production mode)
   - **Cloud Storage** → Get started

### 3. Configure Firebase

1. In Firebase Console → Project Settings → General
2. Under "Your apps" → Click Web icon (</>)
3. Register app (name: "MissionContent")
4. Copy the configuration values

### 4. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Copy the key

### 5. Update Environment Variables

Edit `.env.local` and replace placeholder values:

```env
# Gemini AI
GEMINI_API_KEY=your_actual_gemini_api_key
VITE_GEMINI_API_KEY=your_actual_gemini_api_key

# Firebase Configuration (from step 3)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 6. Deploy Firestore Security Rules

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Firestore (rules and indexes)
# - Storage (rules)
# - Choose your existing project
# - Accept default files (firestore.rules, storage.rules)

# Deploy security rules
firebase deploy --only firestore:rules,storage
```

### 7. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🎯 First Steps After Installation

### 1. Create Your First Account

1. Navigate to `http://localhost:3000`
2. Click "Sign up"
3. Enter your details and create an account
4. You'll be redirected to the projects page

### 2. Create an Organization

1. When prompted, create your first organization
2. Give it a name (e.g., "My Company")
3. Click "Create"

### 3. Create a Project

1. On the projects dashboard, click "New Project"
2. Name your project (e.g., "Blog Content")
3. Add an optional description
4. Click "Create Project"

### 4. Start Generating Content

1. Click on your project to open it
2. Go to "Categories" tab
3. Add a category (e.g., "Technology")
4. Click "Generate Titles" to create post ideas
5. Review generated titles in the data table
6. Click "Generate Content" on any title
7. Switch to "Posts" tab to review generated outlines
8. Publish or reject content as needed

## 📁 Project Structure

```
MissionContent/
├── components/              # React components
│   ├── CategoryWorkspace.tsx   # Category management UI
│   ├── GenerationQueue.tsx     # Task queue visualization
│   ├── PostReview.tsx          # Post review interface
│   ├── PostsWorkspace.tsx      # Post management UI
│   ├── ProtectedRoute.tsx      # Route protection
│   ├── OrganizationSelector.tsx # Org switcher
│   └── TopNav.tsx              # Navigation bar
├── contexts/                # React Context providers
│   ├── AuthContext.tsx         # Authentication state
│   ├── OrganizationContext.tsx # Organization state
│   └── ProjectContext.tsx      # Project state
├── lib/                     # Utilities
│   ├── firebase.ts             # Firebase initialization
│   └── firestore-utils.ts      # Firestore helpers
├── pages/                   # Page components
│   ├── LoginPage.tsx
│   ├── SignUpPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ProjectDashboard.tsx
│   └── MainWorkspace.tsx       # Main content workspace
├── services/                # API services
│   └── geminiService.ts        # Gemini AI integration
├── App.tsx                  # Root component with routing
├── types.ts                 # TypeScript definitions
├── firestore.rules          # Database security rules
├── storage.rules            # Storage security rules
├── .env.local              # Environment variables
└── vite.config.ts          # Vite configuration
```

## 🔐 User Roles & Permissions

### Global Roles

| Role | Permissions |
|------|------------|
| **SYSTEM_ADMIN** | Full system access, manage all organizations, control system prompts |
| **ORG_OWNER** | Manage their organization, create projects, invite users |
| **USER** | Standard user access |

### Organization Roles

| Role | Permissions |
|------|------------|
| **OWNER** | Full organization control, billing, delete org |
| **ADMIN** | Manage projects and members (cannot delete org) |
| **MEMBER** | Access organization projects |
| **VIEWER** | Read-only access |

### Project Roles

| Role | Permissions |
|------|------------|
| **ADMIN** | Manage project settings and members |
| **CONTENT_CREATOR** | Create/edit content, generate AI content |
| **VIEWER** | Read-only project access |

## 🔒 Security

### Firestore Security Rules

All data access is secured via Firestore security rules:
- Users can only access organizations they're members of
- Project data is isolated by tenant
- System admins have override access
- Audit logs are immutable

### Data Isolation

- Each organization's data is completely isolated
- Projects are scoped to organizations
- Cross-tenant data access is blocked by security rules
- Real-time listeners are automatically filtered

## 🚀 Deployment

### Firebase Hosting (Recommended)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Build production bundle
npm run build

# Initialize hosting (if not done)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

Your app will be live at `https://your-project.firebaseapp.com`

### Other Platforms

The app is a standard React SPA and can be deployed to:
- Vercel
- Netlify
- AWS Amplify
- GitHub Pages

Just run `npm run build` and deploy the `dist/` folder.

## 🐛 Troubleshooting

### "API Key not found" Error

**Solution:** Make sure `.env.local` has both:
```env
GEMINI_API_KEY=your_key
VITE_GEMINI_API_KEY=your_key
```

### "Permission Denied" in Firestore

**Solution:** Deploy security rules:
```bash
firebase deploy --only firestore:rules
```

### Can't Create Organization/Project

**Solution:** Check Firebase Console → Firestore for errors. May need to create composite indexes (Firebase will provide URLs).

### Real-time Updates Not Working

**Solution:**
1. Check browser console for errors
2. Verify Firestore is enabled in Firebase Console
3. Check security rules are deployed

### Generation Queue Stuck

**Solution:**
1. Check browser console for API errors
2. Verify Gemini API key is valid
3. Check API quota in Google AI Studio
4. Refresh the page to restart queue processor

## 📊 Usage Limits (Free Tier)

### Firebase Free Tier
- 50,000 document reads/day
- 20,000 document writes/day
- 1GB storage
- 10GB bandwidth/month

### Gemini API Free Tier
- 60 requests/minute
- 1,500 requests/day
- Check current limits at [Google AI Studio](https://aistudio.google.com/app/apikey)

## 🔄 What's Next

### Phase 5: Cloud Functions (Recommended Next)

Move the generation queue to Cloud Functions for:
- Better scalability
- Background processing
- Server-side API calls
- Automatic retries

See `IMPLEMENTATION_STATUS.md` for detailed next steps.

### Phase 6: Admin Panel

Build system admin interface for:
- Managing system prompts
- Organization monitoring
- Usage analytics

### Phase 7: Invitations

Implement email-based user invitations.

## 📚 Documentation

- `SETUP.md` - Detailed setup guide
- `IMPLEMENTATION_STATUS.md` - Feature implementation tracking
- `firestore.rules` - Database security rules
- `storage.rules` - File storage security rules

## 🤝 Contributing

This is a private project. For issues or questions, refer to the documentation files above.

## 📄 License

Proprietary - All rights reserved

---

**Built with:**
- React 19.2
- TypeScript 5.8
- Firebase 11.0
- Google Gemini AI
- Vite 6.2
- Tailwind CSS
- Framer Motion

**Last Updated:** 2025
