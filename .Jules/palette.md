## 2024-05-24 - Accessibility: Added aria-label to icon-only buttons
**Learning:** Found that Lucide React icons within Radix UI or shadcn/ui buttons frequently lack screen reader context, making them inaccessible.
**Action:** Always verify icon-only buttons have an `aria-label` to ensure keyboard and screen reader accessibility.
