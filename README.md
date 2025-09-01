# LLMX - The llms.txt Generator

"Tell AI what to read."

LLMX generates, validates, and maintains production-ready llms.txt files so large language models can reliably discover your site's canonical content.

## 🚀 Features

- **Auto-Detect Sitemaps**: Automatically finds and parses your sitemap.xml, including nested sitemaps
- **Smart Validation**: Validates URLs for status codes, canonical conflicts, and robots.txt issues
- **Production Ready**: Export to file or create GitHub PRs with automatic refresh scheduling
- **Rule-Based Filtering**: Choose preset rules or create custom include/exclude patterns
- **AI-Ready Scoring**: Get a comprehensive score and validation report

## 🛠 Tech Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **UI Components**: Radix UI with shadcn/ui
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **GitHub Integration**: Octokit for PR creation
- **Analytics**: PostHog
- **Error Tracking**: Sentry
- **Payments**: Stripe

## 🏃‍♂️ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/llmx.git
   cd llmx
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── generate/          # Generation workflow pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── forms/            # Form components
├── lib/                   # Utility functions
│   ├── sitemap.ts        # Sitemap processing
│   ├── llms-txt.ts       # llms.txt generation
│   ├── validation.ts     # URL validation
│   └── utils.ts          # General utilities
├── types/                 # TypeScript type definitions
└── hooks/                 # Custom React hooks
```

## 🔧 Core Functionality

### Sitemap Processing
- Detects sitemap.xml, sitemap_index.xml, and sitemaps.xml
- Parses nested sitemaps recursively
- Handles large sitemaps with configurable URL limits

### llms.txt Generation
- Creates both robots-style and JSON sections
- Supports include/exclude rules with regex patterns
- Includes preset rules for common website types (blog, docs, ecommerce, SaaS)

### URL Validation
- Checks HTTP status codes
- Validates canonical URL conflicts
- Detects robots.txt conflicts
- Checks content freshness
- Identifies duplicate URLs

### Export Options
- Copy to clipboard
- Download as file
- Create GitHub PR (coming soon)

## 🎯 Roadmap

### Phase 1: MVP (Current)
- ✅ Core sitemap detection and parsing
- ✅ llms.txt generation with rules
- ✅ URL validation and scoring
- ✅ Basic export functionality
- 🔄 GitHub PR integration
- 🔄 Public validator

### Phase 2: Automation
- Cron job scheduling
- Webhook integration
- Email notifications
- Advanced analytics

### Phase 3: Enterprise
- API access
- White-label solutions
- Advanced reporting
- Team collaboration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@llmx.dev
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/llmx/issues)
- 📖 Docs: [docs.llmx.dev](https://docs.llmx.dev)

---

Built with ❤️ for the AI community
