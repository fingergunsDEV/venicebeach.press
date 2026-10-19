# VeniceBeach.press

The creators and projects shaping Venice Beach culture. Built from the October 2026 PRD/DRM, under the VeniceBeach.media umbrella. Holistic Growth Marketing LLC appears only as legal publisher.

## Run locally

From this repository (Node.js 24+):

```sh
npm ci --ignore-scripts
npm start
```

This channel defaults to port 3001. `npm run dev` enables file watching, and `npm test` runs the local test suite. `/health` checks the channel and database. Use `DATA_DIR` to select persistent storage; the cloud workspace default is `/workspace/shared/venice-network`. Start the other channel separately when validating cross-channel navigation.

For both existing cloud checkouts together, `bash /workspace/venicebeach.buzz/scripts/setup.sh` installs their locked dependencies and runs the shared workflow tests. Production container and optional reverse-proxy setup is in `docs/SEO.md`.

## Shared architecture

Node.js 24+, Express 5, server-rendered HTML, CSS, and built-in SQLite. There is no frontend compilation step. Both repositories include their own server, assets, tests, and Dockerfile and can run independently. Buzz is the source of truth for shared code; run `npm run sync:press` from Buzz in the paired workspace to refresh the Press copy. To share one publishing database, run both applications on one host with the same persistent `DATA_DIR` (or use the supplied Compose setup). SQLite is not a multi-host database. See `docs/SEO.md` for page heads, schema graphs, fonts, assets, sitemaps, and deployment.

The default database is `/workspace/shared/venice-network/network.sqlite`, outside both checkouts. First startup inserts six explicitly labeled sample stories. No fictional events are presented as current. Data, passwords, and private inquiries must never be committed. Use Node 24's `node:sqlite` backup API for online backups; copying a live WAL database file alone is unsafe. Provide persistent storage, backups, TLS termination, process supervision, and resource limits before production use.

## Configuration

`.env.example` documents supported variables; the app does **not** automatically load `.env`. Export variables in the process environment or use a deployment secret manager. All passwords and API keys are missing in the supplied cloud environment. Never put them in chat, source, command history, or saved setup scripts.

| Variable                                                     | Purpose                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `PORT`                                                       | 3000 for Buzz, 3001 for Press by default                                                   |
| `DATA_DIR`                                                   | Same persistent directory for both processes                                               |
| `PUBLIC_URL`                                                 | This process's public origin (used for canonical URLs, form-origin checks, secure cookies) |
| `BUZZ_URL`, `PRESS_URL`                                      | Cross-channel public origins; defaults use local development ports                         |
| `ADMIN_PASSWORD`                                             | Administrator role; at least 16 characters; disabled when missing                          |
| `EDITOR_PASSWORD`                                            | Editor role; separate strong password                                                      |
| `CONTRIBUTOR_PASSWORD`                                       | Contributor role; separate strong password                                                 |
| `COMMERCIAL_PASSWORD`                                        | Commercial role; separate strong password                                                  |
| `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_SERVER` | Optional real newsletter integration; server format `us1`                                  |

For deployed origins, configure `PUBLIC_URL` separately for each process, and set both cross-channel URLs to the deployed domains. Session cookies are HttpOnly, SameSite Strict, and Secure for HTTPS origins. Login is per process, with an eight-hour in-memory session. This initial role-password approach is appropriate for a small controlled pilot; individual accounts, password recovery, MFA, and an identity provider remain launch hardening work. Keep the publishing desk behind trusted access until then. Rate limiting is per process; a production edge should add shared abuse protection. Proxy IP trust is deliberately disabled by default.

## Publishing and commercial operations

1. Set the relevant role passwords securely and restart. Visit `/admin/login`.
2. An administrator/editor creates a record using story, event, profile, or project templates. Save a draft or send for review; editors can inspect the private preview. Contributors can create drafts/review requests but cannot edit existing records or publish.
3. Verify source details, rights, links, and event times. Use ISO 8601 timestamps **with timezone offsets**. Published future-scheduled stories remain private until their time arrives. The calendar excludes past and sample events; date filters use America/Los_Angeles. Scheduled content becomes visible on request without a background scheduler.
4. Upload rights-cleared images through the deployment filesystem to Buzz's `public/editorial/`; set their local `/assets/editorial/...` path, alt text, credit, and rights notes in the editor. Images are optional; sample art is original CSS illustration. Optimize image files before adding them. This is not an image-upload service.
5. Link an event to the ID of its original creator/project record. The public related-content link points to that record's channel; records are not duplicated across domains.
6. Paid content must have its sponsor name set. Campaign IDs accept letters, numbers, and hyphens, and must not contain personal data. Views and outbound clicks retain the content campaign ID. Official links must use HTTPS.
7. Review `/admin` for private submissions and sponsorship inquiries. Update moderation and sales stages; accepted submissions do not automatically publish. Editors see submissions, commercial staff see inquiries and agreements, and administrators see both. Editorial and commercial decisions remain separate.
8. Record **signed agreements**, their recurring/one-time classification, deliverables, and renewal dates. Cancelled/paused and one-time agreements do not count toward contracted MRR. Renewal dates and deliverables are stored for manual fulfillment; the application does not issue invoices, charge cards, or measure collected cash.
9. Export monthly event/channel/content/campaign counts from `/admin/report.csv`. Counts include operator/preview traffic; they are not deduplicated audience estimates or proof of sales. Reconcile against contracted deliverables manually. Audit entries and content revision snapshots are retained in the database.

