# Drugnews Product Function And Revenue Audit

Last updated: 2026-06-28

This document is the product filter for Drugnews website features. The site should not keep adding visible functions just because they are technically possible. Every visible function should serve at least one business outcome:

- Traffic growth from Google, AI search, or social distribution.
- Reader trust and repeat reading.
- Paid-column conversion.
- Company collaboration / IR service leads.
- Machine-readable discovery for search and AI answer engines.

## Keep As Primary Navigation

Primary navigation should stay short. The reader should immediately understand where to read, learn, pay, or collaborate.

- Home: brand positioning and latest free article.
- Articles: the main archive and search experience.
- Topics: SEO landing pages for high-intent keywords such as GLP-1, BD, clinical data, valuation, and biotech investing.
- Guides: evergreen education pages for new investors and repeat search traffic.
- Paid Research: subscription conversion to Vocus.
- Company Services: B2B collaboration and IR content lead generation.
- English: international discovery and company-service credibility.

## Keep, But Do Not Put In Primary Navigation

These features are useful, but they should not compete with reader or revenue paths in the main navigation.

- Company Index: useful for search, internal linking, and company-name queries. Keep it indexed and linked from article center / footer, not primary nav.
- Capital-Market Radar: useful for AI/search-readable market clustering and internal research. Keep it in sitemap, `llms.txt`, `ai-index.json`, and footer / secondary links, not primary nav.
- Team page: important for trust and service sales, but should be reached from bylines, service pages, and footer rather than the top nav.

## Remove Or Avoid

Do not add visible features unless they clearly improve one of the outcomes above.

- Decorative dashboards without a conversion path.
- Repeated article blocks that show the same list in multiple sections.
- Metrics panels that do not help readers decide what to read next.
- Internal automation status UI intended for Codex rather than readers.
- Extra top-level links that dilute paid-column or company-service conversion.

## Revenue Logic

Drugnews should support two revenue paths:

- Reader revenue: free daily analysis builds habit and trust; topic pages and guides capture search demand; article pages and topic pages route readers toward Vocus paid research.
- Company revenue: trust pages, team credibility, collaboration cases, and article quality route qualified biotech / pharma / IR teams toward company-service inquiries.

## Conversion Measurement

Revenue-related links should be measurable. External paid-column links should carry UTM tags that identify the source page or placement, such as article sidebar, subscribe hero, or follow bar. This keeps the visible website simple while making it possible to judge which paths actually create paid-column interest.

## Current Product Decision

As of this audit, the main navigation is simplified to:

Home / Articles / Topics / Guides / Paid Research / Company Services / English

Company Index, Capital-Market Radar, and Team remain available but are intentionally demoted from the main reader path.

## Future Feature Gate

Before shipping a new visible feature, answer:

1. Which traffic source does it help?
2. Which revenue path does it improve?
3. What reader decision becomes easier?
4. Can the same outcome be achieved by improving an existing page instead?
5. How will we know whether it worked after GA4 and Search Console are connected?
