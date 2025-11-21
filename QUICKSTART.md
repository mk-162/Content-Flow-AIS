# Quick Start Guide - ContentFlow AI

Get your multi-tenant SaaS up and running in under 10 minutes.

## ⚡ Fast Track Setup

### Step 1: Install Dependencies (2 min)

```bash
npm install
```

### Step 2: Get Your API Keys (3 min)

#### Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

#### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it (e.g., "ContentFlow-Dev")
4. **Enable:**
   - Authentication → Email/Password
   - Firestore Database → Production mode
   - Storage → Default settings

5. Project Settings → Add Web App → Copy config values

### Step 3: Configure Environment (1 min)

Edit `.env.local`:

```env
VITE_GEMINI_API_KEY=paste_your_gemini_key_here

VITE_FIREBASE_API_KEY=paste_from_firebase
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 4: Deploy Security Rules (2 min)

```bash
# Install Firebase CLI (one time only)
npm install -g firebase-tools

# Login
firebase login

# Initialize (select: Firestore, Storage, use existing project)
firebase init

# Deploy rules
firebase deploy --only firestore:rules,storage
```

### Step 5: Start the App (1 min)

```bash
npm run dev
```

Visit `http://localhost:3000`

## 🎉 Your First Workflow

### 1. Sign Up
- Click "Sign up"
- Enter your email and password
- Create your account

### 2. Create Organization
- Name: "My Company"
- Click "Create"

### 3. Create Project
- Click "New Project"
- Name: "Blog Content"
- Click "Create Project"

### 4. Generate Content
- Click on your project
- Add a category (e.g., "Technology")
- Click "Generate Titles"
- Wait for AI to generate ideas
- Select a title → "Generate Content"
- Review in "Posts" tab

## 🚀 You're Done!

You now have a fully functional multi-tenant SaaS platform with:
- ✅ User authentication
- ✅ Organization management
- ✅ Project workspaces
- ✅ AI content generation
- ✅ Real-time updates
- ✅ Secure data isolation

## 📖 Next Steps

- Read `README.md` for full documentation
- Check `SETUP.md` for advanced configuration
- See `IMPLEMENTATION_STATUS.md` for roadmap
- Add team members (coming soon)
- Setup billing (coming soon)

## ⚠️ Common Issues

**"API Key not found"**
→ Make sure you have `VITE_GEMINI_API_KEY` in `.env.local`

**"Permission denied"**
→ Run `firebase deploy --only firestore:rules`

**Can't create organization**
→ Check Firebase Console for index creation links

**Page not loading**
→ Verify Firebase config is correct in `.env.local`

## 💡 Pro Tips

1. **Keep .env.local secret** - Never commit it to git
2. **Use dev/prod Firebase projects** - Separate for safety
3. **Monitor Firebase usage** - Free tier has limits
4. **Check Gemini quota** - Rate limited to 60 req/min

## 🆘 Need Help?

- Check browser console for errors
- Review Firebase Console for backend errors
- Read the full `README.md`
- Check `SETUP.md` for troubleshooting

---

**Time to first content:** < 10 minutes
**Cost:** $0 (using free tiers)
**Scalability:** Production-ready
