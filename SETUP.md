# ContentFlow AI - Multi-Tenant SaaS Setup Guide

This guide will help you transform your AI Studio project into a production-ready multi-tenant SaaS application.

## 📋 What's Been Implemented

### Phase 1: Core Infrastructure (✅ Complete)
- [x] Firebase configuration and dependencies
- [x] Multi-tenant database schema (Firestore)
- [x] TypeScript types for all data models
- [x] Firestore security rules
- [x] Firebase Storage security rules

### Phase 2: Authentication & Authorization (✅ Complete)
- [x] Firebase Authentication setup
- [x] Auth Context Provider
- [x] Login page with email/password
- [x] Sign up page with validation
- [x] Forgot password page
- [x] Protected routes component
- [x] Role-based access control (SYSTEM_ADMIN, ORG_OWNER, USER)

### Phase 3: Multi-Tenancy (✅ Complete)
- [x] Organization Context Provider
- [x] Project Context Provider
- [x] Organization selector modal
- [x] Top navigation with org/project switcher
- [x] Project dashboard with stats
- [x] Create organizations and projects

### Phase 4: Pending Implementation
- [ ] Migrate CategoryWorkspace to Firestore
- [ ] Migrate PostsWorkspace to Firestore
- [ ] Update geminiService for system prompts
- [ ] Move generation queue to Cloud Functions
- [ ] System Admin panel
- [ ] Invitation system with emails
- [ ] Usage tracking and analytics

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `firebase@^11.0.2` - Firebase SDK
- `react-router-dom@^7.1.1` - Routing
- Plus all existing dependencies

### 2. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Follow the setup wizard
4. Enable these services:
   - **Authentication** (Email/Password provider)
   - **Firestore Database** (Production mode)
   - **Cloud Storage** (Production mode)
   - **Cloud Functions** (Later for serverless backend)

### 3. Get Firebase Configuration

1. In Firebase Console, go to Project Settings
2. Under "Your apps", click the web icon (</>)
3. Register your app
4. Copy the configuration object

### 4. Update Environment Variables

Open `.env.local` and replace the placeholder values:

```env
GEMINI_API_KEY=your_actual_gemini_api_key

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 5. Deploy Firestore Security Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Firestore (database rules and indexes)
# - Storage (storage rules)

# Deploy rules
firebase deploy --only firestore:rules,storage
```

### 6. Create Firestore Indexes

Some queries require composite indexes. Firebase will prompt you with URLs to create them when you first run queries that need them, or you can create them manually in the Firebase Console.

Required indexes:
- `organizationMembers`: [userId, organizationId]
- `projectMembers`: [userId, projectId]
- `generationQueue`: [organizationId, status, createdAt]

### 7. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
Content Flow AIS/
├── components/           # React components
│   ├── CategoryWorkspace.tsx
│   ├── GenerationQueue.tsx
│   ├── PostReview.tsx
│   ├── PostsWorkspace.tsx
│   ├── ProtectedRoute.tsx
│   ├── OrganizationSelector.tsx
│   └── TopNav.tsx
├── contexts/            # React Context providers
│   ├── AuthContext.tsx
│   ├── OrganizationContext.tsx
│   └── ProjectContext.tsx
├── lib/                 # Utilities and config
│   ├── firebase.ts
│   └── firestore-utils.ts
├── pages/               # Page components
│   ├── LoginPage.tsx
│   ├── SignUpPage.tsx
│   ├── ForgotPasswordPage.tsx
│   └── ProjectDashboard.tsx
├── services/            # API services
│   └── geminiService.ts
├── App.tsx              # Main app component
├── types.ts             # TypeScript definitions
├── firestore.rules      # Firestore security rules
└── storage.rules        # Storage security rules
```

## 🔐 User Roles & Permissions

### Global Roles
- **SYSTEM_ADMIN**: Full system access, manage all orgs and prompts
- **ORG_OWNER**: Manage their organization
- **USER**: Standard user access

### Organization Roles
- **OWNER**: Full organization control
- **ADMIN**: Manage projects and members
- **MEMBER**: Access organization projects
- **VIEWER**: Read-only access

### Project Roles
- **ADMIN**: Manage project and members
- **CONTENT_CREATOR**: Create/edit content
- **VIEWER**: Read-only access

## 🎯 Next Steps

### Immediate Priorities

1. **Update Main App.tsx**
   - Integrate React Router
   - Add context providers
   - Setup route structure

2. **Migrate Existing Components**
   - Update CategoryWorkspace to use Firestore
   - Update PostsWorkspace to use Firestore
   - Update geminiService to fetch system prompts

3. **Build Cloud Functions**
   - Create functions for generation queue
   - Email invitation system
   - Usage tracking

4. **System Admin Panel**
   - Prompt management interface
   - Organization monitoring
   - User management

### Future Enhancements

- [ ] Stripe integration for payments
- [ ] Email notifications (SendGrid/Firebase Extensions)
- [ ] Advanced analytics dashboard
- [ ] API rate limiting
- [ ] Webhook system for integrations
- [ ] Team collaboration features
- [ ] Content versioning
- [ ] Export functionality (ZIP, CSV)

## 🐛 Troubleshooting

### Firebase Connection Issues
- Verify all environment variables are set correctly
- Check Firebase project settings
- Ensure Authentication and Firestore are enabled

### Security Rules Errors
- Deploy rules: `firebase deploy --only firestore:rules`
- Check rules in Firebase Console
- Verify user authentication status

### Missing Indexes
- Click the provided Firebase Console link in error messages
- Or create indexes manually in Firestore Console

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Router Documentation](https://reactrouter.com/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

## 🤝 Support

For issues or questions:
1. Check this SETUP.md guide
2. Review Firebase Console for errors
3. Check browser console for client-side errors
4. Review Firestore security rules

## 📝 License

This project is part of ContentFlow AI platform.
