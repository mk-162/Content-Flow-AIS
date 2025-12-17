# Deployment Integration Guide

This guide explains how to configure MissionContent projects for CloudFlare/Terraform deployment.

---

## Overview

MissionContent now includes an admin panel for managing deployment configuration. This allows you to:

- Link projects to themes in the astromssn repository
- Store CloudFlare deploy hook URLs
- Configure custom domains
- Trigger site rebuilds from the admin panel

---

## Accessing the Admin Panel

1. **Login** with your admin account at the MissionContent app
2. Click your **user avatar** in the top-right corner
3. Select **"Admin Panel"** from the dropdown
4. In the admin sidebar, click **"Deployments"** (rocket icon)

**Direct URL:** `/admin/deployments`

---

## The Deployments Page

The deployments page shows all projects across all organizations:

| Column | Description |
|--------|-------------|
| **Project** | Project name and organization it belongs to |
| **Theme** | Theme folder name from astromssn repo (e.g., "default", "ribble") |
| **Domain** | Custom domain for the published site (clickable link) |
| **Last Build** | Timestamp of the last webhook trigger |
| **Status** | "Ready" if webhook configured, "Setup Required" if not |
| **Actions** | Build button (if configured) and Configure button |

### Filtering

- **All** - Show all projects
- **Configured** - Only projects with webhook URL set
- **Not Configured** - Projects needing setup
- **Search** - Filter by project name, org name, domain, or theme

---

## Configuring a Project

1. Click **"Configure"** button on any project row
2. The configuration modal shows:

### Terraform Reference IDs

These are auto-populated and can be copied with one click:

```
org_id:  org_1764948670876_011qk03tg    [Copy]
proj_id: proj_1734567890123_abc123def   [Copy]
```

Use these values in your Terraform configuration:

```hcl
org_id  = "org_1764948670876_011qk03tg"
proj_id = "proj_1734567890123_abc123def"
```

### Configuration Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Theme** | Folder name in astromssn repo's `themes/` directory | `default`, `ribble`, `thisworks` |
| **Custom Domain** | The published site domain (set up via Terraform/CloudFlare) | `ribble.mssnhst.com` |
| **CloudFlare Deploy Hook URL** | Webhook URL from CloudFlare Pages | See below |

### Getting the CloudFlare Deploy Hook URL

1. Go to **CloudFlare Dashboard** → **Pages**
2. Select the project
3. Go to **Settings** → **Builds & deployments**
4. Scroll to **Deploy hooks**
5. Click **"Add deploy hook"**
6. Name it (e.g., "MissionContent Trigger")
7. Copy the generated URL (format: `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/{hook-id}`)
8. Paste into the **CloudFlare Deploy Hook URL** field in MissionContent

### Testing & Saving

- **Test Webhook** - Verifies the URL is valid (note: this triggers an actual build)
- **Trigger Build** - Manually trigger a site rebuild
- **Save Configuration** - Save all fields to the project

---

## Triggering Builds

### From Admin Panel

1. Go to `/admin/deployments`
2. Find the project (must have webhook configured)
3. Click **"Build"** button
4. Success/error message appears

### What Happens

1. MissionContent POSTs to the CloudFlare webhook URL
2. CloudFlare Pages triggers a rebuild
3. The build pulls content from Firebase using `org_id` and `proj_id`
4. Site is rebuilt with the configured theme
5. Published to the custom domain

---

## Data Flow

```
┌─────────────────────┐
│  MissionContent     │
│  (Admin Panel)      │
└──────────┬──────────┘
           │ POST webhook
           ▼
┌─────────────────────┐
│  CloudFlare Pages   │
│  Deploy Hook        │
└──────────┬──────────┘
           │ Triggers build
           ▼
┌─────────────────────┐
│  astromssn Repo     │
│  (Astro + Theme)    │
└──────────┬──────────┘
           │ Fetches content
           ▼
┌─────────────────────┐
│  Firebase           │
│  (org_id, proj_id)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Published Site     │
│  (custom domain)    │
└─────────────────────┘
```

