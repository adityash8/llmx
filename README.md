# LLMX for Webflow

**Generate, validate, and publish llms.txt files directly from Webflow.**

> AI visibility for your website in under 3 minutes.

LLMX for Webflow is a native Webflow App that automatically generates, validates, and publishes llms.txt files so large language models can reliably discover your sites canonical content.

## Features

- **Webflow OAuth Integration**: Connect your Webflow sites securely via OAuth
- **Auto-Detect Sitemaps**: Automatically finds and parses your sitemap.xml
- **Smart Rule Builder**: Webflow-specific presets for blog, docs, products, and static pages
- **URL Validation**: Validates HTTP status codes, canonical conflicts, robots.txt issues
- **Direct Publish**: Publish llms.txt to your site root via Webflow CMS API
- **Webhook Automation**: Auto-regenerate on site publish
- **AI Readiness Score**: Get an A-F grade with shareable reports
- **Public Validator**: Free validation tool at llmx.dev/validator

## Tech Stack

- **Framework**: Next.js 15 with TypeScript and Tailwind CSS
- **UI Components**: Radix UI with shadcn/ui
- **Authentication**: Supabase Auth + Webflow OAuth
- **Database**: Supabase PostgreSQL
- **Analytics**: PostHog
- **Error Tracking**: Sentry
- **Payments**: Stripe
- **Emails**: Resend

## Pricing

| Plan | Price | Sites | URLs | Features |
|------|-------|-------|------|----------|
| Free | $0 | 1 site | 500 URLs | Manual refresh only |
| Pro | $9/mo | 5 sites | 5,000 URLs | Webhook automation, priority support |

## Quick Start

1. Clone the repository
2. Run: npm install
3. Copy env.example to .env.local and add your credentials
4. Run: npm run dev
5. Open http://localhost:3000

## License

MIT License - see LICENSE file for details.

---

Built with love for the AI community and Webflow users.