import { businessContact } from "./business.js";
import { PRESS_SECTIONS } from "./press.js";
export const PUBLIC_PAGES = {
  "/": {
    type: "WebPage",
    description:
      "Discover Venice Beach music, independent film, events, artists, and creative culture.",
  },
  "/events": {
    type: "CollectionPage",
    description:
      "Browse verified upcoming Venice Beach events, live music, screenings, and cultural happenings.",
  },
  "/creators": {
    type: "CollectionPage",
    description:
      "Meet the musicians, filmmakers, artists, and creative projects shaping Venice Beach culture.",
  },
  "/explore": {
    type: "CollectionPage",
    description:
      "Explore Venice Beach stories and creative projects by category and tag.",
  },
  "/sponsor": {
    type: "WebPage",
    description:
      "Explore custom advertising placements and campaign packages across VeniceBeach.buzz and VeniceBeach.press.",
  },
  "/inquire": {
    title: "Advertising and campaign inquiries",
    type: "ContactPage",
    description:
      "Ask about a custom Venice Beach advertising placement, creator campaign, or event promotion.",
  },
  "/contact": {
    title: "Contact the publishing team",
    type: "ContactPage",
    description:
      "Contact the Venice Beach publishing team about advertising, editorial corrections, or general inquiries.",
  },
  "/submit": {
    type: "WebPage",
    description:
      "Submit a Venice Beach event, creator, or project for private editorial review.",
  },
  "/newsletter": {
    type: "WebPage",
    description:
      "Request the VeniceBeach.media music, film, and culture email edit with explicit permission and unsubscribe controls.",
  },
  "/about": {
    type: "AboutPage",
    description:
      "Learn about VeniceBeach.media’s commercial culture publications, operated by Holistic Growth Marketing LLC.",
  },
  "/privacy": {
    type: "WebPage",
    description:
      "How Holistic Growth Marketing LLC handles information collected on VeniceBeach.buzz and VeniceBeach.press.",
  },
  "/terms": {
    type: "WebPage",
    description:
      "Website use, intellectual property, and commercial advertising terms for Venice Beach’s culture network.",
  },
  "/disclosures": {
    type: "WebPage",
    description:
      "Our policy on paid advertisements, editorial independence, sponsorship disclosures, and advertising claims.",
  },
  "/accessibility": {
    type: "WebPage",
    description:
      "Accessibility goals and support contacts for VeniceBeach.buzz and VeniceBeach.press.",
  },
};
export function publicPages(channel) {
  if (channel !== "press") return PUBLIC_PAGES;
  return {
    ...PUBLIC_PAGES,
    "/": {
      type: "WebPage",
      description:
        "Local news, community announcements, classifieds, and the neighborhood marketplace for Venice Beach, Los Angeles.",
    },
    "/about": {
      type: "AboutPage",
      description:
        "Meet Venice Beach Press, a commercial neighborhood publication operated by Holistic Growth Marketing LLC.",
    },
    "/newsletter": {
      type: "WebPage",
      description:
        "Request the Venice Beach Press neighborhood email edit, with explicit consent and simple withdrawal controls.",
    },
    ...Object.fromEntries(
      Object.entries(PRESS_SECTIONS).map(([path, s]) => [
        path,
        { type: "CollectionPage", description: s.description },
      ]),
    ),
  };
}
export function publicOrigin(channel) {
  const u = new URL(process.env.PUBLIC_URL || `https://venicebeach.${channel}`);
  if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
    throw new Error("PUBLIC_URL must be an HTTP(S) origin without credentials");
  return u.origin;
}
export function absolute(path, origin) {
  const u = new URL(origin);
  u.pathname = path;
  u.search = "";
  u.hash = "";
  return u.href;
}
export const jsonLD = (value) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
export function pageMetadata({
  channel,
  request,
  title,
  description,
  path,
  noindex = false,
  status = 200,
  content = null,
  items = [],
}) {
  const origin = publicOrigin(channel),
    reqPath = request?.path || path || "/",
    query = request?.query || {};
  const privatePage =
    reqPath.startsWith("/admin") ||
    reqPath.startsWith("/newsletter/manage/") ||
    reqPath === "/privacy/request";
  const cleanPath = privatePage
    ? reqPath.startsWith("/admin")
      ? "/admin"
      : reqPath.startsWith("/newsletter/manage/")
        ? "/newsletter"
        : reqPath
    : path || reqPath;
  const canonical = new URL(absolute(cleanPath, origin));
  const search = typeof query.q === "string" && query.q.trim();
  const filters = [];
  if (["/events", "/creators", "/explore"].includes(cleanPath) && !search)
    for (const key of ["category", "tag", "date"]) {
      const v = query[key];
      if (
        typeof v === "string" &&
        v.length <= 80 &&
        /^[a-zA-Z0-9 -]+$/.test(v)
      ) {
        canonical.searchParams.set(key, v);
        filters.push(v);
      }
    }
  const filterLabel = filters.length ? " — " + filters.join(" / ") : "";
  const fullTitle = `${publicPages(channel)[cleanPath]?.title || title}${filterLabel} · VeniceBeach.${channel}`;
  const summary =
    description ||
    publicPages(channel)[cleanPath]?.description ||
    "Venice Beach music, film, art, events, and creative projects.";
  const exclude =
    noindex ||
    privatePage ||
    status !== 200 ||
    request?.method === "POST" ||
    !!search ||
    !!content?.demo ||
    (filters.length > 0 && items.length === 0);
  const image = content?.image_path
    ? absolute(content.image_path, origin)
    : absolute(`/assets/social-${channel}.png`, origin);
  const crumbs = [{ name: "Home", url: absolute("/", origin) }];
  if (cleanPath !== "/") {
    if (content)
      crumbs.push({
        name: content.category,
        url: new URL(
          "/explore?category=" + encodeURIComponent(content.category),
          origin,
        ).href,
      });
    crumbs.push({ name: title, url: canonical.href });
  }
  // Staff and bearer-token pages deliberately have no entity graph or private data.
  if (privatePage || request?.method === "POST" || status !== 200)
    return {
      canonical: canonical.href,
      title: fullTitle,
      description: summary,
      noindex: true,
      image,
      crumbs: [],
      graph: null,
      ogType: "website",
    };
  const owner = "https://holisticgrowthmarketing.com/#organization",
    publisher = origin + "/#publisher",
    website = origin + "/#website",
    webpage = canonical.href + "#webpage";
  const details = businessContact(channel);
  const graph = [
    {
      "@type": "Organization",
      "@id": owner,
      name: details.name,
      url: "https://holisticgrowthmarketing.com/",
      address:
        details.address === "215 Market Street, Venice, CA 90291"
          ? {
              "@type": "PostalAddress",
              streetAddress: "215 Market Street",
              addressLocality: "Venice",
              addressRegion: "CA",
              postalCode: "90291",
              addressCountry: "US",
            }
          : details.address,
      email: details.publisherEmail,
    },
    {
      "@type": "Organization",
      "@id": publisher,
      name: `VeniceBeach.${channel}`,
      url: origin + "/",
      parentOrganization: { "@id": owner },
      email: details.privacyEmail,
      publishingPrinciples: origin + "/disclosures",
    },
    {
      "@type": "WebSite",
      "@id": website,
      url: origin + "/",
      name: `VeniceBeach.${channel}`,
      inLanguage: "en-US",
      publisher: { "@id": publisher },
    },
    {
      "@type": publicPages(channel)[cleanPath]?.type || "WebPage",
      "@id": webpage,
      url: canonical.href,
      name: fullTitle,
      description: summary,
      inLanguage: "en-US",
      isPartOf: { "@id": website },
      publisher: { "@id": publisher },
      breadcrumb: { "@id": canonical.href + "#breadcrumb" },
    },
    {
      "@type": "BreadcrumbList",
      "@id": canonical.href + "#breadcrumb",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    },
  ];
  const page = graph[3];
  if (channel === "press") {
    graph.push({
      "@type": "Place",
      "@id": origin + "/#venice-beach",
      name: "Venice Beach",
      containedInPlace: {
        "@type": "Place",
        name: "Venice",
        containedInPlace: {
          "@type": "City",
          name: "Los Angeles",
          containedInPlace: {
            "@type": "State",
            name: "California",
            containedInPlace: { "@type": "Country", name: "United States" },
          },
        },
      },
    });
    page.about = { "@id": origin + "/#venice-beach" };
  }
  if (content && !content.demo) {
    const id = canonical.href + "#content";
    page.mainEntity = { "@id": id };
    let entity = {
      "@type":
        content.kind === "event"
          ? "Event"
          : content.kind === "project"
            ? "CreativeWork"
            : "Article",
      "@id": id,
      url: canonical.href,
      name: content.title,
      description: content.summary,
      mainEntityOfPage: { "@id": webpage },
    };
    if (content.kind === "event")
      Object.assign(entity, {
        startDate: content.event_date,
        location: {
          "@type": "Place",
          name: content.venue,
          ...(content.venue_address ? { address: content.venue_address } : {}),
        },
      });
    else
      Object.assign(entity, {
        headline: content.title,
        dateModified: content.updated_at,
        publisher: { "@id": publisher },
      });
    if (
      content.creator_name &&
      ["Person", "Organization"].includes(content.creator_type)
    ) {
      const creator = {
        "@type": content.creator_type,
        "@id": canonical.href + "#creator",
        name: content.creator_name,
      };
      graph.push(creator);
      entity.about = { "@id": creator["@id"] };
      if (content.kind === "profile") {
        page["@type"] = "ProfilePage";
        page.mainEntity = { "@id": creator["@id"] };
        page.hasPart = { "@id": id };
      }
    }
    if (
      channel === "press" &&
      content.kind === "story" &&
      content.category === "Local news" &&
      !content.sponsor &&
      content.byline &&
      content.source_url &&
      content.published_at &&
      content.verified_at
    ) {
      entity["@type"] = "NewsArticle";
      entity.author = { "@type": "Person", name: content.byline };
      entity.citation = content.source_url;
      entity.datePublished = content.published_at;
    }
    if (content.image_path)
      entity.image = {
        "@type": "ImageObject",
        url: image,
        caption: content.image_alt,
        creditText: content.image_credit,
      };
    if (content.sponsor)
      entity.sponsor = { "@type": "Organization", name: content.sponsor };
    graph.push(entity);
  } else if (items.length) {
    const eligible = items.filter((c) => !c.demo);
    if (eligible.length) {
      page.mainEntity = { "@id": canonical.href + "#collection" };
      graph.push({
        "@type": "ItemList",
        "@id": canonical.href + "#collection",
        numberOfItems: eligible.length,
        itemListElement: eligible.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.title,
          url: absolute("/stories/" + c.slug, origin),
        })),
      });
    }
  }
  return {
    canonical: canonical.href,
    title: fullTitle,
    description: summary,
    noindex: exclude,
    image,
    crumbs,
    graph: { "@context": "https://schema.org", "@graph": graph },
    ogType:
      content && !content.demo && content.kind === "story"
        ? "article"
        : "website",
  };
}
export function headTags(meta, { channel, nonce, esc }) {
  const cdn = process.env.FONT_SOURCE === "google";
  const font = cdn
    ? '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&amp;family=DM+Serif+Display:ital@0;1&amp;display=optional">'
    : '<link rel="preload" href="/assets/fonts/dm-sans-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/fonts.css">';
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.title)}</title><meta name="description" content="${esc(meta.description)}"><meta name="robots" content="${meta.noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large"}"><meta name="theme-color" content="${channel === "buzz" ? "#dcff5d" : "#d3e1d8"}"><meta name="color-scheme" content="light"><meta name="author" content="Holistic Growth Marketing LLC"><link rel="canonical" href="${esc(meta.canonical)}"><meta property="og:locale" content="en_US"><meta property="og:site_name" content="VeniceBeach.${channel}"><meta property="og:type" content="${meta.ogType}"><meta property="og:title" content="${esc(meta.title)}"><meta property="og:description" content="${esc(meta.description)}"><meta property="og:url" content="${esc(meta.canonical)}"><meta property="og:image" content="${esc(meta.image)}"><meta property="og:image:alt" content="${esc(meta.description)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(meta.title)}"><meta name="twitter:description" content="${esc(meta.description)}"><meta name="twitter:image" content="${esc(meta.image)}"><link rel="icon" href="/assets/favicon-${channel}.svg" type="image/svg+xml"><link rel="manifest" href="/site.webmanifest">${font}<link rel="stylesheet" href="/assets/style.css">${meta.graph ? `<script type="application/ld+json" nonce="${nonce}">${jsonLD(meta.graph)}</script>` : ""}`;
}