---

## Terraform Configuration Reference

Your Terraform config should use these values from MissionContent:

```hcl
# From MissionContent Admin → Deployments → Configure → Reference IDs
org_id       = "org_1764948670876_011qk03tg"
proj_id      = "proj_1734567890123_abc123def"

# From MissionContent Admin → Deployments → Configure → Theme field
theme        = "ribble"

# Derived from domain (the subdomain part)
project_name = "mssn-ribble"

# From MissionContent Admin → Deployments → Configure → Custom Domain field
custom_domain = "ribble.mssnhst.com"

# Your DNS configuration
dns_zone     = "mssnhst.com"
dns_record   = "ribble"
```

---

## Firestore Data Structure

Deployment config is stored in the project document:

**Collection:** `projects`
**Document:** `{projectId}`

```javascript
{
  id: "proj_1734567890123_abc123def",
  organizationId: "org_1764948670876_011qk03tg",
  name: "Ribble Blog",
  // ... other project fields ...
  settings: {
    // ... other settings ...
    deployment: {
      theme: "ribble",
      webhookUrl: "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...",
      customDomain: "ribble.mssnhst.com",
      lastBuildTriggeredAt: Timestamp,
      lastBuildTriggeredBy: "user_abc123"  // userId who triggered
    }
  }
}
```

---

## Workflow: Setting Up a New Client Site

1. **Create Organization & Project** in MissionContent
   - Client creates account or admin creates for them
   - Set up project with categories and content

2. **Create Theme** in astromssn repo (if custom)
   - Copy existing theme folder (e.g., `themes/default`)
   - Customize Header.astro, Footer.astro, Welcome.astro
   - Update global.css with client branding
   - Commit and push to repo

3. **Run Terraform** to provision infrastructure
   - Use org_id and proj_id from MissionContent
   - Terraform creates CloudFlare Pages project
   - Terraform sets up DNS for custom domain
   - Manually create deploy hook in CloudFlare (for now)

4. **Configure Deployment** in MissionContent Admin
   - Go to Admin → Deployments
   - Find the project, click Configure
   - Enter: theme name, custom domain, webhook URL
   - Save configuration

5. **Trigger Initial Build**
   - Click "Build" button
   - Verify site deploys correctly

6. **Ongoing**
   - Content creators add/edit content in MissionContent
   - When ready to publish, admin triggers build
   - (Future: auto-trigger on content publish)

---

## Troubleshooting

### "Setup Required" status
- Project has no webhook URL configured
- Click Configure and add the CloudFlare deploy hook URL

### "Invalid CloudFlare webhook URL format" warning
- URL should contain `api.cloudflare.com` and `deploy_hooks`
- Check you copied the full URL from CloudFlare

### Build fails silently
- Check CloudFlare Pages dashboard for build logs
- Verify org_id and proj_id are correct
- Ensure theme folder exists in astromssn repo

### Webhook returns error
- 401/403: Check CloudFlare permissions
- 404: Deploy hook may have been deleted
- 500: CloudFlare service issue

---

## Security Notes

- Only SYSTEM_ADMIN users can access the Deployments page
- Webhook URLs are sensitive - don't share or log them publicly
- Build triggers are logged with userId and timestamp

---

## Files Added/Modified

**New Files:**
- `services/deploymentService.ts` - Webhook trigger and config functions
- `pages/admin/AdminDeployments.tsx` - Admin page UI
- `components/admin/DeploymentConfigModal.tsx` - Configuration modal

**Modified Files:**
- `types.ts` - Added `deployment` to Project.settings
- `pages/admin/AdminDashboard.tsx` - Added nav item
- `pages/admin/index.ts` - Added export
- `App.tsx` - Added route

**Branch:** `feature/deployment-integration`
