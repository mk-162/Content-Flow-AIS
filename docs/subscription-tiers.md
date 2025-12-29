# Subscription Tiers & Credit System

## Overview

MissionContent uses a tiered subscription model with a credit-based system for AI operations. All paid tiers include website building, hosting, and management - not just AI credits.

---

## Subscription Tiers

### FREE (Demo)

* **Price:** $0
* **Monthly Credits:** 50
* **Projects:** 1
* **Users per Project:** 1
* **Research Type:** Shallow (AI-estimated)
* **Website Included:** No (demo only)

Demo accounts allow users to explore the platform. The "Launch" button prompts upgrade to a paid tier.

---

### STARTER

* **Price:** $200/month (minimum 12 months)
* **Monthly Credits:** 100
* **Projects:** 3
* **Users per Project:** 3
* **Research Type:** Shallow (AI-estimated)
* **Keyword Metrics:** Yes
* **Website Included:** Yes (hosted & managed)

---

### PROFESSIONAL

* **Price:** $1,500/month
* **Monthly Credits:** 500
* **Projects:** 10
* **Users per Project:** 10
* **Research Type:** Deep (DataForSEO real data)
* **Keyword Metrics:** Yes
* **Website Included:** Yes (hosted & managed)

---

### ENTERPRISE

* **Price:** Custom
* **Monthly Credits:** Unlimited
* **Projects:** Unlimited
* **Users per Project:** Unlimited
* **Research Type:** Deep (DataForSEO real data)
* **Keyword Metrics:** Yes
* **Website Included:** Yes (custom solution)

---

## Credit Costs

| Operation | Credits |
|-----------|---------|
| Title Generation | 1 per stub |
| Article Generation | 1 per article |
| Image Generation | 5 per image |
| Shallow Research | 2 |
| Deep Research | 8 |

---

## Credit System Details

* Credits refresh monthly based on subscription tier
* Unused credits do not roll over
* Admins can manually grant bonus credits
* Credit balance is tracked at the organization level
* Top-up credit packs available for purchase

---

## Research Types

### Shallow Research

* Uses AI to estimate keyword metrics
* Available on all tiers
* Lower credit cost (2 credits)
* Good for quick keyword ideas

### Deep Research

* Uses DataForSEO API for real search volume data
* Available on PROFESSIONAL and ENTERPRISE tiers
* Higher credit cost (8 credits)
* Provides accurate search volume, competition, CPC data

---

## Code References

* Tier limits: `types.ts` - `TIER_LIMITS`
* Tier features: `types.ts` - `TIER_FEATURES`
* Credit costs: `services/creditService.ts` - `CREDIT_COSTS`
* Monthly allowance: `services/creditService.ts` - `MONTHLY_ALLOWANCE`
