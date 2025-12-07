# Simplified Architecture: Content Flow AIS + Astro

## Overview

Single platform for content generation, editing, and publishing. No WordPress.

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTENT FLOW AIS                            │
│                   (React + Firebase)                            │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Generate │ → │  Edit    │ → │  Review  │ → │  Approve │  │
│  │ (Gemini) │    │(MDEditor)│    │ (Human)  │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘  │
│                                                       │        │
└───────────────────────────────────────────────────────┼────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │ Export Markdown │
                                              │ (with frontmatter)│
                                              └────────┬────────┘
                                                       │
                         ┌─────────────────────────────┼─────────────────────────────┐
                         │                             │                             │
                         ▼                             ▼                             ▼
              ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
              │ Option A:       │         │ Option B:       │         │ Option C:       │
              │ Firebase Storage│         │ GitHub Repo     │         │ AWS S3          │
              │ (Simplest)      │         │ (Git workflow)  │         │ (Most control)  │
              └────────┬────────┘         └────────┬────────┘         └────────┬────────┘
                       │                           │                           │
                       └───────────────────────────┼───────────────────────────┘
                                                   │
                                                   ▼
                                         ┌─────────────────┐
                                         │   Astro Build   │
                                         │ (Static Site Gen)│
                                         └────────┬────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  Static Site    │
                                         │ (Firebase/Vercel│
                                         │  /Cloudflare)   │
                                         └─────────────────┘
```

## Storage Options Comparison

| Feature | Firebase Storage | GitHub Repo | AWS S3 |
|---------|-----------------|-------------|--------|
| Setup complexity | Low | Medium | High |
| Cost | Free tier generous | Free | ~$1/mo |
| Version control | Manual | Built-in (Git) | S3 versioning |
| Astro integration | Custom loader | Native support | Custom loader |
| CI/CD trigger | Cloud Function | GitHub Actions | Lambda/EventBridge |
| Best for | MVP/Simple | Teams, OSS | Enterprise |

## Recommended: Firebase Storage (Option A)

Since you're already on Firebase, this keeps everything in one ecosystem.

### Flow
1. User approves post in Content Flow AIS
2. Cloud Function triggers on Firestore write
3. Function generates markdown with frontmatter
4. Saves to Firebase Storage: `/sites/{projectId}/content/{category}/{slug}.md`
5. Triggers Astro rebuild (webhook or scheduled)
6. Astro fetches markdown from Firebase Storage
7. Builds static HTML
8. Deploys to Firebase Hosting

### Markdown Output Format

```markdown
---
title: "Your Blog Post Title"
slug: "your-blog-post-title"
date: 2025-01-24
author: "Editor Name"
category: "Web Development"
tags: ["React", "JavaScript", "Tutorial"]
excerpt: "A brief description for SEO and previews..."
status: "published"
featuredImage: "/images/post-slug.jpg"
---

# Your Blog Post Title

Your markdown content here...
```

## Implementation Plan

### Phase 1: Markdown Export Service (2-3 hours)
- Create `exportService.ts` with frontmatter generation
- Add "Export" button for approved posts
- Test markdown output format

### Phase 2: Firebase Storage Integration (2-3 hours)
- Set up Firebase Storage bucket structure
- Upload markdown on approval
- Add Cloud Function for automatic export

### Phase 3: Astro Site Setup (3-4 hours)
- Create Astro project with blog template
- Build custom content loader for Firebase Storage
- Configure routes and layouts

### Phase 4: Build Pipeline (2-3 hours)
- Set up build trigger (webhook/scheduled)
- Deploy to Firebase Hosting
- Add cache invalidation

## Code Changes Needed

### 1. New Export Service
```typescript
// services/exportService.ts
export const generateMarkdownWithFrontmatter = (post: Post, category: Category): string => {
  const frontmatter = {
    title: post.title,
    slug: generateSlug(post.title),
    date: post.approvedAt?.toDate().toISOString().split('T')[0],
    author: post.editor || 'Content Team',
    category: category.name,
    tags: post.tags || [],
    excerpt: post.teaser || post.metaDescription || '',
    status: 'published',
  };

  return `---
${Object.entries(frontmatter)
  .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
  .join('\n')}
---

${post.content}`;
};
```

### 2. Update Approval Flow
When post is approved:
1. Generate markdown
2. Upload to Firebase Storage
3. Trigger rebuild (optional: batch rebuilds)

### 3. Astro Content Loader
```typescript
// In Astro project: src/content/config.ts
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    excerpt: z.string(),
  }),
});
```

## Questions to Decide

1. **Build frequency**: On every approval? Hourly batch? Daily?
2. **Preview capability**: Do editors need to preview before publishing?
3. **Multi-site**: One Astro site per project, or one site with all content?
4. **Custom domains**: Each client gets their own domain?
5. **Theme customization**: Same theme for all, or customizable per project?

## Cost Estimate (Firebase-based)

| Service | Monthly Cost |
|---------|-------------|
| Firestore | ~$1 (existing) |
| Firebase Storage | ~$0.50 (markdown is tiny) |
| Firebase Hosting | Free tier (10GB/mo) |
| Cloud Functions | ~$0 (free tier covers it) |
| **Total** | **~$2/month** |

vs WordPress: $5-30/month per site

## Benefits of This Approach

1. **Single platform** - No context switching between apps
2. **Content ownership** - Markdown is portable, not locked in
3. **Performance** - Static sites are fastest possible
4. **Cost** - Near-zero hosting costs
5. **SEO** - Static HTML is perfect for search engines
6. **Security** - No server-side code to hack
7. **Scalability** - CDN handles any traffic spike
