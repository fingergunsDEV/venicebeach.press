# Venice Beach Press — coastal editorial direction

The owner's October 2026 design brief changes Press's primary role from the original creator showcase to a neighborhood publication for **local news, community announcements, classifieds, and the marketplace**. The original PRD remains as historical source material; this brief supersedes its Press positioning. Buzz remains the culture/entertainment discovery channel.

## Delivered implementation

A responsive text masthead, cream paper canvas, dark green ink, editorial serif headlines, readable sans-serif body, restrained rules, source-focused sidebar, community board, and local exchange section. Mobile navigation recomposes into a visible three-column grid. There is one H1, semantic navigation/section landmarks, a skip link, visible keyboard focus, and no autoplay, animation-dependent content, or flashing. Existing reduced-motion support remains active.

Palette: coastal cream `#f6f2e9`, deep ink `#243c37`, sea glass `#d3e1d8`, salt aqua `#91b4ac`, dusty coral `#a44e3d`, sun-washed peach `#cfa28d`, and pale butter `#e9d5aa`. Color is decorative; labels and text identify section/sponsor state. Dark typography carries essential information. The masthead is an original typographic treatment, not a claim to reproduce a supplied/registered logo. No approved logo was attached.

New public routes: `/news`, `/community`, `/classifieds`, `/marketplace`. They are included in Press's canonical sitemap and carry CollectionPage metadata. Empty sections say that no approved material is published; they do not invent news, business offers, or classified listings. Existing culture stories remain explicitly labeled samples.

Reporting fields: byline, source URL, publication timestamp, and last-verification timestamp. Publishing a non-sample Press Local news story requires these fields, a valid HTTPS source, non-future timezone-qualified dates, and the existing editorial verification/rights acknowledgment. The public story displays the byline and time/source information as real text. NewsArticle is emitted only for non-sample, non-sponsored local reporting with those fields; paid placements retain their disclosure and ordinary content schema. The publisher still must actually verify sources and permissions; a checked box does not perform reporting.

Press pages include a Venice Beach Place node with the Venice → Los Angeles → California → United States relationship. “Venice Beach right now” appears as a visitor's question leading to official resources; it is not represented as a place, a verified live feed, current surf/weather, or present event conditions. Official source pages control their own updates. Those external destinations were not live-validated by this environment.

## Imagery and rights

No source photography or approved brand assets were provided. The attempted Wikimedia research endpoint returned a proxy 403. This implementation therefore uses **original, explicitly captioned editorial illustration**, not documentary photography or generated evidence of a real event. The illustration has a low pier, ocean, people, and curved skatepark forms; it does not depict Santa Monica's Ferris wheel or imply a current observation.

Hero alt text: “Original coastal illustration: people beside a low pier, the ocean, and curved skatepark forms; not a documentary photograph.” The decorative stamp is hidden from assistive technology. Captions remain ordinary text below the image. Artwork source: `public/press-coast.svg`. Social preview source/PNG and favicon match the new palette and masthead.

When original, location-verified photos are available, store optimized local images under `public/editorial/` and use the CMS image-path, alt-text, credit, and rights-note fields. A real published item with all these fields can supply the cover instead of the illustration, with its credit and story link. Do not imply the image was captured now, and do not falsify author, location, date, or releases. Photography selection, editorial crops, permissions, and depiction of identifiable people still require human review.

## Validation actually completed

- Both repositories' HTTP suites: 12 passing tests, including new section routes, one homepage H1, local-news publication prerequisites, rejection of future verification times, visible source/date attribution, and NewsArticle/Place schema.
- Chromium desktop/mobile checks across the existing public routes and the four new Press sections: no horizontal overflow and native required form validation works.
- Dedicated Press checks at **360, 768, and 1440 pixels**: responsive reflow, one H1, keyboard skip navigation, visible focus through the first eight focusable controls, and zero automated axe WCAG A/AA violations.
- Screenshots inspected at desktop and at a 360px phone width. Previews: `docs/design/press-desktop.png` and `docs/design/press-mobile.png`.
- Repeat with both apps running: `npm run test:browser`; for the specific Press checks, `node scripts/review-press.mjs`.

These checks do not establish full WCAG 2.2 AA certification, a screen-reader audit, verified current reporting, authentic photography, or legal compliance. No rankings or AI citations are promised. Original photography, real reporting and notices, manual assistive-technology review, and production-domain validation remain outstanding.
