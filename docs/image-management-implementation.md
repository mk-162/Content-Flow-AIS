# Image Management System - MissionContent Implementation Plan

**Project**: MissionContent (AI Content Generation Platform)
**Date**: December 17, 2025
**Status**: IMPLEMENTED

---

## Executive Summary

Transform the existing basic image storage into a production-grade image management system with:
- Multi-format variants (WebP + JPEG) at multiple sizes
- Firebase Hosting CDN with custom subdomain
- User upload capability
- 30-day soft delete lifecycle
- Preview generation mode

---

## Current State Analysis

### What Works Today
| Component | Location | Status |
|-----------|----------|--------|
| Gemini 2.0 Flash generation | `services/imageGenerationService.ts` | Working |
| Image generation function | `functions/src/index.ts:generateImageWithGemini` | Working |
| Image processing | `functions/src/index.ts:processImage` | Working |
| ImageAsset records | Firestore subcollection | Working |
| Credit deduction | `services/creditService.ts` | Working |
| UI controls | `components/ImageInspectorControl.tsx` | Partial |

### Current Flow
```
User → ImageInspectorControl → imageGenerationService.generateImage()
  → Firebase Function: generateImageWithGemini (Gemini 2.0 Flash)
  → Returns base64
  → Cloud Function: processImage()
  → Creates variants (WebP/JPEG, small/large)
  → Firebase Storage: organizations/{orgId}/projects/{projectId}/
  → Firestore: imageAssets/{id}
  → URL returned (CDN-ready with variants)
```

### Implementation Status
1. ✅ **Variants** - WebP + JPEG at small (600px) and large (1400px) sizes
2. ✅ **CDN** - serveImage function with caching headers
3. ⏳ **Uploads** - Service created, UI pending
4. ✅ **Lifecycle** - Soft delete with 30-day recovery
5. ✅ **Preview** - Free preview generation, pay to save
6. ✅ **Gemini 2.0 Flash** - Replaced OpenAI DALL-E (Dec 2025)

---

## Architecture Design

### New Storage Structure
```
organizations/{orgId}/projects/{projectId}/
├── originals/
│   └── {imageId}.{ext}           # Full quality source
├── web/
│   ├── small/
│   │   ├── {imageId}.webp        # 600px, WebP (85%)
│   │   └── {imageId}.jpg         # 600px, JPEG (90%)
│   └── large/
│       ├── {imageId}.webp        # 1400px, WebP (85%)
│       └── {imageId}.jpg         # 1400px, JPEG (90%)
└── uploads/
    └── {imageId}.{ext}           # User uploads (processed same as AI)

temp/{sessionId}/                  # Preview images
└── {imageId}.webp                # Auto-deleted after 24hrs
```

### CDN URL Structure
```
Custom domain: images.yourdomain.com

Production images:
https://images.yourdomain.com/{orgId}/{projectId}/web/small/{imageId}.webp
https://images.yourdomain.com/{orgId}/{projectId}/web/large/{imageId}.jpg

Temporary previews:
https://images.yourdomain.com/temp/{sessionId}/{imageId}.webp
```

---

## Enhanced ImageAsset Schema

**File**: `types.ts` (lines 556-568)

```typescript
export interface ImageAsset {
  id: string;
  organizationId: string;
  projectId: string;
  createdAt: Timestamp;
  createdBy: string;
  type: 'generated' | 'uploaded';
  costInCredits: number;

  // EXISTING (modified)
  url: string;                    // Primary URL (small WebP for display)
  path: string;                   // Primary path

  // NEW: Multiple variants
  variants: {
    original: {
      url: string;
      path: string;
      width: number;
      height: number;
      size: number;               // bytes
    };
    small: {
      webp: string;               // CDN URL
      jpeg: string;
    };
    large: {
      webp: string;
      jpeg: string;
    };
  };

  // NEW: Metadata
  prompt?: string;
  altText?: string;
  originalDimensions: { width: number; height: number };
  originalSize: number;           // bytes
  processingTimeMs?: number;

  // NEW: Lifecycle
  status: 'active' | 'deleted' | 'pending_deletion';
  deletedAt?: Timestamp;
  deletedBy?: string;
  scheduledDeletionAt?: Timestamp;
  replacedBy?: string;            // ID of replacement image
}
```

---

## Deployed Cloud Functions

| Function | Purpose | Memory | Timeout |
|----------|---------|--------|---------|
| `generateImageWithGemini` | Generate images using Gemini 2.0 Flash | 1GB | 120s |
| `processImage` | Process images with multiple variants | 1GB | 120s |
| `savePreviewImage` | Save temporary preview images | 512MB | 60s |
| `promotePreviewImage` | Promote preview to permanent | 1GB | 120s |
| `serveImage` | CDN proxy for images | 256MB | 30s |
| `cleanupDeletedImages` | Daily cleanup of expired images | Default | Default |
| `saveGeneratedImage` | Legacy function (backward compat) | 512MB | 60s |

---

## Files Created/Modified

| File | Action | Changes |
|------|--------|---------|
| `types.ts` | Modified | Add lifecycle fields to ImageAsset |
| `functions/src/index.ts` | Modified | Add processImage, cleanupDeletedImages, savePreviewImage, serveImage |
| `functions/package.json` | Modified | Add sharp, uuid dependencies |
| `services/imageGenerationService.ts` | Modified | Use new processImage, add preview methods |
| `services/imageUploadService.ts` | Created | New user upload service |
| `services/imageService.ts` | Created | New CRUD with lifecycle |
| `components/ImageInspectorControl.tsx` | Modified | Enable upload, add soft delete/restore |
| `firebase.json` | Modified | Add CDN hosting config |
| `.firebaserc` | Modified | Add images hosting target |
| `storage.rules` | Modified | Add temp folder rules |
| `public-images/` | Created | CDN hosting folder |

---

## Credit Costs

| Action | Credits | Rationale |
|--------|---------|-----------|
| AI Generation | 5 | Gemini 2.0 Flash API + processing |
| User Upload | 1 | Processing + storage |
| Preview Generation | 0 | Free until saved |
| Save Preview | 5 | Same as regular generation |

---

## Testing Checklist

- [ ] Generate image → all 5 variants created
- [ ] CDN URLs return correct cache headers
- [ ] Upload 10MB file → processed successfully
- [ ] Upload 11MB file → rejected with error
- [ ] Delete image → status changes, files remain
- [ ] Restore deleted image → accessible again
- [ ] Wait 30+ days → cleanup job removes files
- [ ] Generate preview → no credits charged
- [ ] Save preview → credits charged, asset created
- [ ] Abandon preview → auto-deleted after 24hrs

---

## Remaining Setup Steps

1. **Create Firebase Hosting site for images**:
   ```bash
   firebase hosting:sites:create postbuilder-afefc-images
   ```

2. **Configure GCS lifecycle policy** for temp folder (via Google Cloud Console):
   - Navigate to Cloud Storage > postbuilder-afefc.appspot.com
   - Add lifecycle rule: Delete objects with prefix `temp/` after 1 day

3. **Set up custom domain** (optional):
   - Add DNS record for `images.yourdomain.com`
   - Configure in Firebase Hosting console

---

## Rollback Plan

If issues arise:
1. Cloud Functions can be rolled back via `firebase functions:delete` + redeploy previous version
2. New Firestore fields are additive (no breaking changes)
3. Old image URLs continue working (backward compatible)
4. CDN can be disabled by removing firebase.json hosting config