## Newsletter and privacy

Without Mailchimp configuration, signup stores a private consent request with `pending_configuration` status and says explicitly that no email has been sent. With all three variables configured, the application requests Mailchimp double opt-in and records `pending_confirmation`; actual confirmation, segmented campaigns, delivery, and unsubscribe links are managed in Mailchimp. Pending local signups are **not** silently imported later; publishers must use an approved consent-aware migration or ask users to sign up again. Provider connectivity has not been validated against a live account.

Contact details and submission bodies never enter analytics. Private requests remain in the shared database and authorized role views. The privacy/terms pages are initial operational disclosures, not completed legal review. Establish retention/deletion procedures and publish a verified contact identity before launch. The app does not automatically delete records or synchronize provider confirmation status. A private management link can withdraw a local request and request provider unsubscribe; failed provider updates create an administrator-only follow-up.

## Validation

`npm test` runs isolated HTTP integration tests against temporary databases. Tests exercise both brands, private moderation, input validation, authentication/CSRF, role separation, publication/expiry/scheduling, cross-channel visibility, safe escaping/URLs, campaign reports, revenue classification, and honest pending-newsletter behavior. It does not call an email provider or payment processor. No production secret is needed for tests.

Chromium checks were also run at 1440px and 390px across 13 routes per channel: no horizontal overflow, public pages render, and required form fields prevent empty submissions. This is not a WCAG certification or evidence of real-user Core Web Vitals.

## Delivery boundaries

Implemented: branded discovery/showcase experiences; categories and search; event/date browsing; shared content and related creator records; draft/review/scheduled/published/archive workflows; local rights-noted images; role permissions; revisions/audit; private submissions and inquiries; sponsor catalog; agreements and manual CRM stages; internal analytics and CSV reports; metadata, canonicals, sitemap, robots, and Article/Event JSON-LD for non-sample content; privacy/contact/publisher pages.

Still required before public launch: original permission-cleared stories and verified events; production origins/storage/TLS; secure role credentials; live email-provider setup and unsubscribe/delivery verification; privacy/accessibility review and retention policy; real sponsor contracts and an agreed fulfillment process. No audience, campaign performance, or revenue figures are fabricated.

Later phases from the PRD: recurring payment processing and webhook reconciliation, automatic invoicing/dunning, campaign inventory/exclusivity enforcement, email segmentation and confirmation-state sync, deduplicated cross-domain analytics, automatic sponsor reports and renewal reminders, individual user management, and a richer creator/venue/sponsor entity model. The current project is a working pilot foundation; it is not the entire production release described by the PRD.

Automated axe-core WCAG A/AA checks also found zero violations on 11 public routes per channel at mobile width. Manual assistive-technology and full accessibility review remain necessary.

With both apps running and system Chromium available at `/usr/bin/chromium`, run `npm run test:browser` from the Buzz checkout to repeat desktop/mobile checks and axe accessibility scans. Screenshots are written to ignored `artifacts/`. CSP bypass is confined to the automated axe test context; application security policy stays enabled.

## Commercial compliance review

Both sites are commercial properties operated by Holistic Growth Marketing LLC, a California single-member LLC. See the Buzz repository’s `docs/COMPLIANCE.md` for implemented controls and open launch prerequisites. From Buzz, `npm run check:launch` identifies missing public contact/address, origins, administrator credentials, and live-email configuration. This is a technical check, not legal certification. Google advertising is not installed.

Public business defaults supplied by the owner are in Buzz `src/business.js`: 215 Market Street, Venice, CA 90291; each channel uses its matching `info@` mailbox for privacy/accessibility, with jason@holisticgrowthmarketing.com as publisher contact and info@venicebeach.media for network inquiries. `PRIVACY_EMAIL` and `BUSINESS_ADDRESS` may override defaults per deployment. Mailbox delivery has not been tested.

For standalone setup in this repository, run `npm ci --ignore-scripts` and `npm start`. All runtime files are included locally. Page metadata and sitemap behavior are documented in `docs/SEO.md`.
