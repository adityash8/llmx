# PRD: LLMX for Webflow

**Version: 0.1 (MVP)**

## 1. Product Overview

LLMX for Webflow is a native Webflow App that automatically generates, validates, and publishes llms.txt files so large language models can reliably discover a site's canonical content. The app connects via Webflow's OAuth, pulls the sitemap, applies smart defaults for CMS-heavy sites, validates URLs, and publishes the manifest directly to the site's root—all without leaving the Webflow dashboard.

The MVP targets Webflow users who want "AI visibility" but lack technical resources to hand-roll solutions. A free public validator drives top-of-funnel awareness and captures non-Webflow leads for future expansion.

## 2. Goals

### 2.1 Business Goals
- Own the "llms.txt for Webflow" niche via Webflow App Marketplace listing and pSEO
- Achieve 500 installs and $1k MRR within 60 days
- Establish LLMX spec as the de facto standard through branded output files
- Build distribution moat before SEO suites add llms.txt features

### 2.2 User Goals
- Generate a valid llms.txt in under 3 minutes without technical knowledge
- Validate existing llms.txt files and get actionable fix suggestions
- Automatically refresh llms.txt when site content changes
- Demonstrate "AI readiness" to stakeholders via shareable scorecard

### 2.3 Non-Goals
- Guarantee LLM ranking or indexing outcomes
- Full site crawling beyond sitemap URLs
- Storing page content (metadata and generated files only)
- Supporting non-Webflow platforms in MVP

## 3. User Personas

### Site Owner (Sarah)
Non-technical founder who built her SaaS marketing site on Webflow. Wants her docs and blog posts discoverable by AI assistants. Needs plug-and-play solution with zero code.

### Freelancer (Dev)
Webflow developer managing 5-10 client sites. Wants to offer "AI optimization" as an upsell service. Needs efficient multi-site workflow.

### Agency Lead (Maya)
Runs a Webflow agency with 20+ client sites. Wants to standardize AI readiness across portfolio. Needs bulk management and client-facing reports.

## 4. Functional Requirements

### 4.1 Webflow OAuth + Site Connection (High Priority)
- Connect via Webflow App OAuth flow
- Pull list of authorized sites
- Store site ID and access token securely (AES-256 encrypted)
- Handle token refresh automatically

### 4.2 Sitemap Auto-Detection (High Priority)
- Fetch sitemap.xml from Webflow site
- Parse nested sitemaps if present
- Extract all URLs with lastmod dates
- Sample up to 500 URLs on free tier, 5,000 on Pro

