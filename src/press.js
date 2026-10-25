export const PRESS_SECTIONS = {
  "/news": {
    title: "Local news",
    category: "Local news",
    description:
      "Reporting about Venice Beach, its streets, public spaces, and the people who call it home.",
  },
  "/community": {
    title: "Community",
    category: "Community",
    description:
      "Neighborhood announcements, useful notices, and ways to take part in Venice life.",
  },
  "/classifieds": {
    title: "Classifieds",
    category: "Classifieds",
    description:
      "A place for neighborhood opportunities, services, and community listings.",
  },
  "/marketplace": {
    title: "Marketplace",
    category: "Marketplace",
    description:
      "Discover independent businesses, local makers, and offers from the neighborhood.",
  },
};
export function pressHeader() {
  return `<div class="press-location"><span>VENICE BEACH · LOS ANGELES, CALIFORNIA</span><a href="/about">Independent perspective. Local character.</a></div><header class="press-header"><a class="press-wordmark" href="/" aria-label="Venice Beach Press home"><span>Venice Beach</span><strong>PRESS<span class="press-dot">.</span></strong></a><div class="press-masthead-note">For the neighborhood.<br>By the coast.</div><a class="press-subscribe" href="/newsletter"><span class="press-subscribe-long">Get the neighborhood edit</span><span class="press-subscribe-short">The local edit</span> <span aria-hidden="true">→</span></a></header><nav class="press-nav" aria-label="Main"><a href="/news">Local news</a><a href="/community">Community</a><a href="/classifieds">Classifieds</a><a href="/marketplace">Marketplace</a><a href="/explore">Culture &amp; stories</a><a class="press-nav-commercial" href="/sponsor">Advertise with us <span aria-hidden="true">→</span></a></nav>`;
}
export function pressNewsletter() {
  return `<section class="press-newsletter"><div><span class="press-kicker">A NOTE FROM THE NEIGHBORHOOD</span><h2>Stay close to what matters.</h2><p>Local stories, community notices, and clearly labeled partner messages. A quieter kind of inbox.</p></div><a class="press-button" href="/newsletter">Request the neighborhood edit <span aria-hidden="true">→</span></a></section>`;
}
export function pressHome({ items, card, esc }) {
  const photo = items.find(
    (c) =>
      !c.demo && c.image_path && c.image_alt && c.image_credit && c.rights_note,
  );
  const cover = photo
    ? `<img src="${esc(photo.image_path)}" width="900" height="1050" fetchpriority="high" alt="${esc(photo.image_alt)}"><figcaption>${esc(photo.image_credit)} · <a href="/stories/${esc(photo.slug)}">${esc(photo.title)}</a></figcaption>`
    : null;
  return `<section class="press-lead"><div class="press-lead-copy"><div class="press-kicker"><span class="press-rule"></span>ROOTED HERE. LOOKING CLOSER.</div><h1>Venice Beach,<br><em>in focus.</em></h1><p class="press-deck">The people. The places.<br>The everyday life in between.</p><p class="press-intro">A home for local news, community announcements, classifieds, and the neighborhood marketplace. From the water’s edge to the streets we share.</p><a class="press-button" href="/news">Explore local news <span aria-hidden="true">→</span></a><div class="press-lead-footnote">Coastal in character. Community at heart.</div></div><figure class="press-cover">${cover || '<img src="/assets/press-coast.svg" width="900" height="1050" fetchpriority="high" alt="Original coastal illustration: people beside a low pier, the ocean, and curved skatepark forms; not a documentary photograph."><figcaption>Venice Beach, Los Angeles · original editorial illustration</figcaption>'}<div class="press-cover-stamp" aria-hidden="true">A LOCAL<br>POINT OF<br><em>VIEW.</em></div></figure></section><section class="press-purpose" aria-label="Publication sections"><span>YOUR NEIGHBORHOOD, ON THE RECORD.</span><a href="/news">Local news</a><span aria-hidden="true">*</span><a href="/community">Community</a><span aria-hidden="true">*</span><a href="/classifieds">Classifieds</a><span aria-hidden="true">*</span><a href="/marketplace">Marketplace</a></section><section class="press-editorial"><div class="press-stories"><div class="press-section-head"><div><div class="press-kicker">PEOPLE &amp; PERSPECTIVES</div><h2>A place with a point of view.</h2></div><a href="/explore">All stories <span aria-hidden="true">→</span></a></div>${items.some((c) => c.demo) ? '<p class="press-preview">Preview edition · Stories labeled “Sample content” are editorial layout examples, not verified reports.</p>' : ""}<div class="press-story-grid">${items.slice(0, 4).map(card).join("") || "<p>No stories have been published yet.</p>"}</div></div><aside class="press-sidebar"><section class="press-source-box"><div class="press-kicker">START WITH THE SOURCE</div><h2>Looking for Venice Beach right now?</h2><p>For current services, access, or travel information, check official updates and their publication dates.</p><ul><li><a href="https://www.laparks.org/" rel="noopener">Parks &amp; public spaces <span aria-hidden="true">→</span></a><span>Los Angeles Recreation and Parks</span></li><li><a href="https://lacity.gov/" rel="noopener">City services &amp; notices <span aria-hidden="true">→</span></a><span>City of Los Angeles</span></li><li><a href="https://www.metro.net/" rel="noopener">Getting around <span aria-hidden="true">→</span></a><span>LA Metro</span></li></ul><p class="press-source-note">Official resources, not a live conditions feed. Information is maintained by each source.</p></section><section class="press-community-box"><div class="press-kicker">THE COMMUNITY BOARD</div><h2>Something worth sharing?</h2><p>A neighborhood notice. A local project. An idea that brings people together.</p><a href="/submit">Send it to the desk <span aria-hidden="true">→</span></a><small>Reviewed before publication. Never a promise of coverage.</small></section></aside></section><section class="press-market"><div class="press-market-art" aria-hidden="true"><span>LOCAL<br>FINDS<span class="press-art-star">*</span></span><div class="press-market-lines"></div></div><div class="press-market-copy"><div class="press-kicker">THE NEIGHBORHOOD EXCHANGE</div><h2>Good things.<br><em>Close to home.</em></h2><p>Independent businesses, useful services, and opportunities around the corner. Keep your next discovery local.</p><div class="press-market-actions"><a class="press-button" href="/classifieds">Browse classifieds <span aria-hidden="true">→</span></a><a href="/marketplace">Explore the marketplace</a></div></div></section><section class="press-publisher-note"><span class="press-kicker">ONE NEIGHBORHOOD. MANY VOICES.</span><p>Surfers and shopkeepers. Artists and families. The early shift and the last light. Venice is the people who make a life here.</p><a href="/about">Get to know the publication <span aria-hidden="true">→</span></a></section>`;
}
export function mountPressSections(app, { page, live, card }) {
  for (const [path, section] of Object.entries(PRESS_SECTIONS))
    app.get(path, (req, res) => {
      const items = live().filter((c) => c.category === section.category);
      page(
        res,
        section.title,
        `<section class="pagehead press-section-page"><div class="press-kicker">VENICE BEACH / ${section.title.toUpperCase()}</div><h1>${section.title}</h1><p>${section.description}</p></section><section class="section"><div class="grid">${items.map(card).join("") || `<div class="empty"><h2>${section.title === "Local news" ? "Reporting begins with verification." : "Room on the neighborhood board."}</h2><p>${section.title === "Local news" ? "No verified local news stories are published in this section yet. We do not fill the gap with invented headlines." : "No approved listings are published in this section yet. Submissions are reviewed for accuracy, suitability, and permissions."}</p><a href="/submit">Contact the editorial desk</a></div>`}</div></section>`,
        { path, description: section.description, items },
      );
    });
}
