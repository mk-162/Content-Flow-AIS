# Testing Features & URL Variables Guide

This document contains all testing features, URL parameters, and debug tools available for development and QA testing.

---

## Base URL

```
http://localhost:3001
```

**IMPORTANT:** All URL parameters below must be used on the correct route (e.g., `/onboarding`, `/login`), NOT on the root `/`.

---

## URL Parameters for Testing

| Route | Parameter | Values | Description |
|-------|-----------|--------|-------------|
| `/onboarding` | `?demo=true` | `true` | Auto-triggers demo mode without needing a real URL |
| `/onboarding` | `?url=<website>` | Any URL | Pre-fills the website URL input field |
| `/onboarding` | `?step=<step>` | See below | Jump directly to any onboarding step |
| `/onboarding` | `?mode=<mode>` | `existing`, `project` | Controls onboarding workflow mode |
| `/login` | `?returnTo=<path>` | Any path | Redirect destination after login |

---

## Step Parameter Values

Use `?step=` on the `/onboarding` route to jump directly to any step:

```
?step=url_input                 # Initial website URL entry
?step=analyzing                 # Analysis in progress
?step=profile_review            # Review business profile
?step=channel_recommendations   # Channel recommendations
?step=account_creation          # Account creation
?step=workspace_intro           # Workspace introduction
```

---

## Full Example URLs for Testing

### Demo Mode (No Real URL Needed)
```
http://localhost:3001/onboarding?demo=true
```
Automatically generates test data without requiring a real website.

### Jump to Specific Step with Demo Data
```
http://localhost:3001/onboarding?demo=true&step=profile_review
http://localhost:3001/onboarding?demo=true&step=channel_recommendations
```

### Pre-fill URL for Analysis
```
http://localhost:3001/onboarding?url=https://example.com
```

### Existing User Mode (Skip Account Creation)
```
http://localhost:3001/onboarding?mode=existing
```

### Project Creation Mode
```
http://localhost:3001/onboarding?mode=project
```

### Login with Redirect
```
http://localhost:3001/login?returnTo=/dashboard
```

### Combined Examples
```
# Full test flow - demo mode jumping to recommendations
http://localhost:3001/onboarding?demo=true&step=channel_recommendations

# Pre-filled URL with existing user mode
http://localhost:3001/onboarding?url=https://example.com&mode=existing
```

### WRONG (Will Not Work)
```
http://localhost:3001/?step=url_input          # WRONG - missing /onboarding
http://localhost:3001/?demo=true               # WRONG - missing /onboarding
```

---

## Research Refresh / Rescan Feature

The **ResearchRefreshModal** component provides website rescan functionality:

- **Location:** `components/ResearchRefreshModal.tsx`
- **Function:** Re-analyzes website with updated research context
- **Features:**
  - Additional Research Context textarea for extra business information
  - Progress tracking with stage names and percentage
  - Updates `lastRefreshedAt` timestamp in Firestore
  - Preserves existing research ID while merging new profile data

### Research Modes
- **Shallow Research:** AI-estimated keywords (FREE/STARTER tiers)
- **Deep Research:** Real data from DataForSEO (PROFESSIONAL/ENTERPRISE)
- **Research TTL:** 7-day stale data detection with `isResearchStale()` function

---

## Console Log Prefixes for Debugging

Monitor these prefixes in browser console during testing:

| Prefix | Description |
|--------|-------------|
| `[Dev]` | Development-specific operations |
| `[Cache]` | Caching operations |
| `[Firestore]` | Database operations |
| `[Gemini]` | AI service calls |
| `[WebsiteAnalysis]` | Website analysis progress |
| `[Research]` | Research operations |
| `[Onboarding]` | Onboarding flow progress |

---

## Caching Layers (for Performance Testing)

Three caching layers are implemented:

1. **Firestore Offline Persistence** - IndexedDB cache (70-80% read reduction)
2. **Admin Config Cache** - 1-hour TTL
3. **Organization Settings Cache** - 30-minute TTL per org

Look for console message: `"Firestore offline persistence enabled - 70-80% read reduction!"`

---

## Error Handling & Retry Logic

- **Retry Attempts:** 3 attempts with exponential backoff
- **Delay Range:** 1-30 seconds between retries
- **Timeout:** 30-60 seconds on API calls
- **Retryable Errors:** 503, 429, timeout, UNAVAILABLE

---

## Related Documentation

- `CACHING_TEST_GUIDE.md` - 8 comprehensive caching test procedures
- `BUTTON_TEST_REPORT.md` - Button functionality testing checklist
- `BUTTON_STATUS.md` - 40+ button/interaction testing status
- `HANDOVER.md` - Project testing checklist

---

## Key Source Files

| Feature | File Location |
|---------|---------------|
| URL Parameters (demo, url) | `components/onboarding/URLInputStep.tsx` |
| Step Navigation | `pages/OnboardingFlow.tsx` |
| Login Redirect | `pages/LoginPage.tsx` |
| Research Refresh | `components/ResearchRefreshModal.tsx` |
| Website Analysis | `services/websiteAnalysisService.ts` |
| Research Service | `services/researchService.ts` |

---

## Quick Reference

**Most commonly used for testing:**

```bash
# Quick demo test
http://localhost:3001/onboarding?demo=true

# Test specific step
http://localhost:3001/onboarding?demo=true&step=profile_review

# Force rescan: Use the Research Refresh modal in the UI
```