### 4.3 Smart Rule Builder (High Priority)
- Preset rules for: /blog/, /docs/, /products/*, static pages
- Include/exclude via glob patterns
- Priority weighting (1-10) per rule
- Live preview showing matched URLs and final output

### 4.4 llms.txt Generation (High Priority)
- Output in LLMX spec format (robots-style directives + structured JSON block)
- Include metadata: site name, description, generated timestamp, LLMX version
- Embed optional credit line with backlink
- Support both llms.txt and llms-full.txt variants

### 4.5 URL Validation Engine (High Priority)
- Check HTTP status codes (flag 4xx/5xx)
- Detect canonical mismatches
- Flag robots.txt conflicts
- Check freshness (lastmod > 90 days = stale warning)
- Generate severity-ranked issue list with fix suggestions

### 4.6 Direct Publish to Webflow (High Priority)
- Publish llms.txt as static asset to site root via Webflow CMS API
- Show diff preview before publish
- Trigger Webflow site publish after file upload
- Rollback capability (store last 3 versions)

### 4.7 Webhook-Triggered Refresh (Medium Priority)
- Listen for Webflow publish webhook
- Auto-regenerate and republish llms.txt on site changes
- Configurable: on every publish, daily, weekly, or manual only
- Email/Slack notification on refresh with diff summary

### 4.8 Public Validator (Medium Priority)
- Standalone page: enter any domain, get validation report
- No login required for basic scan
- Shareable report URL with "AI Readiness Score" (A-F grade)
- CTA to install LLMX app or create account
- Embeddable badge for validated sites

### 4.9 Billing Integration (Low Priority)
- Free tier: 1 site, 500 URLs, manual refresh only
- Pro tier ($9/mo): 5 sites, 5,000 URLs, webhook automation, priority support
- Stripe Checkout integration
- Usage enforcement at generation time

## 5. User Experience

### 5.1 Entry Points

**Webflow App Marketplace Install:**
1. User finds LLMX in Webflow App Marketplace
2. Clicks Install -> Webflow OAuth consent screen
3. Redirected to LLMX dashboard with sites auto-populated
4. Selects a site -> one-click generate with smart defaults
5. Preview output -> Publish to site
6. Success state with shareable badge and next steps

**Public Validator Entry:**
1. User lands on llmx.dev/validator
2. Pastes domain -> instant validation scan
3. Views AI Readiness Score and issue breakdown
4. CTA: "Fix these issues automatically" -> Install app flow

### 5.2 Core Experience

**Site Selection:** User sees all Webflow sites they have access to. Each shows connection status, last llms.txt generation date, and issue count.

**Rule Configuration:** Two-pane interface. Left pane shows rule builder with Webflow-specific presets (Blog, Docs, Products, Static Pages) as toggle cards. Right pane shows live preview of matched URLs and generated llms.txt output updating in real-time.

**Validation:** After rules are set, validation runs automatically. Issues displayed as cards grouped by severity (Error, Warning, Info). Each card shows affected URLs, issue type, and one-click fix suggestion.

**Publish:** User clicks Publish. Diff viewer shows changes from current live version. Confirm triggers upload to Webflow and site republish.

### 5.3 UI/UX Highlights
- One-click generate with smart defaults
- Live preview pane with real-time updates
- Issue cards with severity colors (Red/Yellow/Blue)
- GitHub-style diff viewer before publish
- AI Readiness Score (A-F grade)
- Embeddable "AI Ready" badge

## 6. Success Metrics

### User-Centric Metrics
- Time to first llms.txt published: <3 minutes (P50)
- Validation issue auto-resolution rate: >=60%
- Webhook automation adoption: >=25% of active users
- NPS score: >=40

### Business Metrics
- Webflow App Marketplace installs: 500 by Day 60
- Free to Pro conversion rate: >=8%
- MRR: $1,000 by Day 60
- Public validator runs: 2,000 by Day 30
- Validator -> Install conversion: >=5%

### Technical Metrics
- Publish success rate: >=99%
- Webhook processing latency: <30 seconds (P95)
- Validation scan time: <15 seconds for 500 URLs (P95)
- API error rate: <0.5%
- Uptime: 99.5%

## 7. Technical Considerations

### Integration Points
- Webflow OAuth: App authorization and site access
- Webflow Sites API: List sites, get site metadata
- Webflow CMS API: Publish static assets to site root
- Webflow Webhooks: site_publish event for auto-refresh
- Stripe: Billing and subscription management
- PostHog: Product analytics and feature flags
- Sentry: Error tracking and alerting
- Resend: Transactional emails
- Slack API: Optional webhook notifications

### Data Storage and Privacy
- Store only: site IDs, OAuth tokens (encrypted), generated llms.txt files, validation metadata, user email
- No page content stored; fetched and discarded after validation
- Tokens encrypted at rest (AES-256) and in transit (TLS 1.3)
- GDPR compliant: user can export/delete all data
- 30-day retention for validation logs

### Tech Stack
- Framework: Next.js 15 (App Router)
- Hosting: Vercel
- UI: shadcn/ui + Tailwind CSS
- Database: Supabase (Postgres)
- Auth: Supabase Auth + Webflow OAuth
- Background jobs: Supabase Edge Functions
- Billing: Stripe
- Analytics: PostHog
- Error tracking: Sentry
- Email: Resend

## 8. Milestones

### Phase 1: Core Generator + Validator (Days 1-4)
- Webflow OAuth integration
- Sitemap fetcher and parser
- Rule builder with Webflow presets
- llms.txt generation engine
- URL validation engine
- Direct publish to Webflow
- Basic dashboard UI

### Phase 2: Public Validator + Automation (Days 5-7)
- Public validator page (no auth required)
- AI Readiness Score and shareable reports
- Webhook listener for auto-refresh
- Email notifications
- Embeddable badge generator

### Phase 3: Billing + Marketplace Launch (Days 8-10)
- Stripe integration
- Usage enforcement
- Webflow App Marketplace submission
- Landing page and docs
- PostHog instrumentation

## Appendix: llms.txt Output Format (LLMX Spec v0.2)

```
# LLMX v0.2
# Generated by LLMX for Webflow
# https://llmx.dev

# Site metadata
Name: Acme Corp
Description: B2B SaaS for widget management
Generated: 2025-01-15T10:30:00Z

# Rules
Allow: /docs/*
Allow: /blog/*
Allow: /pricing
Disallow: /admin/*
Disallow: /internal/*

# Structured data
{"version":"0.2","site":{"name":"Acme Corp","url":"https://acme.com"},"pages":[...]}
```