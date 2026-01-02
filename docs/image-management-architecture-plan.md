# Image Management System - Final Architecture Plan

**Project**: AI Content Generation App - Image Storage & CDN
**Date**: December 17, 2025
**Version**: 1.0 Final

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technical Specifications](#technical-specifications)
4. [Image Processing Pipeline](#image-processing-pipeline)
5. [Lifecycle Management](#lifecycle-management)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Firebase Hosting Configuration](#firebase-hosting-configuration)
9. [Implementation Prompts](#implementation-prompts)
10. [Cost Estimates](#cost-estimates)
11. [Timeline & Milestones](#timeline--milestones)
12. [Testing Strategy](#testing-strategy)
13. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Executive Summary

### What We're Building
A scalable, cost-effective image management system for AI-generated and user-uploaded content using Google Cloud Storage with Firebase Hosting as a global CDN layer.

### Key Features
- ✅ Automatic multi-format generation (WebP + JPEG)
- ✅ Two optimized sizes (600px, 1400px)
- ✅ Firebase Hosting CDN with custom domain
- ✅ User upload capability with optional moderation
- ✅ Preview/temporary generation mode
- ✅ 30-day grace period for deletions
- ✅ Automatic cleanup and lifecycle management

### Benefits
- 🚀 **Performance**: Global CDN with automatic SSL
- 💰 **Cost-Effective**: No fixed monthly fees, generous free tier
- 🔒 **Safe**: 30-day grace period for deletions
- 🎨 **Flexible**: Supports both AI-generated and user uploads
- 📊 **Clean**: Automatic orphan cleanup

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER REQUEST                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Custom Domain (images.yourapp.com)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Firebase Hosting (CDN)                    │
│              • Auto SSL                                     │
│              • Global Cache                                 │
│              • Content Negotiation                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                Google Cloud Storage Bucket                  │
│                                                             │
│  /{project_id}/                                            │
│    ├── originals/                                          │
│    │   └── {image_id}.{ext}                               │
│    ├── user_uploads/                                       │
│    │   └── {image_id}.{ext}                               │
│    └── web/                                                │
│        ├── small/                                          │
│        │   ├── {image_id}.webp                            │
│        │   └── {image_id}.jpg                             │
│        └── large/                                          │
│            ├── {image_id}.webp                            │
│            └── {image_id}.jpg                             │
│                                                             │
│  /temp/{session_id}/                                       │
│    └── {image_id}.{ext}  (24hr auto-delete)               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐
│ Image Upload │
└──────┬───────┘
       │
       ▼
┌────────────────────┐
│ Image Processing   │
│ • Validate         │
│ • Generate 2 sizes │
│ • WebP + JPEG      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Upload to GCS      │
│ • /originals/      │
│ • /web/small/      │
│ • /web/large/      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Save to Database   │
│ • Firebase URLs    │
│ • Metadata         │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Return URLs        │
│ via Firebase CDN   │
└────────────────────┘
```

---

## Technical Specifications

### Image Sizes

| Size   | Width  | Use Case                    | Format        |
|--------|--------|-----------------------------|---------------|
| Small  | 600px  | Categories, Mobile banners  | WebP + JPEG   |
| Large  | 1400px | Desktop banners, Hero images| WebP + JPEG   |

**Aspect Ratio**: Maintained from original
**Quality**: WebP 85, JPEG 90
**Metadata**: Stripped (EXIF removed)

### Storage Organization

```
Production Images:
/{project_id}/
  ├── originals/{image_id}.{ext}
  ├── user_uploads/{image_id}.{ext}
  └── web/
      ├── small/{image_id}.{webp|jpg}
      └── large/{image_id}.{webp|jpg}

Temporary Images (Preview):
/temp/{session_id}/{image_id}.{ext}
  → Auto-deleted after 24 hours
```

### URL Structure

```
Base URL: https://images.yourapp.com

AI Generated Images:
https://images.yourapp.com/{project_id}/web/small/{image_id}.webp
https://images.yourapp.com/{project_id}/web/large/{image_id}.jpg

User Uploaded Images:
https://images.yourapp.com/{project_id}/user_uploads/{image_id}.webp

Original Images:
https://images.yourapp.com/{project_id}/originals/{image_id}.png

Temporary Preview:
https://images.yourapp.com/temp/{session_id}/{image_id}.webp
```

### Supported Input Formats
- JPEG / JPG
- PNG
- WebP
- GIF (first frame extracted)

### File Size Limits
- **User Uploads**: 10 MB maximum
- **AI Generated**: No limit (system generated)

---

## Image Processing Pipeline

### Processing Steps

```python
def process_image(file, project_id, source='ai_generated'):
    """
    Synchronous image processing pipeline
    Returns: dict with all URLs and metadata
    """
    
    # 1. Validation
    validate_format(file)  # Check if supported format
    validate_size(file)    # Check if within limits
    
    # 2. Generate unique ID
    image_id = generate_uuid()
    
    # 3. Store original
    original_path = f"{project_id}/originals/{image_id}.{ext}"
    upload_to_gcs(file, original_path)
    
    # 4. Generate variants (parallel processing if possible)
    variants = {
        'small': generate_variant(file, width=600),
        'large': generate_variant(file, width=1400)
    }
    
    # 5. Convert to WebP and JPEG
    for size, image in variants.items():
        webp = convert_to_webp(image, quality=85)
        jpeg = convert_to_jpeg(image, quality=90)
        
        upload_to_gcs(webp, f"{project_id}/web/{size}/{image_id}.webp")
        upload_to_gcs(jpeg, f"{project_id}/web/{size}/{image_id}.jpg")
    
    # 6. Build response with Firebase URLs
    return {
        'image_id': image_id,
        'project_id': project_id,
        'source': source,
        'original_url': build_firebase_url(original_path),
        'variants': {
            'small': {
                'webp': build_firebase_url(f"{project_id}/web/small/{image_id}.webp"),
                'jpeg': build_firebase_url(f"{project_id}/web/small/{image_id}.jpg")
            },
            'large': {
                'webp': build_firebase_url(f"{project_id}/web/large/{image_id}.webp"),
                'jpeg': build_firebase_url(f"{project_id}/web/large/{image_id}.jpg")
            }
        },
        'metadata': {
            'original_size': file.size,
            'dimensions': get_dimensions(file),
            'processing_time_ms': elapsed_time
        }
    }
```

### Processing Time Estimates
- Small image (< 1MB): ~500-800ms
- Medium image (1-5MB): ~1-2 seconds
- Large image (5-10MB): ~2-4 seconds

---

## Lifecycle Management

### 1. Image Creation

#### AI Generated Images
```
POST /api/images/generate
→ Process image
→ Store in /{project_id}/originals/ and /web/
→ Add to database with source='ai_generated'
→ Return Firebase URLs
```

#### User Uploaded Images
```
POST /api/images/upload-custom
→ Validate (format, size, optional moderation)
→ Process image
→ Store in /{project_id}/user_uploads/
→ Add to database with source='user_upload'
→ Return Firebase URLs
```

#### Preview/Temporary Images
```
POST /api/images/generate-preview
→ Process image
→ Store in /temp/{session_id}/
→ DO NOT add to database
→ Return Firebase URLs
→ GCS lifecycle policy auto-deletes after 24 hours

Optional:
POST /api/images/save-preview/{image_id}
→ Move from /temp/ to /{project_id}/
→ Add to database
→ Mark as permanent
```

### 2. Image Replacement

```
User generates new image to replace old one:

1. Create new image (standard process)
2. Soft delete old image:
   - Set is_deleted=true
   - Set deleted_at=NOW()
   - Set replaced_by=new_image_id
3. Old image remains in GCS (grace period)
4. User can undo within 30 days
5. After 30 days: automated cleanup deletes old image
```

### 3. Project/User Deletion

```
┌─────────────────────┐
│  User Deletes       │
│  Project            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  IMMEDIATE (< 1 minute)                     │
│  • Mark all images: is_deleted=true         │
│  • Set deleted_at=NOW()                     │
│  • Set deletion_scheduled_for=NOW()+30days  │
│  • Remove from user-facing queries          │
│  • Show "Project deleted" confirmation      │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  GRACE PERIOD (30 days)                     │
│  • Images still in GCS (can restore)        │
│  • Database records retained                │
│  • Restoration available:                   │
│    POST /api/projects/{id}/restore          │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  DAY 25 - EMAIL REMINDER                    │
│  "Your project will be permanently          │
│   deleted in 5 days"                        │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  DAY 30 - AUTOMATED CLEANUP                 │
│  • Scheduled job runs daily at 2 AM UTC     │
│  • Delete entire /{project_id}/ from GCS    │
│  • Hard delete from database OR             │
│    archive to BigQuery                      │
│  • Log deletion for compliance              │
│  • Send confirmation email                  │
└─────────────────────────────────────────────┘
```

### 4. Error Handling - 404 Detection

```
Prevention (Primary):
→ Atomic operations: delete database + GCS together
→ Use database triggers/hooks for consistency

Detection (Backup):
→ On image retrieval: validate GCS file exists
→ If 404: mark as is_deleted=true in database
→ Log for investigation

Periodic Validation:
→ Weekly job: check all active images exist in GCS
→ Mark missing images as deleted
→ Alert if unexpected deletions found
```

---

## API Endpoints

### Image Management

#### 1. Generate AI Image (Permanent)
```http
POST /api/images/generate
Content-Type: multipart/form-data

Parameters:
- image: file (required)
- project_id: string (required)

Response:
{
  "image_id": "550e8400-e29b-41d4-a716-446655440000",
  "project_id": "proj_123",
  "source": "ai_generated",
  "original_url": "https://images.yourapp.com/proj_123/originals/550e8400.png",
  "variants": {
    "small": {
      "webp": "https://images.yourapp.com/proj_123/web/small/550e8400.webp",
      "jpeg": "https://images.yourapp.com/proj_123/web/small/550e8400.jpg"
    },
    "large": {
      "webp": "https://images.yourapp.com/proj_123/web/large/550e8400.webp",
      "jpeg": "https://images.yourapp.com/proj_123/web/large/550e8400.jpg"
    }
  },
  "metadata": {
    "original_size": 2048576,
    "dimensions": {"width": 2048, "height": 1536},
    "processing_time_ms": 1250
  },
  "created_at": "2025-12-17T10:30:00Z"
}
```

#### 2. Upload Custom Image
```http
POST /api/images/upload-custom
Content-Type: multipart/form-data

Parameters:
- image: file (required, max 10MB)
- project_id: string (required)

Response: (same format as generate)
{
  "image_id": "...",
  "source": "user_upload",
  "uploaded_by": "user_456",
  "moderation_status": "approved",
  ...
}

Error Responses:
- 413: File too large (>10MB)
- 415: Unsupported format
- 429: Quota exceeded
- 422: Failed moderation check
```

#### 3. Generate Preview (Temporary)
```http
POST /api/images/generate-preview
Content-Type: multipart/form-data

Parameters:
- image: file (required)
- session_id: string (required)

Response:
{
  "image_id": "...",
  "session_id": "sess_789",
  "is_temporary": true,
  "expires_at": "2025-12-18T10:30:00Z",
  "variants": {
    "small": { "webp": "https://images.yourapp.com/temp/sess_789/...", ... },
    "large": { ... }
  }
}

Note: Not saved to database, auto-deleted after 24 hours
```

#### 4. Save Preview (Promote to Permanent)
```http
POST /api/images/save-preview/{image_id}

Parameters:
- image_id: string (from preview response)
- project_id: string (destination project)

Response:
{
  "image_id": "...",
  "moved_from": "/temp/sess_789/",
  "moved_to": "/proj_123/originals/",
  "is_temporary": false,
  ...
}
```

#### 5. Replace Image
```http
PUT /api/images/{image_id}/replace
Content-Type: multipart/form-data

Parameters:
- image: file (new image)

Response:
{
  "old_image_id": "550e8400-...",
  "new_image_id": "660f9500-...",
  "old_image_status": "soft_deleted",
  "old_image_recoverable_until": "2026-01-16T10:30:00Z",
  "new_image": { ... full image object ... }
}
```

#### 6. Get Image Details
```http
GET /api/images/{image_id}

Response:
{
  "image_id": "...",
  "project_id": "...",
  "source": "ai_generated",
  "is_deleted": false,
  "variants": { ... },
  "created_at": "...",
  "updated_at": "..."
}

Error Responses:
- 404: Image not found or deleted
  {
    "error": "Image not found",
    "image_id": "...",
    "is_deleted": true,
    "deleted_at": "2025-12-10T10:30:00Z"
  }
```

#### 7. List Project Images
```http
GET /api/projects/{project_id}/images
Query Parameters:
- source: 'ai_generated' | 'user_upload' | 'all' (default: all)
- include_deleted: boolean (default: false)
- page: number (default: 1)
- limit: number (default: 50)

Response:
{
  "project_id": "proj_123",
  "images": [ ... array of image objects ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

### Project Management

#### 8. Delete Project
```http
DELETE /api/projects/{project_id}

Response:
{
  "project_id": "proj_123",
  "status": "soft_deleted",
  "deleted_at": "2025-12-17T10:30:00Z",
  "deletion_scheduled_for": "2026-01-16T10:30:00Z",
  "images_affected": 42,
  "recoverable_until": "2026-01-16T10:30:00Z",
  "message": "Project deleted. You have 30 days to restore."
}
```

#### 9. Restore Project
```http
POST /api/projects/{project_id}/restore

Response:
{
  "project_id": "proj_123",
  "status": "active",
  "restored_at": "2025-12-20T10:30:00Z",
  "images_restored": 42,
  "message": "Project successfully restored"
}

Error Responses:
- 404: Project not found
- 410: Project permanently deleted (>30 days)
- 400: Project not in deleted state
```

#### 10. Permanent Delete (Admin Only)
```http
DELETE /api/projects/{project_id}/permanent
Headers:
  Authorization: Admin token

Response:
{
  "project_id": "proj_123",
  "status": "permanently_deleted",
  "gcs_folders_deleted": ["/proj_123/"],
  "database_records_deleted": 42,
  "message": "Project permanently deleted. This action cannot be undone."
}
```

---

## Database Schema

### Tables

#### `images` Table
```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id VARCHAR(100) UNIQUE NOT NULL,
  project_id VARCHAR(100) NOT NULL,
  
  -- Source tracking
  source VARCHAR(20) NOT NULL CHECK (source IN ('ai_generated', 'user_upload')),
  uploaded_by VARCHAR(100),  -- user_id for user uploads
  
  -- URLs
  original_url TEXT NOT NULL,
  variants JSONB NOT NULL,  -- {small: {webp, jpeg}, large: {webp, jpeg}}
  
  -- Metadata
  original_size INTEGER NOT NULL,  -- bytes
  original_dimensions JSONB NOT NULL,  -- {width, height}
  processing_time_ms INTEGER,
  
  -- Lifecycle
  is_temporary BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100),
  replaced_by UUID REFERENCES images(id),
  
  -- Moderation (optional)
  moderation_status VARCHAR(20) DEFAULT 'approved' 
    CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_project_id (project_id),
  INDEX idx_source (source),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_created_at (created_at)
);
```

#### `projects` Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  
  -- Lifecycle
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  deletion_scheduled_for TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_deletion_scheduled (deletion_scheduled_for)
);
```

#### `upload_quotas` Table (Optional)
```sql
CREATE TABLE upload_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(100) NOT NULL REFERENCES projects(project_id),
  
  -- Quota tracking
  max_uploads INTEGER DEFAULT 100,
  current_uploads INTEGER DEFAULT 0,
  
  -- Rate limiting
  uploads_today INTEGER DEFAULT 0,
  last_upload_date DATE DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  UNIQUE INDEX idx_project_quota (project_id)
);
```

### Example Queries

#### Get Active Images for Project
```sql
SELECT * FROM images 
WHERE project_id = 'proj_123' 
  AND is_deleted = false 
  AND is_temporary = false
ORDER BY created_at DESC;
```

#### Get Images Scheduled for Deletion
```sql
SELECT * FROM images 
WHERE is_deleted = true 
  AND deleted_at < NOW() - INTERVAL '30 days';
```

#### Check Upload Quota
```sql
SELECT 
  current_uploads, 
  max_uploads,
  (max_uploads - current_uploads) as remaining
FROM upload_quotas
WHERE project_id = 'proj_123';
```

---

## Firebase Hosting Configuration

### 1. Firebase Project Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init hosting

# Select or create Firebase project
# Choose hosting options
```

### 2. `firebase.json` Configuration

```json
{
  "hosting": {
    "site": "your-app-images-cdn",
    "public": "public",
    
    "rewrites": [
      {
        "source": "**",
        "function": "imageProxy"
      }
    ],
    
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|png|gif|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          },
          {
            "key": "Vary",
            "value": "Accept"
          },
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          }
        ]
      },
      {
        "source": "**/temp/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=3600"
          }
        ]
      }
    ],
    
    "cleanUrls": true,
    "trailingSlash": false
  }
}
```

### 3. Cloud Function for Image Proxy (Optional)

```javascript
// functions/index.js
const functions = require('firebase-functions');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const BUCKET_NAME = 'your-gcs-bucket-name';

exports.imageProxy = functions.https.onRequest(async (req, res) => {
  try {
    const imagePath = req.path.substring(1); // Remove leading slash
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(imagePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).send('Image not found');
    }
    
    // Get file metadata
    const [metadata] = await file.getMetadata();
    
    // Content negotiation: prefer WebP if browser supports it
    const acceptsWebP = req.headers['accept']?.includes('image/webp');
    
    let serveFile = file;
    if (acceptsWebP && imagePath.endsWith('.jpg')) {
      // Try to serve WebP version
      const webpPath = imagePath.replace(/\.jpg$/, '.webp');
      const webpFile = bucket.file(webpPath);
      const [webpExists] = await webpFile.exists();
      
      if (webpExists) {
        serveFile = webpFile;
      }
    }
    
    // Set headers
    res.set('Content-Type', metadata.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Vary', 'Accept');
    
    // Stream file to response
    serveFile.createReadStream()
      .on('error', (err) => {
        console.error('Stream error:', err);
        res.status(500).send('Error serving image');
      })
      .pipe(res);
      
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).send('Internal server error');
  }
});
```

### 4. Custom Domain Setup

```bash
# Add custom domain in Firebase Console
# 1. Go to Hosting > Add custom domain
# 2. Enter: images.yourapp.com
# 3. Follow DNS configuration instructions

# DNS Configuration (add these records):
# Type: A
# Name: images
# Value: (Firebase will provide IP addresses)

# SSL Certificate
# Firebase automatically provisions SSL certificate
# Wait 24-48 hours for propagation
```

### 5. GCS Bucket Configuration

```bash
# Set bucket to allow public reads
gsutil iam ch allUsers:objectViewer gs://your-bucket-name

# Set CORS configuration
cat > cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Accept-Ranges", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://your-bucket-name

# Set lifecycle policy for temp folder
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 1,
          "matchesPrefix": ["temp/"]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://your-bucket-name
```

### 6. Environment Variables

```bash
# .env file
GCS_BUCKET_NAME=your-gcs-bucket-name
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_HOSTING_DOMAIN=images.yourapp.com
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# For image processing
MAX_FILE_SIZE_MB=10
SMALL_IMAGE_WIDTH=600
LARGE_IMAGE_WIDTH=1400
WEBP_QUALITY=85
JPEG_QUALITY=90
```

---

## Implementation Prompts

Use these prompts with AI coding assistants (Claude, ChatGPT, etc.) to build each component.

### Prompt 1: GCS + Firebase Setup

```
I need to set up Google Cloud Storage with Firebase Hosting as a CDN layer for an image management system.

REQUIREMENTS:
1. Create/configure GCS bucket for image storage
2. Set up Firebase Hosting project
3. Configure firebase.json to proxy requests to GCS
4. Set CORS and lifecycle policies on GCS bucket
5. Custom domain setup instructions

ARCHITECTURE:
- Storage: GCS bucket organized by project_id
- CDN: Firebase Hosting (custom domain: images.yourapp.com)
- Folder structure:
  /{project_id}/originals/
  /{project_id}/user_uploads/
  /{project_id}/web/small/
  /{project_id}/web/large/
  /temp/{session_id}/ (auto-delete after 24hrs)

GCS BUCKET CONFIGURATION:
- Public read access for all files
- CORS enabled for GET/HEAD requests
- Lifecycle policy: delete /temp/ files after 1 day
- Uniform bucket-level access

FIREBASE HOSTING:
- Cache headers: max-age=31536000 for immutable images
- Cache headers: max-age=3600 for temp images
- Vary: Accept (for content negotiation)
- Custom domain with auto SSL

DELIVERABLES:
1. GCS bucket creation script (gcloud or Terraform)
2. firebase.json configuration
3. CORS configuration file
4. Lifecycle policy configuration
5. IAM permissions setup
6. Custom domain setup guide
7. Testing/verification steps

Provide complete configuration files and setup scripts.
```

### Prompt 2: Image Processing Module

```
Build a synchronous image processing module for an image management system.

SPECIFICATIONS:
- Input: Image file, project_id, source ('ai_generated' | 'user_upload')
- Output: Object with original URL + 2 size variants (small: 600px, large: 1400px)
- Formats: Generate both WebP (quality 85) and JPEG (quality 90) for each size
- Maintain aspect ratio
- Strip EXIF metadata
- Store in GCS with path: /{project_id}/web/{size}/{image_id}.{ext}

PROCESSING PIPELINE:
1. Validate input (format, size)
2. Generate unique image_id (UUID)
3. Store original in /{project_id}/originals/
4. Generate small variant (600px width)
5. Generate large variant (1400px width)
6. Convert each to WebP and JPEG
7. Upload all files to GCS
8. Build Firebase Hosting URLs
9. Return complete response object

TECH STACK:
- Language: [Node.js/Python/Go - specify your preference]
- Image library: Sharp (Node.js) or Pillow (Python)
- GCS library: @google-cloud/storage or google-cloud-storage

ERROR HANDLING:
- Validate supported formats: JPEG, PNG, WebP, GIF
- Handle large files gracefully
- Rollback all uploads if any step fails
- Return detailed error messages
- Log processing metrics (time, sizes)

RESPONSE FORMAT:
{
  "image_id": "uuid",
  "project_id": "proj_123",
  "source": "ai_generated",
  "original_url": "https://images.yourapp.com/proj_123/originals/uuid.png",
  "variants": {
    "small": {
      "webp": "https://images.yourapp.com/proj_123/web/small/uuid.webp",
      "jpeg": "https://images.yourapp.com/proj_123/web/small/uuid.jpg"
    },
    "large": {
      "webp": "https://images.yourapp.com/proj_123/web/large/uuid.webp",
      "jpeg": "https://images.yourapp.com/proj_123/web/large/uuid.jpg"
    }
  },
  "metadata": {
    "original_size": 2048576,
    "dimensions": {"width": 2048, "height": 1536},
    "processing_time_ms": 1250
  }
}

Provide complete module with proper TypeScript types or Python type hints.
Include unit tests for key functions.
```

### Prompt 3: API Endpoints

```
Create RESTful API endpoints for image management system.

ENDPOINTS NEEDED:
1. POST /api/images/generate - AI generated image (permanent)
2. POST /api/images/upload-custom - User uploaded image (permanent)
3. POST /api/images/generate-preview - Temporary preview (24hr expiry)
4. POST /api/images/save-preview/{id} - Promote preview to permanent
5. PUT /api/images/{id}/replace - Replace existing image
6. GET /api/images/{id} - Get image details
7. GET /api/projects/{project_id}/images - List project images
8. DELETE /api/projects/{project_id} - Soft delete project
9. POST /api/projects/{project_id}/restore - Restore deleted project

TECH STACK:
- Framework: [Express/FastAPI/Gin - specify your preference]
- Database: [PostgreSQL/MySQL/Firestore]
- Authentication: [JWT/Firebase Auth/OAuth2]

REQUIREMENTS:
1. Use image processing module from previous prompt
2. Validate authentication/authorization
3. Check project access permissions
4. Handle file uploads (multipart/form-data)
5. Validate file size and format
6. Return appropriate HTTP status codes
7. Include rate limiting (10 uploads/minute per user)
8. Log all operations

VALIDATION:
- Max file size: 10MB for user uploads
- Allowed formats: JPEG, PNG, WebP, GIF
- Project ownership verification
- Quota checking (max 100 uploads per project)

ERROR RESPONSES:
- 400: Bad request (validation failed)
- 401: Unauthorized
- 403: Forbidden (no access to project)
- 404: Image/project not found
- 413: File too large
- 415: Unsupported format
- 429: Rate limit exceeded
- 500: Internal server error

Provide complete API implementation with:
- Route definitions
- Request validation
- Error handling middleware
- Authentication middleware
- API documentation (OpenAPI/Swagger)
```

### Prompt 4: Database Integration

```
Implement database layer for image management system.

DATABASE SCHEMA:
See "Database Schema" section in main document for complete table definitions.

Key tables:
- images (with lifecycle fields)
- projects (with deletion tracking)
- upload_quotas (optional)

OPERATIONS NEEDED:
1. Create image record
2. Get image by ID (with 404 detection)
3. List project images (with filters)
4. Soft delete image
5. Soft delete project (cascade to images)
6. Restore project
7. Hard delete old images (cleanup job)
8. Check upload quota
9. Increment quota usage

TECH STACK:
- Database: [PostgreSQL/MySQL/Cloud Firestore]
- ORM: [Prisma/TypeORM/SQLAlchemy/GORM]

SPECIAL REQUIREMENTS:
1. Atomic operations (database + GCS together)
2. Transaction support for multi-step operations
3. Indexes for performance (project_id, deleted_at, created_at)
4. Handle 404 detection: if GCS file missing, mark as deleted
5. Soft delete cascade: deleting project soft-deletes all images

QUERIES TO IMPLEMENT:
- Get active images for project
- Get images scheduled for deletion (>30 days)
- Check if image exists and is accessible
- Restore all images for a project
- Count images by source type
- Get storage usage per project

ERROR HANDLING:
- Handle constraint violations
- Transaction rollback on failures
- Log database errors
- Return meaningful error messages

Provide:
- Database migration files
- ORM models/schemas
- Repository/DAO classes
- Query functions with proper typing
- Unit tests for critical queries
```

### Prompt 5: Lifecycle Management & Cleanup Jobs

```
Implement lifecycle management and automated cleanup jobs.

CLEANUP JOBS NEEDED:
1. Daily job: Hard delete images older than 30 days
2. Daily job: Send email reminders (day 25)
3. Hourly job: Validate active images exist in GCS
4. Weekly job: Storage usage reports

JOB 1: Hard Delete Old Images
- Run: Daily at 2 AM UTC
- Find: Images where is_deleted=true AND deleted_at < NOW() - 30 days
- Actions:
  1. Delete entire /{project_id}/ folder from GCS
  2. Hard delete database records (or archive to BigQuery)
  3. Log deletions for compliance
  4. Send confirmation email to user
- Error handling: Retry failed deletions, alert on repeated failures

JOB 2: Deletion Reminders
- Run: Daily at 9 AM UTC
- Find: Projects where deletion_scheduled_for = NOW() + 5 days
- Actions:
  1. Send email: "Your project will be permanently deleted in 5 days"
  2. Include restore link
  3. Log email sent

JOB 3: Validate Image Existence
- Run: Hourly
- Random sample: 100 active images
- Actions:
  1. Check if GCS file exists
  2. If missing: mark as is_deleted=true
  3. Alert if more than 5% missing (indicates problem)
  4. Log discrepancies

JOB 4: Storage Reports
- Run: Weekly on Monday
- Generate:
  1. Total storage per project
  2. Images by source type
  3. Growth trends
  4. Cost projections
- Send to admin dashboard

TECH STACK:
- Scheduler: [Cloud Scheduler/Cron/Celery/Bull]
- Logging: [Cloud Logging/Winston/Python logging]
- Alerting: [Email/Slack/PagerDuty]

IMPLEMENTATION:
- Idempotent jobs (safe to run multiple times)
- Graceful failure handling
- Progress tracking
- Audit logging
- Configurable schedules

Provide:
- Job implementation code
- Scheduler configuration
- Error handling and retries
- Logging and monitoring
- Testing strategies
```

### Prompt 6: User Upload & Moderation

```
Implement user image upload feature with optional content moderation.

REQUIREMENTS:
1. Accept user-uploaded images (max 10MB)
2. Same processing as AI images (600px, 1400px variants)
3. Store in /{project_id}/user_uploads/
4. Track source='user_upload' and uploaded_by user_id
5. Optional: Content moderation (NSFW detection)
6. Quota enforcement (max 100 uploads per project)
7. Rate limiting (10 uploads/minute per user)

MODERATION (Optional):
- Use Google Cloud Vision API Safe Search Detection
- Check for: adult, violence, medical, racy content
- Moderation levels:
  - 'approved': No issues detected
  - 'flagged': Potential issues, needs review
  - 'rejected': Clear policy violation
- Admin review queue for flagged images

QUOTA SYSTEM:
- Check quota before processing
- Return 429 if quota exceeded
- Increment quota after successful upload
- Admin can adjust quotas per project

API ENDPOINT:
POST /api/images/upload-custom
- Validate: authentication, project access, file size, format
- Check: quota availability
- Optional: Run moderation check
- Process: generate variants
- Store: in user_uploads folder
- Update: quota counter
- Return: image object with moderation_status

RESPONSE:
{
  "image_id": "...",
  "source": "user_upload",
  "uploaded_by": "user_456",
  "moderation_status": "approved",
  "quota_used": 23,
  "quota_remaining": 77,
  ...
}

ERROR HANDLING:
- 400: Invalid file format
- 403: No upload permission
- 413: File too large
- 422: Failed moderation (rejected content)
- 429: Quota exceeded or rate limited
- 500: Processing error

Provide:
- Upload endpoint implementation
- Moderation integration (Cloud Vision API)
- Quota checking/enforcement
- Rate limiting middleware
- Admin review queue UI (optional)
```

### Prompt 7: Testing Suite

```
Create comprehensive test suite for image management system.

TEST CATEGORIES:
1. Unit Tests (>80% coverage target)
2. Integration Tests
3. End-to-End Tests
4. Performance Tests
5. Security Tests

UNIT TESTS:
- Image processing functions
  - Validate format detection
  - Test resizing logic
  - Verify WebP/JPEG conversion
  - Check EXIF stripping
- URL generation
  - Test Firebase URL builder
  - Verify path construction
- Database operations
  - CRUD operations
  - Soft delete logic
  - Quota calculations
- Validation functions
  - File size checks
  - Format validation
  - Quota enforcement

INTEGRATION TESTS:
- Complete upload flow (file → GCS → database)
- Image replacement with soft delete
- Project deletion cascade
- Restore functionality
- Preview to permanent promotion
- 404 detection and handling

END-TO-END TESTS:
- Upload image via API → verify accessible via CDN
- Generate preview → wait 24hrs → verify auto-deleted
- Delete project → wait 30 days → verify hard deleted
- Replace image → verify old one soft deleted
- User upload with moderation

PERFORMANCE TESTS:
- Concurrent uploads (50 simultaneous requests)
- Large file processing (10MB images)
- Processing time benchmarks:
  - Small image: < 1 second
  - Large image: < 4 seconds
- CDN cache hit rate (>90% after warmup)
- Database query performance (<100ms)

SECURITY TESTS:
- Authentication bypass attempts
- Authorization checks (cross-project access)
- File type validation (attempt malicious uploads)
- SQL injection tests
- XSS in user-generated content
- Rate limiting effectiveness

TEST DATA:
- Sample images (various formats, sizes)
- Mock user accounts
- Test projects
- Temporary test buckets

TECH STACK:
- Testing framework: [Jest/Pytest/Go testing]
- HTTP testing: [Supertest/httptest]
- Mocking: [Sinon/unittest.mock]
- Load testing: [k6/Artillery]

Provide:
- Complete test suite
- Test configuration
- Mock data generators
- CI/CD integration (GitHub Actions/GitLab CI)
- Coverage reports
```

---

## Cost Estimates

### Firebase Hosting Costs

#### Free Tier (Spark Plan)
- Storage: 10 GB
- Transfer: 360 MB/day (~10.5 GB/month)
- SSL: Included
- Custom domain: Included
- **Cost**: $0/month

#### Paid Tier (Blaze Plan)

| Resource | Price | Example Usage | Monthly Cost |
|----------|-------|---------------|--------------|
| Storage | $0.026/GB | 100 GB | $2.60 |
| Bandwidth | $0.15/GB | 500 GB | $75.00 |
| **Total** | | | **$77.60** |

### Google Cloud Storage Costs

| Resource | Price | Example Usage | Monthly Cost |
|----------|-------|---------------|--------------|
| Storage (Standard) | $0.020/GB | 200 GB | $4.00 |
| Class A operations | $0.05/10K | 100K uploads | $0.50 |
| Class B operations | $0.004/10K | 1M reads | $0.40 |
| **Total** | | | **$4.90** |

### Cloud Functions (Optional - for imageProxy)

| Resource | Price | Example Usage | Monthly Cost |
|----------|-------|---------------|--------------|
| Invocations | $0.40/M | 500K requests | $0.20 |
| Compute (GB-sec) | $0.0000025 | 2M GB-sec | $5.00 |
| **Total** | | | **$5.20** |

### Total Monthly Cost Examples

#### Small Project (10K images, 50GB transfer)
- Firebase Hosting: Free tier sufficient
- GCS Storage: $1.00
- **Total**: ~$1/month

#### Medium Project (100K images, 500GB transfer)
- Firebase Hosting: $77.60
- GCS Storage: $4.90
- Cloud Functions (optional): $5.20
- **Total**: ~$87.70/month

#### Large Project (1M images, 5TB transfer)
- Firebase Hosting: $757.60
- GCS Storage: $40.90
- Cloud Functions: $25.00
- **Total**: ~$823.50/month

### Cost Optimization Tips
1. Enable CDN caching (reduces origin requests)
2. Use lifecycle policies to delete old temp files
3. Compress images aggressively (lower bandwidth)
4. Monitor and alert on unusual usage
5. Consider Cloud CDN for very high traffic (better economics)

---

## Timeline & Milestones

### Phase 1: Foundation (Week 1-2)
**Duration**: 2 weeks

- [ ] Day 1-2: GCS bucket setup + Firebase Hosting configuration
- [ ] Day 3-5: Image processing module development
- [ ] Day 6-8: Database schema + migrations
- [ ] Day 9-10: Core API endpoints (generate, upload)
- [ ] Day 11-14: Testing + bug fixes

**Deliverables**:
- Working GCS + Firebase CDN
- Image processing pipeline
- Basic CRUD operations
- Unit tests

### Phase 2: Lifecycle Management (Week 3)
**Duration**: 1 week

- [ ] Day 15-16: Soft delete implementation
- [ ] Day 17-18: Grace period + restoration logic
- [ ] Day 19-20: Automated cleanup jobs
- [ ] Day 21: Email notifications

**Deliverables**:
- Complete deletion lifecycle
- Scheduled cleanup jobs
- Email reminders
- Integration tests

### Phase 3: Advanced Features (Week 4)
**Duration**: 1 week

- [ ] Day 22-23: User upload feature
- [ ] Day 24: Preview/temporary mode
- [ ] Day 25: Image replacement
- [ ] Day 26: Optional moderation
- [ ] Day 27-28: Quota system

**Deliverables**:
- User upload capability
- Preview generation
- Content moderation (optional)
- Quota enforcement

### Phase 4: Production Hardening (Week 5)
**Duration**: 1 week

- [ ] Day 29-30: Performance optimization
- [ ] Day 31: Security audit
- [ ] Day 32: Monitoring & alerting setup
- [ ] Day 33: Documentation finalization
- [ ] Day 34-35: Load testing + fixes

**Deliverables**:
- Performance benchmarks met
- Security checklist completed
- Monitoring dashboards
- Complete documentation

### Phase 5: Deployment (Week 6)
**Duration**: 1 week

- [ ] Day 36-37: Staging deployment
- [ ] Day 38: User acceptance testing
- [ ] Day 39: Production deployment
- [ ] Day 40-42: Monitoring + quick fixes

**Deliverables**:
- Production system live
- Monitoring active
- Runbook documentation
- Team training completed

**Total Timeline**: 6 weeks (42 days)

---

## Testing Strategy

### Testing Pyramid

```
         /\
        /E2E\         ← 10% (Critical user flows)
       /──────\
      /Integration\   ← 30% (Component interactions)
     /────────────\
    /  Unit Tests  \  ← 60% (Business logic, functions)
   /────────────────\
```

### Unit Tests (60% of tests)

#### Image Processing
```javascript
describe('Image Processing', () => {
  test('should resize image to 600px width maintaining aspect ratio', async () => {
    const result = await resizeImage(inputImage, 600);
    expect(result.width).toBe(600);
    expect(result.height).toBe(450); // 4:3 aspect
  });
  
  test('should convert to WebP with quality 85', async () => {
    const webp = await convertToWebP(inputImage, 85);
    expect(webp.format).toBe('webp');
    expect(webp.quality).toBe(85);
  });
  
  test('should strip EXIF metadata', async () => {
    const processed = await processImage(imageWithExif);
    expect(processed.metadata.exif).toBeUndefined();
  });
});
```

#### URL Generation
```javascript
describe('URL Builder', () => {
  test('should generate correct Firebase Hosting URL', () => {
    const url = buildFirebaseURL('proj_123', 'web/small', 'uuid', 'webp');
    expect(url).toBe('https://images.yourapp.com/proj_123/web/small/uuid.webp');
  });
});
```

#### Database Operations
```javascript
describe('Image Repository', () => {
  test('should soft delete image', async () => {
    await imageRepo.softDelete(imageId);
    const image = await imageRepo.findById(imageId);
    expect(image.is_deleted).toBe(true);
    expect(image.deleted_at).toBeDefined();
  });
  
  test('should restore deleted image', async () => {
    await imageRepo.restore(imageId);
    const image = await imageRepo.findById(imageId);
    expect(image.is_deleted).toBe(false);
  });
});
```

### Integration Tests (30% of tests)

#### Complete Upload Flow
```javascript
describe('Upload Integration', () => {
  test('should upload image and return all variants', async () => {
    const file = loadTestImage('test.jpg');
    const result = await uploadImage(file, 'proj_123');
    
    expect(result.image_id).toBeDefined();
    expect(result.variants.small.webp).toMatch(/https:\/\/images\.yourapp\.com/);
    
    // Verify in GCS
    const gcsFile = await gcs.bucket(BUCKET).file(result.original_url);
    expect(await gcsFile.exists()).toBe(true);
    
    // Verify in database
    const dbImage = await db.images.findById(result.image_id);
    expect(dbImage).toBeDefined();
  });
});
```

#### Deletion Cascade
```javascript
describe('Project Deletion', () => {
  test('should soft delete all images when project deleted', async () => {
    await deleteProject('proj_123');
    
    const images = await db.images.findByProject('proj_123');
    images.forEach(img => {
      expect(img.is_deleted).toBe(true);
    });
  });
});
```

### End-to-End Tests (10% of tests)

#### Critical User Flow
```javascript
describe('E2E: Complete Image Lifecycle', () => {
  test('should upload → access via CDN → replace → delete → restore', async () => {
    // 1. Upload
    const upload = await api.post('/api/images/generate')
      .attach('image', 'test.jpg')
      .field('project_id', 'proj_123');
    expect(upload.status).toBe(200);
    const imageId = upload.body.image_id;
    const cdnUrl = upload.body.variants.small.webp;
    
    // 2. Access via CDN
    const cdnResponse = await fetch(cdnUrl);
    expect(cdnResponse.status).toBe(200);
    expect(cdnResponse.headers.get('content-type')).toBe('image/webp');
    
    // 3. Replace
    const replace = await api.put(`/api/images/${imageId}/replace`)
      .attach('image', 'test2.jpg');
    expect(replace.status).toBe(200);
    const newImageId = replace.body.new_image_id;
    
    // 4. Verify old image soft deleted
    const oldImage = await api.get(`/api/images/${imageId}`);
    expect(oldImage.body.is_deleted).toBe(true);
    
    // 5. Delete project
    await api.delete('/api/projects/proj_123');
    
    // 6. Restore project
    await api.post('/api/projects/proj_123/restore');
    const restored = await api.get(`/api/images/${newImageId}`);
    expect(restored.body.is_deleted).toBe(false);
  });
});
```

### Performance Tests

```javascript
describe('Performance', () => {
  test('should handle 50 concurrent uploads', async () => {
    const uploads = Array(50).fill().map(() => 
      api.post('/api/images/generate')
        .attach('image', 'test.jpg')
        .field('project_id', 'proj_123')
    );
    
    const start = Date.now();
    const results = await Promise.all(uploads);
    const duration = Date.now() - start;
    
    expect(results.every(r => r.status === 200)).toBe(true);
    expect(duration).toBeLessThan(10000); // < 10 seconds
  });
  
  test('should process 10MB image under 4 seconds', async () => {
    const largeImage = loadTestImage('large-10mb.jpg');
    const start = Date.now();
    
    await processImage(largeImage);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(4000);
  });
});
```

### Test Data Management

```javascript
// test-helpers.js
export function createTestImage(width, height, format = 'jpg') {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  }).toFormat(format).toBuffer();
}

export async function createTestProject(userId) {
  return await db.projects.create({
    project_id: `test_proj_${Date.now()}`,
    user_id: userId,
    name: 'Test Project'
  });
}

export async function cleanupTestData() {
  await db.images.deleteMany({ project_id: /^test_proj_/ });
  await db.projects.deleteMany({ project_id: /^test_proj_/ });
  // Clean up GCS test files
  await deleteGCSFolder('test_proj_');
}
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test
          GCS_BUCKET_NAME: test-bucket
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Generate coverage report
        run: npm run coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

---

## Monitoring & Maintenance

### Key Metrics to Monitor

#### Application Metrics
```
1. Upload Success Rate
   - Target: >99.5%
   - Alert if: <99% for 5 minutes

2. Image Processing Time
   - P50: <1 second
   - P95: <3 seconds
   - P99: <5 seconds
   - Alert if: P95 >5 seconds

3. API Response Time
   - P50: <200ms
   - P95: <500ms
   - P99: <1 second

4. Error Rate
   - Target: <0.5%
   - Alert if: >1% for 5 minutes

5. Quota Rejections
   - Track: Uploads rejected due to quota
   - Alert if: Spike >10% hour-over-hour
```

#### Infrastructure Metrics
```
1. GCS Operations
   - Upload success rate: >99.9%
   - Average upload time: <500ms
   - Storage usage: Track growth trends

2. Firebase Hosting
   - Cache hit rate: >90% (after warmup)
   - CDN response time: <100ms globally
   - Bandwidth usage: Monitor for anomalies

3. Database Performance
   - Query response time: <100ms
   - Connection pool usage: <80%
   - Slow query count: <10/hour
```

#### Business Metrics
```
1. Storage Usage per Project
   - Track top consumers
   - Predict capacity needs

2. Images by Source Type
   - AI generated vs User uploaded
   - Growth trends

3. Deletion Rate
   - Track soft deletes per day
   - Hard deletes per day
   - Restoration rate

4. Upload Patterns
   - Peak hours
   - Geographic distribution
```

### Monitoring Implementation

#### Google Cloud Monitoring Dashboard

```yaml
# monitoring-dashboard.yaml
displayName: "Image Management System"

mosaicLayout:
  columns: 12
  tiles:
    - width: 6
      height: 4
      widget:
        title: "Upload Success Rate"
        xyChart:
          dataSets:
            - timeSeriesQuery:
                timeSeriesFilter:
                  filter: 'metric.type="custom.googleapis.com/image/upload_success"'
                  aggregation:
                    alignmentPeriod: 60s
                    perSeriesAligner: ALIGN_RATE
          yAxis:
            label: "Success Rate (%)"
            scale: LINEAR
    
    - width: 6
      height: 4
      widget:
        title: "Processing Time (P95)"
        xyChart:
          dataSets:
            - timeSeriesQuery:
                timeSeriesFilter:
                  filter: 'metric.type="custom.googleapis.com/image/processing_time"'
                  aggregation:
                    alignmentPeriod: 60s
                    perSeriesAligner: ALIGN_DELTA
                    crossSeriesReducer: REDUCE_PERCENTILE_95
```

#### Alert Policies

```javascript
// monitoring/alerts.js
const alertPolicies = [
  {
    name: 'High Upload Failure Rate',
    condition: {
      displayName: 'Upload success rate < 99%',
      threshold: {
        filter: 'metric.type="custom.googleapis.com/image/upload_success"',
        comparison: 'COMPARISON_LT',
        thresholdValue: 0.99,
        duration: '300s'
      }
    },
    notificationChannels: ['email-oncall', 'slack-alerts'],
    documentation: {
      content: `
        ## High Upload Failure Rate
        
        **Impact**: Users cannot upload images
        
        **Diagnosis**:
        1. Check GCS bucket status
        2. Review recent deployments
        3. Check database connectivity
        4. Review error logs
        
        **Remediation**:
        - If GCS issue: Contact Google Cloud Support
        - If database: Scale up connections
        - If code bug: Rollback recent deployment
      `
    }
  },
  
  {
    name: 'Slow Image Processing',
    condition: {
      displayName: 'P95 processing time > 5 seconds',
      threshold: {
        filter: 'metric.type="custom.googleapis.com/image/processing_time"',
        aggregations: [{
          alignmentPeriod: '60s',
          perSeriesAligner: 'ALIGN_DELTA',
          crossSeriesReducer: 'REDUCE_PERCENTILE_95'
        }],
        comparison: 'COMPARISON_GT',
        thresholdValue: 5000,
        duration: '300s'
      }
    },
    notificationChannels: ['email-oncall'],
    documentation: {
      content: `
        ## Slow Image Processing
        
        **Impact**: User experience degradation
        
        **Possible Causes**:
        - Large image uploads
        - Resource contention
        - GCS slow uploads
        
        **Actions**:
        1. Check instance CPU/memory
        2. Review recent large uploads
        3. Consider scaling horizontally
      `
    }
  }
];
```

#### Custom Metrics

```javascript
// monitoring/metrics.js
const { Monitoring } = require('@google-cloud/monitoring');
const client = new Monitoring.MetricServiceClient();

async function recordUploadMetric(success, processingTime, imageSize) {
  const projectId = process.env.GCP_PROJECT_ID;
  const projectPath = client.projectPath(projectId);
  
  const timeSeriesData = {
    metric: {
      type: 'custom.googleapis.com/image/upload',
      labels: {
        success: success.toString(),
      }
    },
    resource: {
      type: 'global',
      labels: {
        project_id: projectId
      }
    },
    points: [
      {
        interval: {
          endTime: {
            seconds: Date.now() / 1000
          }
        },
        value: {
          doubleValue: processingTime
        }
      }
    ]
  };
  
  const request = {
    name: projectPath,
    timeSeries: [timeSeriesData]
  };
  
  await client.createTimeSeries(request);
}

// Usage in upload handler
try {
  const startTime = Date.now();
  const result = await processImage(file);
  const processingTime = Date.now() - startTime;
  
  await recordUploadMetric(true, processingTime, file.size);
  return result;
} catch (error) {
  await recordUploadMetric(false, 0, file.size);
  throw error;
}
```

### Logging Strategy

#### Structured Logging

```javascript
// logging/logger.js
const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');

const loggingWinston = new LoggingWinston({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'image-management' },
  transports: [
    new winston.transports.Console(),
    loggingWinston
  ]
});

// Usage
logger.info('Image uploaded', {
  image_id: '550e8400-...',
  project_id: 'proj_123',
  source: 'ai_generated',
  size: 2048576,
  processing_time_ms: 1250,
  user_id: 'user_456'
});

logger.error('Upload failed', {
  error: error.message,
  stack: error.stack,
  file_size: file.size,
  project_id: 'proj_123'
});
```

#### Log Queries

```sql
-- Find slow uploads (>3 seconds)
SELECT
  jsonPayload.image_id,
  jsonPayload.processing_time_ms,
  timestamp
FROM `your-project.logs.stdout`
WHERE jsonPayload.processing_time_ms > 3000
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY jsonPayload.processing_time_ms DESC
LIMIT 100;

-- Find upload errors
SELECT
  jsonPayload.error,
  jsonPayload.project_id,
  COUNT(*) as error_count
FROM `your-project.logs.stdout`
WHERE severity = 'ERROR'
  AND jsonPayload.operation = 'upload'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
GROUP BY jsonPayload.error, jsonPayload.project_id
ORDER BY error_count DESC;
```

### Maintenance Tasks

#### Daily Tasks
- [ ] Review error logs and alerts
- [ ] Check cleanup job execution
- [ ] Monitor storage usage trends
- [ ] Verify CDN cache hit rates

#### Weekly Tasks
- [ ] Review performance metrics
- [ ] Analyze cost reports
- [ ] Check database slow queries
- [ ] Update capacity planning

#### Monthly Tasks
- [ ] Security audit review
- [ ] Cost optimization review
- [ ] Backup verification test
- [ ] Documentation updates
- [ ] Dependency updates

#### Quarterly Tasks
- [ ] Disaster recovery drill
- [ ] Performance load testing
- [ ] Architecture review
- [ ] User feedback review

### Runbook Examples

#### Incident: High Upload Failure Rate

```markdown
## High Upload Failure Rate Runbook

### Severity: P1 (Critical)

### Symptoms
- Upload success rate < 99%
- Users reporting upload errors
- Alert: "High Upload Failure Rate" triggered

### Diagnosis Steps

1. **Check System Health**
   ```bash
   # Check API server status
   curl https://api.yourapp.com/health
   
   # Check GCS bucket access
   gsutil ls gs://your-bucket-name
   
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Review Error Logs (Last 15 minutes)**
   ```bash
   gcloud logging read "severity>=ERROR AND resource.type=cloud_run_revision" \
     --limit 50 --format json | jq '.[] | .jsonPayload.error'
   ```

3. **Check Recent Deployments**
   - Review recent code changes
   - Check deployment logs
   - Verify environment variables

4. **Check External Dependencies**
   - GCS status: https://status.cloud.google.com
   - Firebase status: https://status.firebase.google.com
   - Database provider status

### Resolution Steps

#### If GCS Issue:
1. Contact Google Cloud Support
2. Switch to backup bucket (if configured)
3. Queue failed uploads for retry

#### If Database Issue:
1. Check connection pool exhaustion
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```
2. Scale up database connections
3. Restart stale connections

#### If Application Bug:
1. Identify problematic code from stack traces
2. Rollback to previous working version
   ```bash
   gcloud run services update image-api \
     --image gcr.io/project/image-api:previous-version
   ```
3. Create hotfix and deploy

### Communication Template
```
🚨 Incident: High Upload Failure Rate

Status: Investigating / Identified / Resolved
Impact: Users cannot upload images
Start Time: [TIME]
Duration: [DURATION]

Current Status:
- [DETAILED STATUS]

Actions Taken:
- [ACTION 1]
- [ACTION 2]

Next Steps:
- [NEXT STEP 1]

Updates will be posted every 15 minutes.
```

### Post-Incident
1. Complete incident report
2. Identify root cause
3. Create prevention tasks
4. Update runbook if needed
```

---

## Security Considerations

### Authentication & Authorization
- Use Firebase Auth or OAuth2 for user authentication
- Verify project ownership before any operation
- Implement role-based access control (RBAC)
- Use signed URLs for sensitive operations

### Input Validation
- Validate all file uploads (type, size, content)
- Sanitize user-provided filenames
- Check for malicious file content
- Rate limit upload endpoints

### Data Protection
- HTTPS everywhere (Firebase Hosting auto-SSL)
- Strip metadata (EXIF) from uploaded images
- Optional: Encrypt sensitive images at rest
- Audit log all access to sensitive operations

### Content Moderation
- Optional Cloud Vision API for NSFW detection
- Admin review queue for flagged content
- User reporting mechanism
- Abuse detection and prevention

---

## Appendix

### Glossary

- **GCS**: Google Cloud Storage
- **CDN**: Content Delivery Network
- **WebP**: Modern image format with superior compression
- **Soft Delete**: Mark as deleted but keep data (recoverable)
- **Hard Delete**: Permanently remove data (irreversible)
- **Grace Period**: Time window for recovery before permanent deletion
- **Lifecycle Policy**: Automated rules for data retention/deletion
- **Firebase Hosting**: Google's CDN service for static content
- **Orphan Image**: Image file without database reference

### Related Documentation

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Cloud Vision API](https://cloud.google.com/vision/docs)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [WebP Image Format](https://developers.google.com/speed/webp)

### Support Contacts

- **Development Team**: dev-team@yourapp.com
- **DevOps/Infrastructure**: devops@yourapp.com
- **Google Cloud Support**: [Google Cloud Console](https://console.cloud.google.com/support)
- **On-Call Engineer**: oncall@yourapp.com

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-17 | AI Assistant | Initial architecture plan |

---

**Document Status**: ✅ Final - Ready for Implementation

**Next Steps**:
1. Review with development team
2. Confirm technology stack choices
3. Begin Phase 1 implementation
4. Set up project tracking (Jira/Linear/etc)

---

*End of Document*
