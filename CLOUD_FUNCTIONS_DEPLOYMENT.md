# Cloud Functions Deployment Guide

## ✅ What's Been Completed

All Cloud Functions have been created and are ready to deploy:

### 1. **processGenerationQueue** (Firestore Trigger)
- **Trigger:** onCreate event on `generationQueue` collection
- **Purpose:** Processes title and content generation tasks server-side
- **Benefits:**
  - Scalable (handles multiple concurrent tasks)
  - Reliable (guaranteed execution)
  - Secure (API keys hidden server-side)
  - No browser dependency (runs even if user closes tab)

### 2. **onUserCreate** (Auth Trigger)
- **Trigger:** onCreate event on Firebase Auth users
- **Purpose:** Auto-creates user documents in Firestore
- **Future:** Can send welcome emails

### 3. **sendInvitation** (HTTP Callable)
- **Purpose:** Sends organization/project invitations
- **Security:** Role-based access control
- **Future:** Can send email invitations via SendGrid

---

## 🚨 Deployment Blocker: Firebase Plan Upgrade Required

**Current Plan:** Spark (Free)
**Required Plan:** Blaze (Pay-as-you-go)

### Why Blaze Plan is Required:
- Cloud Functions require external API calls (Google Gemini)
- Artifact Registry API needed for function deployment
- Cloud Build API needed for building functions

### Cost Estimate (Blaze Plan):
**Free tier includes:**
- 2 million function invocations/month
- 400,000 GB-seconds compute time/month
- 200,000 CPU-seconds/month

**Estimated costs for this app:**
- Cloud Functions: ~$0 - $5/month (within free tier for moderate usage)
- Gemini API: ~$0.10 - $0.50 per 100 posts generated
- Firestore: ~$0 (within free tier)

**Total estimated: $0 - $10/month for moderate usage**

---

## 📋 Deployment Steps

### Step 1: Upgrade to Blaze Plan

1. Visit: https://console.firebase.google.com/project/postbuilder-afefc/usage/details
2. Click "Upgrade Project"
3. Add payment method (credit card required)
4. Select "Blaze - Pay as you go"

**Note:** You'll only be charged for usage beyond the free tier.

### Step 2: Deploy Functions

```bash
cd "C:\AI_Project\MissionContent"
firebase deploy --only functions
```

Expected output:
```
✔  functions: Finished running predeploy script.
i  functions: preparing codebase default for deployment
i  functions: ensuring required APIs are enabled...
✔  functions: all APIs enabled
i  functions: uploading functions...
✔  functions[processGenerationQueue(us-central1)]: Successful create operation
✔  functions[onUserCreate(us-central1)]: Successful create operation
✔  functions[sendInvitation(us-central1)]: Successful create operation

✔  Deploy complete!
```

### Step 3: Verify Deployment

1. Visit Firebase Console → Functions
2. You should see 3 deployed functions:
   - `processGenerationQueue`
   - `onUserCreate`
   - `sendInvitation`

3. Check logs:
```bash
firebase functions:log
```

### Step 4: Test the Queue

1. In your app, create a new category
2. Click "Generate Titles"
3. Watch the Cloud Functions logs:
```bash
firebase functions:log --only processGenerationQueue
```

You should see:
```
[Queue] Processing task abc123 of type Generate Titles
[Queue] Starting title generation for category xyz789
[Queue] Generated 5 titles
[Queue] ✅ Task abc123 completed successfully
```

---

## 🔄 How It Works (After Deployment)

### Current System (Client-Side Queue):
```
User clicks "Generate" → Browser processes task → Calls Gemini API → Saves to Firestore
```
**Issues:**
- Unreliable (if user closes browser, task fails)
- Not scalable (one task at a time per browser)
- API key exposed in client

### New System (Cloud Functions):
```
User clicks "Generate" → Creates task in Firestore → Cloud Function automatically triggers → Processes in cloud → Saves results
```
**Benefits:**
- ✅ Reliable (guaranteed processing)
- ✅ Scalable (100+ concurrent tasks)
- ✅ Secure (API keys server-side)
- ✅ Fast (parallel processing)

---

## 🧹 After Deployment: Clean Up Client Code

Once Cloud Functions are deployed and tested, you can remove the client-side queue processor from `pages/MainWorkspace.tsx` (lines 165-296).

**Replace with:**
```typescript
// Queue processing now handled by Cloud Functions
// Tasks are automatically processed when created in Firestore
```

This will:
- Remove duplicate processing
- Reduce client bundle size
- Simplify codebase

---

## 🛠 Troubleshooting

### Problem: "Permission denied" when deploying
**Solution:** Run `firebase login` and authenticate

### Problem: Functions not triggering
**Solution:**
1. Check Firebase Console → Functions → Logs
2. Verify Gemini API key is set:
   ```bash
   firebase functions:config:get
   ```
3. Check Firestore rules allow function writes

### Problem: "API key not configured" error
**Solution:** Set the key:
```bash
firebase functions:config:set gemini.api_key="YOUR_KEY"
firebase deploy --only functions
```

### Problem: Functions timing out
**Solution:** Increase timeout in `functions/src/index.ts`:
```typescript
export const processGenerationQueue = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .firestore.document('generationQueue/{taskId}')
  .onCreate(async (snapshot, context) => {
    // ... function code
  });
```

---

## 📊 Monitoring & Alerts

### View Logs
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only processGenerationQueue

# Real-time logs
firebase functions:log --follow
```

### Setup Alerts (Optional)
1. Go to Firebase Console → Functions
2. Click on a function → Metrics
3. Click "Create Alert"
4. Configure:
   - Metric: Error rate
   - Condition: > 5% errors
   - Notification: Your email

---

## 🚀 Next Steps After Deployment

1. **Remove client-side queue processor** from MainWorkspace.tsx
2. **Test thoroughly:**
   - Generate titles
   - Generate content
   - Create new users
   - Send invitations (when email is configured)

3. **Setup email delivery:**
   - Install SendGrid extension: https://extensions.dev/extensions/firebase/firestore-send-email
   - OR configure SendGrid API in functions

4. **Monitor costs:**
   - Check Firebase Console → Usage & Billing
   - Set budget alerts

---

## 📝 File Structure

```
functions/
├── src/
│   └── index.ts          # All Cloud Functions
├── lib/                  # Compiled JavaScript (auto-generated)
├── .env                  # Environment variables (future migration)
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── .gitignore           # Git ignore rules
```

---

**Status:** ✅ Code Complete | 🚨 Awaiting Blaze Plan Upgrade
**Estimated Deploy Time:** 2-5 minutes
**Estimated Cost:** $0-10/month
