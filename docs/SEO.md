# Page heads, schema, assets, and deployment

Both repositories are self-contained Node 24 applications. Buzz is the editing source of truth for shared code; `npm run sync:press` copies the shared engine, assets, tests, and docs into the existing sibling Press checkout. Each repository has its own entry point, lockfile, Dockerfile, static assets, and tests, and can run without the other checkout. Running a unified publishing operation still requires the two processes to share a persistent SQLite directory on one host; this is not a distributed database architecture.

## Generated per request

`src/seo.js` builds one canonical, unique route metadata, and a connected JSON-LD `@graph`. `src/app.js` renders HTML at each route; separate static HTML files are not required. The canonical base defaults to the confirmed domain for that channel (`https://venicebeach.buzz` or `https://venicebeach.press`). Set `PUBLIC_URL` to override it for staging or deployment. A canonical does not prove that DNS or TLS has been deployed. `BUZZ_URL`/`PRESS_URL` control cross-channel links.

Every public HTML page has charset, viewport, title, description, robots directive, theme/color metadata, canonical, Open Graph, Twitter sharing tags, favicon, manifest, CSS, and one small deferred enhancement script. The script prevents duplicate native form submissions and resets state on back navigation; core browsing/forms work without it. JSON-LD is inert data and uses a CSP nonce; `defer` is intentionally applied only to executable JavaScript. No inline event handlers or third-party tracking scripts are introduced.

Public graph nodes connect the legal owner Organization, channel publisher Organization, WebSite, typed WebPage, and visible BreadcrumbList with stable `@id` references. Content adds an Article, Event, CreativeWork, or a ProfilePage with a Person/Organization only when a verified creator name/type is supplied. Sponsored content remains visibly labeled and is never marked as a Review. Event addresses and creator identities must be verified; there is no invented author, attendance, price, review, award, or rating. Google rich-result eligibility is not guaranteed by syntactically valid schema.

| Routes                                                                                       | Page graph / indexing                                                              |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/`                                                                                          | WebPage, WebSite, Organizations, BreadcrumbList                                    |
| `/events`, `/creators`, `/explore`                                                           | CollectionPage; ItemList when real published entries exist                         |
| `/about`                                                                                     | AboutPage                                                                          |
| `/contact`, `/inquire`                                                                       | ContactPage; inquiry is not a contract                                             |
| `/sponsor`, `/submit`, `/newsletter`, `/privacy`, `/terms`, `/disclosures`, `/accessibility` | WebPage with route-specific metadata                                               |
| `/stories/:slug`                                                                             | WebPage and matching content entity; verified creator profiles can use ProfilePage |
| `/admin/*`, `/privacy/request`, `/newsletter/manage/:token`                                  | Noindex; no entity graph; token/staff canonical paths are sanitized                |
| POST confirmations, errors, search results                                                   | Noindex; no private request data in schema                                         |
| Sample stories                                                                               | Noindex WebPage graph only; no fabricated Article/Event/Person entities            |

Allowed category/tag/date filters have normalized canonical queries; query order is stable. Search text is omitted from canonical URLs and schema and search results are noindex. Empty filtered archives are noindex. Unknown tracking parameters never enter canonicals. Static routes have their own descriptions; story descriptions come from visible summaries.

`/sitemap.xml` is generated separately for each channel, includes every indexable static public route plus real currently published channel content with actual update timestamps, and excludes samples, drafts, scheduled-future stories, private workflows, and POST/search variants. `/robots.txt` points to that channel's sitemap. `/site.webmanifest` supplies the channel name, colors, and SVG icon without promising offline functionality. Do not create stale checked-in sitemap copies.

## Fonts and assets

Default fonts are local Latin-subset WOFF2 files: variable DM Sans (normal) and DM Serif Display (normal and italic). Files and redistribution licenses live in `public/fonts/`. Only the primary sans font is preloaded; font CSS is linked directly rather than chained through CSS `@import`. `font-display: optional` keeps fallback text available and limits late font swaps. The licenses are retained. Original social preview PNGs are 1200×630 and have editable SVG sources. `npm run generate:social` regenerates them using local Chromium; it makes no external image/font requests.

Optional `FONT_SOURCE=google` replaces local font CSS/preload with Google Fonts CSS, explicit preconnect hints to `fonts.googleapis.com` and `fonts.gstatic.com` (crossorigin on the latter), minimal families/weights, and `display=optional`. CSP permits only those font/style hosts in that mode. This changes third-party data processing and is described in the privacy notice. The default local path has been exercised; live Google CDN fetches have not been validated in this restricted environment. There is no reason to enable the CDN when local hosting is preferable.

Production static assets use ETags and one-day cache lifetimes; assets are not declared immutable because filenames are not hashed. Private responses use no-store. Production TLS/compression should be provided by the deployment proxy; this code does not configure DNS, a certificate, a CDN, or guarantee Core Web Vitals.

## Commands

- `npm ci --ignore-scripts` then `npm start` in either repository installs and starts that application independently.
- `npm test` validates route heads, canonicals, graph JSON and references, public assets, sitemap inclusion/exclusion, content types, and the existing publishing/compliance flows.
- With both apps running and system Chromium available: `npm run test:browser` checks desktop/mobile layouts and automated accessibility. This is not real-user performance or complete accessibility certification.
- `npm run format:check` checks source formatting.
- `docker build -t venicebeach-buzz .` or the equivalent Press tag builds the production image; each image has a non-root user and health check. Runtime data belongs on a persistent `/data` volume.
- The Buzz `compose.yaml` starts both built images sharing one named data volume. Configure production origins, credentials, TLS termination, backups, and provider settings before launch. Do not expose database files as static assets.

Legal review and live provider/domain validation remain separate from technical metadata checks; see COMPLIANCE.md.

The optional `edge` Compose profile supplies a Caddy reverse proxy with automatic HTTPS and gzip/zstd compression for both confirmed domains. It is **not running or deployed**. Configure DNS/firewall and review production settings before running `docker compose --profile edge up -d`; that action would begin live hosting and certificate issuance. TLS and compression were not validated against public domains in this task.

For restrictive build environments, Dockerfiles support an optional BuildKit `npm_ca` secret for the authoritative CA bundle, standard HTTP_PROXY/HTTPS_PROXY/NO_PROXY build arguments, and normal TLS verification. The CA secret is mounted only during dependency installation and is not copied into the image. Runtime deployments using proxy-backed providers may also require their own trust configuration. No verification bypass is supported.
