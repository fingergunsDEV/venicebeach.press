import express from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { openStore } from "./store.js";
import { businessContact } from "./business.js";
import {
  pageMetadata,
  headTags,
  PUBLIC_PAGES,
  publicPages,
  publicOrigin,
  absolute,
} from "./seo.js";
import { mountCompliance, NOTICE_VERSION } from "./compliance.js";
import {
  pressHeader,
  pressHome,
  pressNewsletter,
  mountPressSections,
} from "./press.js";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const now = () => new Date().toISOString();
const cultureCategories = ["Music", "Film", "Art", "Culture", "Nightlife"];
const packages = [
  [
    "Creator Spotlight",
    "$150–$300",
    "One-time",
    "An approved creator or project profile, category placement, official links, and a delivery report.",
  ],
  [
    "Scene Partner",
    "$350–$500 / month",
    "Recurring",
    "Agreed promotional placements, tracked outbound links, monthly delivery summary, and renewal planning.",
  ],
  [
    "Category Sponsor",
    "$750–$1,000 / month",
    "Recurring",
    "Defined category inventory, campaign identifiers, agreed placements, and monthly reporting.",
  ],
  [
    "Release or Event Campaign",
    "$750–$1,500+",
    "One-time or retainer",
    "A scoped creative brief, approved assets, campaign dates, cross-channel placements, and a performance summary.",
  ],
  [
    "Presenting Partner",
    "$1,500–$2,500+ / month",
    "Recurring",
    "A defined share of network inventory, campaign calendar, monthly reporting, and a dedicated contact.",
  ],
];
export function createApp({ channel = "buzz", dataDir } = {}) {
  const app = express(),
    db = openStore(dataDir),
    sessions = new Map(),
    limits = new Map();
  const categories =
    channel === "press"
      ? [
          "Local news",
          "Community",
          "Classifieds",
          "Marketplace",
          ...cultureCategories,
        ]
      : cultureCategories;
  app.locals.db = db;
  const origin =
    process.env.PUBLIC_URL ||
    `http://localhost:${channel === "buzz" ? 3000 : 3001}`;
  const other =
    channel === "buzz"
      ? process.env.PRESS_URL || "http://localhost:3001"
      : process.env.BUZZ_URL || "http://localhost:3000";
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.locals.request = {
      path: req.path,
      query: req.query,
      method: req.method,
    };
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy":
        "default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    next();
  });
  app.use(express.urlencoded({ extended: false, limit: "32kb" }));
  app.use(
    "/assets",
    express.static(fileURLToPath(new URL("../public", import.meta.url)), {
      maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
      immutable: false,
    }),
  );
  const metric = (event, id = 0, campaign = "") =>
    db
      .prepare(
        "INSERT INTO metrics(event,channel,content_id,campaign_id,created_at) VALUES(?,?,?,?,?)",
      )
      .run(event, channel, id, campaign, now());
  const visible = "status='published' AND (publish_at='' OR publish_at<=?)";
  const live = () =>
    db
      .prepare(
        `SELECT * FROM content WHERE channel=? AND ${visible} ORDER BY id DESC`,
      )
      .all(channel, now());
  const card = (c, i = 0) =>
    `<article class="card">${c.sponsor ? `<div class="ad-label">Advertisement · Paid for by ${esc(c.sponsor)}</div>` : ""}<a class="art art-${i % 4}" href="/stories/${esc(c.slug)}" aria-label="${esc(c.title)}"><span>${esc(c.category)} / ${channel === "buzz" ? "THE SCENE" : "THE PROCESS"}</span><b>${["◒", "◍", "◐", "◓"][i % 4]}</b><small>VENICE BEACH, CA</small></a><div class="meta">${esc(c.kind)} ${c.demo ? "· Sample content" : ""} ${c.sponsor ? "· Advertisement · Paid content by " + esc(c.sponsor) : ""}</div><h3><a href="/stories/${esc(c.slug)}">${esc(c.title)}</a></h3><p>${esc(c.summary)}</p></article>`;
  function page(
    res,
    title,
    body,
    {
      status = 200,
      description = null,
      path = null,
      noindex = false,
      content = null,
      items = [],
    } = {},
  ) {
    const meta = pageMetadata({
      channel,
      request: res.locals.request,
      title,
      description,
      path,
      noindex,
      status,
      content,
      items,
    });
    const nonce = randomBytes(18).toString("base64");
    const cdn = process.env.FONT_SOURCE === "google";
    res.set(
      "Content-Security-Policy",
      `default-src 'self'; style-src 'self'${cdn ? " https://fonts.googleapis.com" : ""}; font-src 'self'${cdn ? " https://fonts.gstatic.com" : ""}; img-src 'self'; script-src 'self' 'nonce-${nonce}'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'`,
    );
    res.set(
      "X-Robots-Tag",
      meta.noindex ? "noindex, nofollow" : "index, follow",
    );
    const breadcrumb =
      meta.crumbs.length > 1
        ? `<nav class="breadcrumbs" aria-label="Breadcrumb">${meta.crumbs.map((c, i) => (i === meta.crumbs.length - 1 ? `<span aria-current="page">${esc(c.name)}</span>` : `<a href="${esc(c.url)}">${esc(c.name)}</a>`)).join(" / ")}</nav>`
        : "";
    res
      .status(status)
      .type("html")
      .send(
        `<!doctype html><html lang="en"><head>${headTags(meta, { channel, nonce, esc })}${channel === "press" ? '<link rel="stylesheet" href="/assets/press.css">' : ""}<script src="/assets/site.js" defer></script></head><body class="${channel}"><a class="skip" href="#main">Skip to content</a>${channel === "press" ? pressHeader() : `<div class="network"><a href="https://venicebeach.media">A VENICEBEACH.MEDIA PUBLICATION</a><span>INDEPENDENT CULTURE · VENICE, CA</span></div><header><a class="wordmark" href="/">venicebeach<span>.${channel}</span><sup>✳</sup></a><nav aria-label="Main"><a href="${channel === "buzz" ? "/events" : "/creators"}">${channel === "buzz" ? "The calendar" : "Creators"}</a><a href="/explore">Explore</a><a href="/sponsor">Partner with us →</a><a class="pill" href="/newsletter">Get the edit</a></nav></header>`}<main id="main">${breadcrumb}${body}</main>${channel === "press" ? pressNewsletter() : `<section class="newsletter"><div class="eyebrow">A LITTLE LOCAL KNOWLEDGE</div><h2>The scene, in your inbox.</h2><p>Music, film, and creative people worth your time.</p><a class="button" href="/newsletter">Join the list →</a></section>`}<footer><a class="wordmark" href="/">${channel === "press" ? "Venice Beach Press." : "venicebeach." + channel}</a><p>${channel === "press" ? "A coastal publication. A neighborhood perspective." : "One scene. Two perspectives."} <a href="${esc(other)}">Visit VeniceBeach.${channel === "buzz" ? "press" : "buzz"} →</a></p><div class="footerlinks"><a href="/about">About</a><a href="/submit">Submit a ${channel === "buzz" ? "happening" : "project"}</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclosures">Advertising disclosures</a><a href="/privacy/request">Privacy requests</a><a href="/accessibility">Accessibility</a><a href="/admin">Publishing desk</a></div><small>Commercial websites owned and operated by Holistic Growth Marketing LLC · VeniceBeach.media.<br>${esc(businessContact(channel).address)} · <a href="mailto:${esc(businessContact(channel).privacyEmail)}">${esc(businessContact(channel).privacyEmail)}</a></small></footer></body></html>`,
      );
  }
  const field = (label, name, type = "text", required = true) =>
    `<label>${label}<input name="${name}" type="${type}" ${required ? "required" : ""} maxlength="${name === "summary" ? 2000 : 250}"></label>`;
  const select = (label, name, values) =>
    `<label>${label}<select name="${name}">${values.map((v) => `<option>${esc(v)}</option>`).join("")}</select></label>`;
  const adult =
    '<label class="check"><input type="checkbox" name="adult" value="yes" required>I am at least 18 and authorized to make this request.</label>';
  const consent =
    '<label class="check"><input type="checkbox" name="consent" value="yes" required> I have read the <a href="/privacy">privacy notice at collection</a> and understand my details will be used to handle this request, not to subscribe me to marketing.</label><div class="trap" aria-hidden="true"><label>Leave blank<input name="website_confirm" tabindex="-1" autocomplete="off"></label></div>';
  function formPage(res, title, intro, form) {
    page(
      res,
      title,
      `<section class="pagehead"><div class="eyebrow">VENICEBEACH.MEDIA / ${channel.toUpperCase()}</div><h1>${title}</h1><p>${intro}</p></section><section class="formwrap">${form}</section>`,
      {
        noindex: res.locals.request?.method !== "GET",
        description:
          publicPages(channel)[res.locals.request?.path]?.description || intro,
      },
    );
  }
  app.get("/", (req, res) => {
    const items = live();
    if (channel === "press")
      return page(
        res,
        "Venice Beach, in focus",
        pressHome({ items, card, esc }),
        {
          description:
            "Local news, community announcements, classifieds, and the neighborhood marketplace for Venice Beach, Los Angeles.",
          items,
        },
      );
    page(
      res,
      "The " +
        (channel === "buzz"
          ? "pulse of the scene"
          : "people behind the culture"),
      `<section class="hero"><div class="hero-copy"><div class="eyebrow">${channel === "buzz" ? "MUSIC / FILM / EVENTS / CULTURE" : "ARTISTS / FILMMAKERS / INDEPENDENT MINDS"}</div><h1>${channel === "buzz" ? "Good things.<br>Great company.<br><em>Pure Venice.</em>" : "Meet the minds.<br>Feel the process.<br><em>Made in Venice.</em>"}</h1><p>${channel === "buzz" ? "Your way into the music, film, and creative energy of Venice Beach. Find your next thing." : "The people and projects shaping our creative coast. Go a little deeper into the work."}</p><a class="button" href="${channel === "buzz" ? "/events" : "/creators"}">${channel === "buzz" ? "Find your next night out" : "Meet the creators"} →</a></div><a class="hero-art art-${channel === "buzz" ? 0 : 1}" href="/stories/${items[0]?.slug || ""}"><div class="sun"></div><div class="lines"></div><span>THE LOCAL FREQUENCY</span><strong>${channel === "buzz" ? "Stay curious." : "Create something."}</strong><small>AN INDEPENDENT POINT OF VIEW →</small></a></section><div class="ticker">SOUND CHECK ✳ INDEPENDENT FILM ✳ AFTER HOURS ✳ CREATIVE ENERGY ✳ VENICE BEACH ✳</div><section class="section"><div class="section-title"><div><div class="eyebrow">${channel === "buzz" ? "ON OUR RADAR" : "IN GOOD COMPANY"}</div><h2>${channel === "buzz" ? "A scene worth discovering." : "Stories behind the work."}</h2></div><a href="/explore">View the collection →</a></div>${items.some((c) => c.demo) ? '<p class="notice">Preview edition: sample stories are labeled. No sample event listings or audience figures are represented as verified.</p>' : ""}<div class="grid">${items.map(card).join("")}</div></section><section class="partner"><div><div class="eyebrow">FOR THE PEOPLE MAKING THINGS HAPPEN</div><h2>Your next chapter<br>starts with a conversation.</h2></div><div><p>Bring your venue, release, or creative project into the conversation. Clear deliverables. Honest reporting. No promises of editorial praise.</p><a class="button" href="/sponsor">Explore partnerships →</a></div></section>`,
    );
  });
  app.get(["/explore", "/creators", "/events"], (req, res) => {
    const category = String(req.query.category || ""),
      date = String(req.query.date || ""),
      tag = String(req.query.tag || "").slice(0, 50),
      search = String(req.query.q || "").slice(0, 100);
    let items = live().filter(
      (c) =>
        (!category || c.category === category) &&
        (!tag || (c.tags || "").split(",").includes(tag)) &&
        (!search ||
          (c.title + " " + c.summary)
            .toLowerCase()
            .includes(search.toLowerCase())),
    );
    if (req.path === "/events")
      items = items.filter(
        (c) =>
          c.kind === "event" &&
          !c.demo &&
          c.event_date >= now() &&
          (!date ||
            new Intl.DateTimeFormat("en-CA", {
              timeZone: "America/Los_Angeles",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(c.event_date)) === date),
      );
    if (req.path === "/creators")
      items = items.filter((c) => ["profile", "project"].includes(c.kind));
    page(
      res,
      req.path === "/events"
        ? "The calendar"
        : req.path === "/creators"
          ? "The creative community"
          : "Explore the scene",
      `<section class="pagehead"><div class="eyebrow">FIND YOUR FREQUENCY</div><h1>${req.path === "/events" ? "Make a night of it." : req.path === "/creators" ? "People. Process. Possibility." : "Follow your curiosity."}</h1><form class="filters" method="get">${tag ? `<input type="hidden" name="tag" value="${esc(tag)}">` : ""}<label>Search<input name="q" value="${esc(search)}" maxlength="100"></label><label>Category<select name="category"><option value="">All categories</option>${categories.map((c) => `<option ${c === category ? "selected" : ""}>${c}</option>`).join("")}</select></label>${req.path === "/events" ? `<label>Date<input type="date" name="date" value="${esc(date)}"></label>` : ""}<button>Find it →</button></form></section><section class="section"><div class="grid">${items.map(card).join("") || '<div class="empty"><h2>Room for something good.</h2><p>No matching published listings yet. Events appear only after an editor verifies current dates and source links.</p><a href="/submit">Send us a tip →</a></div>'}</div></section>`,
      { path: req.path, items },
    );
  });
  function related(id) {
    if (!id) return "";
    const r = db
      .prepare(`SELECT * FROM content WHERE id=? AND ${visible}`)
      .get(id, now());
    if (!r) return "";
    const base = r.channel === channel ? "" : other;
    return `<aside class="related"><div class="eyebrow">BEHIND THE SCENE / ${esc(r.channel)}</div><h2><a href="${esc(base)}/stories/${esc(r.slug)}">${esc(r.title)} →</a></h2><p>${esc(r.summary)}</p></aside>`;
  }
  app.get("/stories/:slug", (req, res) => {
    const c = live().find((c) => c.slug === req.params.slug);
    if (!c)
      return page(
        res,
        "Not found",
        '<section class="pagehead"><h1>That story is off the board.</h1><a href="/explore">Explore the collection</a></section>',
        { status: 404, noindex: true },
      );
    metric(
      c.sponsor ? "sponsored_content_view" : "content_view",
      c.id,
      c.campaign_id,
    );
    page(
      res,
      c.title,
      `<article class="story"><div class="meta">${esc(c.kind)} ${c.demo ? "· Sample content" : ""} ${c.sponsor ? "· Advertisement · Paid content by " + esc(c.sponsor) : "· Independent editorial"}</div>${c.sponsor ? `<aside class="ad-disclosure" aria-label="Advertising disclosure">Advertisement · Paid content for ${esc(c.sponsor)}. This is a commercial placement, not an independent review.</aside>` : ""}<h1>${esc(c.title)}</h1><p class="standfirst">${esc(c.summary)}</p>${channel === "press" && c.byline ? `<div class="editorial-facts"><p>By ${esc(c.byline)}</p>${c.published_at ? `<p>Published <time datetime="${esc(c.published_at)}">${esc(new Date(c.published_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))} PT</time></p>` : ""}${c.verified_at ? `<p>Last verified <time datetime="${esc(c.verified_at)}">${esc(new Date(c.verified_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))} PT</time></p>` : ""}${c.source_url ? `<p><a class="source-link" href="${esc(c.source_url)}" rel="noopener">View the reporting source</a></p>` : ""}</div>` : ""}${c.image_path ? `<figure><img class="editorial-image" src="${esc(c.image_path)}" alt="${esc(c.image_alt)}" width="1200" height="800"><figcaption>${esc(c.image_credit)}</figcaption></figure>` : '<div class="story-art art-1">✳</div>'}${c.event_date ? `<p>${esc(new Date(c.event_date).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))} PT · ${esc(c.venue)}</p>` : ""}<div class="prose">${c.body
        .split("\n")
        .filter(Boolean)
        .map((s) => `<p>${esc(s)}</p>`)
        .join(
          "",
        )}</div>${c.destination ? `<a class="button" ${c.sponsor ? 'rel="sponsored noopener"' : 'rel="noopener"'} href="/out/${c.id}">${c.kind === "event" ? "Event information" : "Official project"} →</a>` : ""}${
        c.tags
          ? `<nav class="tags" aria-label="Story tags">${c.tags
              .split(",")
              .map(
                (t) =>
                  `<a href="/explore?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`,
              )
              .join(" ")}</nav>`
          : ""
      }${related(c.related_id)}<p class="meta">Updated ${esc(c.updated_at.slice(0, 10))}</p></article>`,
      {
        path: "/stories/" + c.slug,
        description: c.summary,
        noindex: !!c.demo,
        content: c,
      },
    );
  });
  app.get("/out/:id", (req, res) => {
    const c = live().find((c) => c.id === Number(req.params.id));
    if (!c?.destination) return res.sendStatus(404);
    metric(
      c.kind === "event" ? "event_outbound_click" : "creator_outbound_click",
      c.id,
      c.campaign_id,
    );
    res.redirect(c.destination);
  });
  function guard(req, res, next) {
    req.body ??= {};
    if (Object.values(req.body || {}).some((v) => typeof v !== "string"))
      return res.status(400).send("Invalid form fields.");
    const key = req.ip,
      t = Date.now(),
      old = limits.get(key) || { count: 0, until: t + 60000 };
    if (old.until < t) {
      old.count = 0;
      old.until = t + 60000;
    }
    old.count++;
    limits.set(key, old);
    if (limits.size > 10000)
      for (const [k, v] of limits) if (v.until < t) limits.delete(k);
    if (old.count > 15)
      return res
        .status(429)
        .send("Too many requests. Please try again in a minute.");
    if (req.body.website_confirm)
      return res.status(400).send("Invalid submission");
    const supplied = req.get("origin");
    if (supplied) {
      let valid = supplied === origin;
      if (!process.env.PUBLIC_URL)
        try {
          const u = new URL(supplied);
          valid ||=
            ["http:", "https:"].includes(u.protocol) &&
            u.host === req.get("host");
        } catch {}
      if (!valid) return res.status(403).send("Invalid origin");
    }
    next();
  }
  const emailOK = (v) =>
    typeof v === "string" &&
    v.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  app.get("/sponsor", (req, res) =>
    page(
      res,
      "Partner with the scene",
      `<section class="pagehead"><div class="eyebrow">MEANINGFUL CONNECTIONS / MEASURABLE WORK</div><h1>Good partners.<br>Better stories.</h1><p>Production, placement, and distribution. Scoped together, reported honestly. These are starting prices to validate, not audience or sales guarantees.</p></section><section class="section"><div class="packages">${packages.map(([n, p, t, d]) => `<article><div class="eyebrow">${t}</div><h2>${n}</h2><strong>${p}</strong><p>${d}</p><a href="/inquire">Start a conversation →</a></article>`).join("")}</div><p>All paid placements are labeled. Final agreements define dates, deliverables, revisions, payment terms, cancellation, and any category exclusivity. One-time campaigns are excluded from MRR.</p></section>`,
    ),
  );
  app.get(["/inquire", "/contact"], (req, res) =>
    formPage(
      res,
      "Let’s make something happen.",
      "Tell us about your goals. We review inquiries before proposing a scoped campaign.",
      `<form method="post" action="/inquire">${field("Your name", "name")}${field("Email", "email", "email")}${field("Organization or project", "organization")}${select("Channel preference", "preference", ["Both", "Buzz", "Press"])}${select("Budget range", "budget", ["Under $350", "$350–$750", "$750–$1,500", "$1,500+"])}${select(
        "Interested in",
        "package",
        packages.map((p) => p[0]),
      )}<label>Objectives and dates<textarea name="summary" required maxlength="2000"></textarea></label>${adult}${consent}<button>Send inquiry →</button></form>`,
    ),
  );
  app.get("/submit", (req, res) =>
    formPage(
      res,
      "Put it on our radar.",
      "Submissions enter a private moderation queue. Submission does not guarantee coverage or require payment.",
      `<form method="post" action="/submit">${field("Your name", "name")}${field("Private contact email", "email", "email")}${field("Project or event title", "title")}${select("Submission type", "kind", ["event", "profile", "project", "story"])}${select("Discipline", "category", categories)}${field("Official source or project URL", "destination", "url")}${field("Event date and time, if relevant (Pacific time)", "event_date", "datetime-local", false)}${field("Venue / Venice connection", "venue", "text", false)}<label>Your story<textarea name="summary" required maxlength="2000"></textarea></label><label class="check"><input type="checkbox" name="rights" value="yes" required>I have authority to share this information for private editorial review. I retain ownership; publication and promotional reuse require documented permission. I will not submit unlicensed media or private information.</label>${adult}${consent}<button>Send for review →</button></form>`,
    ),
  );
  for (const type of ["inquire", "submit"])
    app.post("/" + type, guard, (req, res) => {
      const b = req.body;
      if (
        !emailOK(b.email) ||
        !b.name?.trim() ||
        b.name.length > 250 ||
        !b.summary?.trim() ||
        b.summary.length > 2000 ||
        b.consent !== "yes" ||
        b.adult !== "yes" ||
        (type === "submit" &&
          (!b.title?.trim() || b.rights !== "yes" || !safeURL(b.destination)))
      )
        return res
          .status(400)
          .send("Required fields, a valid source URL, and consent are needed.");
      const allowed =
        type === "submit"
          ? [
              "title",
              "kind",
              "category",
              "destination",
              "event_date",
              "venue",
              "summary",
              "rights",
            ]
          : ["organization", "preference", "budget", "package", "summary"];
      const payload = Object.fromEntries(
        allowed.map((k) => [k, String(b[k] || "").slice(0, 2000)]),
      );
      payload.notice_version = NOTICE_VERSION;
      payload.notice_acknowledged = true;
      payload.adult_confirmed = true;
      db.prepare(
        "INSERT INTO leads(type,channel,email,name,payload,created_at) VALUES(?,?,?,?,?,?)",
      ).run(type, channel, b.email, b.name, JSON.stringify(payload), now());
      metric(type === "submit" ? "submission_completed" : "sponsor_inquiry");
      formPage(
        res,
        "You’re on our radar.",
        "Your request has been saved for the publishing team. We have not subscribed you to marketing email.",
        '<a class="button" href="/">Back to the scene →</a>',
      );
    });
  app.get("/newsletter", (req, res) =>
    formPage(
      res,
      channel === "press"
        ? "The neighborhood, in your inbox."
        : "A little local knowledge.",
      channel === "press"
        ? "Request local stories, community notices, and labeled sponsor messages. You can unsubscribe at any time. No email is sent until the publisher configures delivery."
        : "A permission-based edit of music, film, and creative culture. You can unsubscribe at any time. Delivery starts only after the publisher connects the email service.",
      `<form method="post" action="/newsletter">${field("Email address", "email", "email")}${adult}<label class="check"><input type="checkbox" name="consent" value="yes" required>Yes, email me ${channel === "press" ? "Venice Beach Press local news, community notices, and neighborhood updates" : "VeniceBeach.media music, film, and culture updates"} and clearly labeled sponsor promotions. I can unsubscribe at any time. See the <a href="/privacy">privacy notice</a>.</label><div class="trap" aria-hidden="true"><label>Leave blank<input name="website_confirm" tabindex="-1"></label></div><button>Request a subscription →</button></form>`,
    ),
  );
  app.post("/newsletter", guard, async (req, res, next) => {
    try {
      if (
        !emailOK(req.body.email) ||
        req.body.consent !== "yes" ||
        req.body.adult !== "yes"
      )
        return res
          .status(400)
          .send("Valid email and explicit consent required.");
      const email = req.body.email.toLowerCase(),
        token = randomBytes(24).toString("hex");
      res.set({
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      });
      let state = "pending_configuration";
      if (
        process.env.MAILCHIMP_API_KEY &&
        process.env.MAILCHIMP_LIST_ID &&
        /^us\d+$/.test(process.env.MAILCHIMP_SERVER || "")
      ) {
        if (
          !businessContact(channel).address ||
          !businessContact(channel).privacyEmail ||
          process.env.EMAIL_COMPLIANCE_CONFIRMED !== "yes"
        )
          return res
            .status(503)
            .send(
              "Newsletter delivery is awaiting publisher contact and email compliance configuration. No email was sent.",
            );
        const response = await fetch(
          `https://${process.env.MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${encodeURIComponent(process.env.MAILCHIMP_LIST_ID)}/members`,
          {
            method: "POST",
            headers: {
              Authorization:
                "Basic " +
                Buffer.from("venice:" + process.env.MAILCHIMP_API_KEY).toString(
                  "base64",
                ),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email_address: email, status: "pending" }),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (!response.ok)
          return res
            .status(502)
            .send(
              "Email provider could not accept the request. Please try later.",
            );
        state = "pending_confirmation";
      }
      db.prepare(
        "INSERT INTO subscribers(email,channel,token,status,created_at,notice_version,consent_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET status=excluded.status,channel=excluded.channel,notice_version=excluded.notice_version,consent_at=excluded.consent_at,withdrawn_at=''",
      ).run(email, channel, token, state, now(), NOTICE_VERSION, now());
      metric("newsletter_signup");
      formPage(
        res,
        "Request received.",
        state === "pending_confirmation"
          ? "Check your email to confirm your subscription."
          : "Email delivery is not configured. Your consent request is stored privately; no email has been sent.",
        `<p>Keep this private link to <a href="/newsletter/manage/${db.prepare("SELECT token FROM subscribers WHERE email=?").get(email).token}">withdraw your request or unsubscribe</a>. Do not share it.</p><a href="/">Return home</a>`,
      );
    } catch (e) {
      next(e);
    }
  });
  app.get("/about", (req, res) =>
    page(
      res,
      channel === "press"
        ? "A publication for the neighborhood"
        : "Independent by nature",
      channel === "press"
        ? '<section class="pagehead"><div class="press-kicker">VENICE BEACH / LOS ANGELES / CALIFORNIA</div><h1>A neighborhood deserves a point of view.</h1><p>Venice Beach Press is a commercial neighborhood publication for local news, community announcements, classifieds, and the marketplace. We look to the people who live, work, create, and raise families here to help tell its story.</p><p>News requires attributable sources, a byline, publication dates, and verification. Sample stories are clearly labeled. Advertising is labeled and kept separate from independent editorial decisions.</p><p>Published by Holistic Growth Marketing LLC as part of VeniceBeach.media. Our sister publication, VeniceBeach.buzz, focuses on music, film, and entertainment discovery.</p></section>'
        : '<section class="pagehead"><div class="eyebrow">ONE NETWORK / TWO PERSPECTIVES</div><h1>Culture, with a point of view.</h1><p>Buzz helps you discover the scene. Press introduces the people making it. Together, we are VeniceBeach.media: an independent culture and entertainment network published by Holistic Growth Marketing LLC.</p><p>We cover music, film, art, and creative projects. Paid promotion is labeled and kept separate from independent editorial decisions.</p></section>',
    ),
  );
  function auth(req, res, next) {
    res.set("Cache-Control", "no-store");
    const cookie = String(req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("venice_session="));
    const s = sessions.get(cookie?.slice(15));
    if (!s || s.expires < Date.now()) return res.redirect("/admin/login");
    req.session = s;
    const path = req.path;
    const allowed =
      s.role === "administrator" ||
      path === "/admin" ||
      path === "/admin/logout" ||
      (s.role === "editor" &&
        (path.startsWith("/admin/content/") ||
          path.startsWith("/admin/preview/") ||
          path.startsWith("/admin/leads/"))) ||
      (s.role === "commercial" &&
        (path.startsWith("/admin/leads/") ||
          path.startsWith("/admin/contracts") ||
          path === "/admin/report.csv")) ||
      (s.role === "contributor" && path === "/admin/content/new");
    if (!allowed)
      return res.status(403).send("Your role cannot access this operation.");
    next();
  }
  function csrf(req, res, next) {
    if (req.body.csrf !== req.session.csrf)
      return res.status(403).send("Invalid form token");
    next();
  }
  const csrfInput = (req) =>
    `<input type="hidden" name="csrf" value="${req.session.csrf}">`;
  app.get("/admin/login", (req, res) => {
    res.set("Cache-Control", "no-store");
    formPage(
      res,
      "The publishing desk.",
      [
        "ADMIN_PASSWORD",
        "EDITOR_PASSWORD",
        "CONTRIBUTOR_PASSWORD",
        "COMMERCIAL_PASSWORD",
      ].some((k) => process.env[k])
        ? "Sign in to manage both channels."
        : "Administration is disabled. Set ADMIN_PASSWORD to a random password of at least 16 characters, then restart.",
      [
        "ADMIN_PASSWORD",
        "EDITOR_PASSWORD",
        "CONTRIBUTOR_PASSWORD",
        "COMMERCIAL_PASSWORD",
      ].some((k) => process.env[k])
        ? `<form method="post" action="/admin/login">${select("Role", "role", ["administrator", "editor", "contributor", "commercial"])}${field("Publisher password", "password", "password")}<button>Sign in</button></form>`
        : "",
    );
  });
  app.post("/admin/login", guard, (req, res) => {
    const role = String(req.body.role || "administrator"),
      key = {
        administrator: "ADMIN_PASSWORD",
        editor: "EDITOR_PASSWORD",
        contributor: "CONTRIBUTOR_PASSWORD",
        commercial: "COMMERCIAL_PASSWORD",
      }[role];
    const expected = (key && process.env[key]) || "",
      actual = String(req.body.password || "");
    if (
      expected.length < 16 ||
      Buffer.byteLength(expected) !== Buffer.byteLength(actual) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
    )
      return res
        .status(401)
        .send(
          "Sign in failed. Administration requires a configured password of at least 16 characters.",
        );
    const token = randomBytes(32).toString("hex");
    sessions.set(token, {
      role,
      csrf: randomBytes(24).toString("hex"),
      expires: Date.now() + 8 * 3600000,
    });
    res.setHeader(
      "Set-Cookie",
      `venice_session=${token}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=28800${origin.startsWith("https:") ? "; Secure" : ""}`,
    );
    res.redirect("/admin");
  });
  app.post("/admin/logout", auth, csrf, (req, res) => {
    for (const [k, s] of sessions) if (s === req.session) sessions.delete(k);
    res.setHeader(
      "Set-Cookie",
      "venice_session=; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=0",
    );
    res.redirect("/");
  });
  app.get("/admin", auth, (req, res) => {
    if (req.session.role === "contributor")
      return formPage(
        res,
        "Contributor desk",
        "Create a draft for editor review. Contributors cannot publish or access private inquiries.",
        '<a class="button" href="/admin/content/new">Create a draft</a>',
      );
    const contents =
        req.session.role === "commercial"
          ? []
          : db.prepare("SELECT * FROM content ORDER BY id DESC").all(),
      leads = db
        .prepare("SELECT * FROM leads ORDER BY id DESC LIMIT 200")
        .all()
        .filter(
          (l) =>
            req.session.role === "administrator" ||
            (req.session.role === "editor"
              ? l.type === "submit"
              : l.type === "inquire"),
        ),
      metrics = db
        .prepare(
          "SELECT event,channel,count(*) AS total FROM metrics GROUP BY event,channel",
        )
        .all(),
      contracts =
        req.session.role === "editor"
          ? []
          : db.prepare("SELECT * FROM contracts").all(),
      mrr = contracts
        .filter((c) => c.recurring && c.status === "active")
        .reduce((s, c) => s + c.monthly_cents, 0);
    page(
      res,
      "Publishing desk",
      `<section class="pagehead"><div class="eyebrow">SHARED OPERATIONS / BUZZ + PRESS</div><h1>The publishing desk.</h1><div class="adminnav">${req.session.role !== "commercial" ? '<a href="/admin/content/new">Create content →</a>' : ""}${req.session.role !== "editor" ? '<a href="/admin/report.csv">Download measured outcomes →</a>' : ""}<form action="/admin/logout" method="post">${csrfInput(req)}<button>Sign out</button></form></div></section><section class="section"><h2>Content & publishing</h2><div class="tablewrap"><table><thead><tr><th>Title</th><th>Channel</th><th>Status</th><th>Scheduled</th></tr></thead><tbody>${contents.map((c) => `<tr><td><a href="/admin/content/${c.id}">${esc(c.title)}</a> · <a href="/admin/preview/${c.id}">Preview</a></td><td>${esc(c.channel)}</td><td>${esc(c.status)}${c.demo ? " · sample" : ""}</td><td>${esc(c.publish_at)}</td></tr>`).join("")}</tbody></table></div><h2>Private moderation & sales pipeline</h2><p>Inquiries and submissions stay here until reviewed. Publication requires a separate content record and explicit approval.</p>${
        leads
          .map(
            (l) =>
              `<details class="lead"><summary>#${l.id} · ${esc(l.type)} · ${esc(l.name)} · ${esc(l.status)}</summary><p>${esc(l.email)} · ${esc(l.channel)} · ${esc(l.created_at)}</p><dl>${Object.entries(
                JSON.parse(l.payload),
              )
                .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
                .join(
                  "",
                )}</dl><form method="post" action="/admin/leads/${l.id}">${csrfInput(req)}${select("Next stage", "status", ["new", "review", "needs_information", "accepted", "declined", "qualified", "proposed", "contracted", "delivered", "renewal", "closed"])}<button>Update stage</button></form></details>`,
          )
          .join("") || "<p>No requests yet.</p>"
      }<h2>Measured outcomes</h2><p>Internal counts only; these include preview and operator traffic, and are not unique visitors or independently verified campaign attribution.</p><div class="tablewrap"><table><thead><tr><th>Event</th><th>Channel</th><th>Count</th></tr></thead><tbody>${metrics.map((m) => `<tr><td>${esc(m.event)}</td><td>${esc(m.channel)}</td><td>${m.total}</td></tr>`).join("")}</tbody></table></div><h2>Contracted MRR: $${(mrr / 100).toFixed(2)}</h2><p>Active recurring agreements only. One-time fees and collected cash are excluded. $10,000/month is a planning goal, not realized revenue.</p>${contracts.map((c) => `<p>${esc(c.name)} · $${(c.monthly_cents / 100).toFixed(2)} · ${c.recurring ? "monthly" : "one-time"} · ${esc(c.status)} · renews ${esc(c.renewal_date)}</p><form method="post" action="/admin/contracts/${c.id}">${csrfInput(req)}${select("Contract status", "status", ["active", "cancelled", "paused"])}<button>Update agreement</button></form>`).join("")}${req.session.role !== "editor" ? `<details><summary>Record a signed agreement</summary><form action="/admin/contracts" method="post">${csrfInput(req)}${field("Customer name", "name")}${field("Signed agreement reference (no private document contents)", "agreement_ref")}${field("Monthly amount in cents (one-time amount for campaign)", "monthly_cents", "number")}${select("Revenue type", "recurring", ["Recurring", "One-time"])}${field("Renewal date", "renewal_date", "date")}<label>Contracted deliverables<textarea name="deliverables" required maxlength="2000"></textarea></label><label class="check"><input type="checkbox" name="terms_confirmed" value="yes" required>I have a signed agreement identifying Holistic Growth Marketing LLC, deliverables, dates, fees/taxes, payment timing, revisions, disclosures, cancellation/refunds, and any recurring renewal terms and authorization.</label><button>Record signed agreement</button></form></details>` : ""}<h2>Audit history</h2>${(req.session.role === "administrator" ? db.prepare("SELECT * FROM audit ORDER BY id DESC LIMIT 30").all() : []).map((a) => `<p class="meta">${esc(a.created_at)} · ${esc(a.action)} · #${a.entity_id}</p>`).join("")}</section>`,
      { noindex: true },
    );
  });
  const audit = (action, id) =>
    db
      .prepare("INSERT INTO audit(action,entity_id,created_at) VALUES(?,?,?)")
      .run(action, id, now());
  app.post("/admin/leads/:id", auth, csrf, (req, res) => {
    const lead = db
      .prepare("SELECT type FROM leads WHERE id=?")
      .get(req.params.id);
    if (!lead) return res.sendStatus(404);
    if (
      req.session.role !== "administrator" &&
      ((req.session.role === "editor" && lead.type !== "submit") ||
        (req.session.role === "commercial" && lead.type !== "inquire"))
    )
      return res.sendStatus(403);
    if (
      ![
        "new",
        "review",
        "needs_information",
        "accepted",
        "declined",
        "qualified",
        "proposed",
        "contracted",
        "delivered",
        "renewal",
        "closed",
      ].includes(req.body.status)
    )
      return res.sendStatus(400);
    db.prepare("UPDATE leads SET status=? WHERE id=?").run(
      req.body.status,
      req.params.id,
    );
    audit("lead:" + req.body.status, Number(req.params.id));
    res.redirect("/admin");
  });
  app.post("/admin/contracts", auth, csrf, (req, res) => {
    const b = req.body,
      n = Number(b.monthly_cents);
    if (
      !b.name ||
      !b.agreement_ref?.trim() ||
      b.agreement_ref.length > 250 ||
      b.terms_confirmed !== "yes" ||
      !["Recurring", "One-time"].includes(b.recurring) ||
      !Number.isSafeInteger(n) ||
      n < 0 ||
      n > 100000000 ||
      !b.deliverables ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b.renewal_date)
    )
      return res.status(400).send("Complete contract details required.");
    const r = db
      .prepare(
        "INSERT INTO contracts(name,monthly_cents,recurring,status,deliverables,renewal_date,agreement_ref,terms_confirmed_at) VALUES(?,?,?,'active',?,?,?,?)",
      )
      .run(
        String(b.name).slice(0, 250),
        n,
        b.recurring === "Recurring" ? 1 : 0,
        String(b.deliverables).slice(0, 2000),
        b.renewal_date,
        b.agreement_ref,
        now(),
      );
    audit("contract:created", Number(r.lastInsertRowid));
    res.redirect("/admin");
  });
  app.post("/admin/contracts/:id", auth, csrf, (req, res) => {
    if (!["active", "cancelled", "paused"].includes(req.body.status))
      return res.sendStatus(400);
    db.prepare("UPDATE contracts SET status=? WHERE id=?").run(
      req.body.status,
      req.params.id,
    );
    audit("contract:" + req.body.status, Number(req.params.id));
    res.redirect("/admin");
  });
  app.get("/admin/report.csv", auth, (req, res) => {
    const rows = db
      .prepare(
        "SELECT substr(created_at,1,7) AS month,event,channel,content_id,campaign_id,count(*) AS count FROM metrics GROUP BY month,event,channel,content_id,campaign_id",
      )
      .all();
    res
      .set({
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="measured-outcomes.csv"',
      })
      .send(
        "month,event,channel,content_id,campaign_id,count\n" +
          rows.map((r) => Object.values(r).map(csv).join(",")).join("\n"),
      );
  });
  app.get("/admin/preview/:id", auth, (req, res) => {
    const c = db.prepare("SELECT * FROM content WHERE id=?").get(req.params.id);
    if (!c) return res.sendStatus(404);
    page(
      res,
      "Preview: " + c.title,
      `<article class="story"><div class="notice">PRIVATE PREVIEW · ${esc(c.status)} · ${esc(c.channel)} · ${esc(c.publish_at || "not scheduled")}</div>${c.sponsor ? `<aside class="ad-disclosure" aria-label="Advertising disclosure">Advertisement · Paid content for ${esc(c.sponsor)}. This is a commercial placement, not an independent review.</aside>` : ""}<h1>${esc(c.title)}</h1><p class="standfirst">${esc(c.summary)}</p>${channel === "press" && c.byline ? `<div class="editorial-facts"><p>By ${esc(c.byline)}</p>${c.published_at ? `<p>Published <time datetime="${esc(c.published_at)}">${esc(new Date(c.published_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))} PT</time></p>` : ""}${c.verified_at ? `<p>Last verified <time datetime="${esc(c.verified_at)}">${esc(new Date(c.verified_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))} PT</time></p>` : ""}${c.source_url ? `<p><a class="source-link" href="${esc(c.source_url)}" rel="noopener">View the reporting source</a></p>` : ""}</div>` : ""}${c.sponsor ? `<p>Sponsored by ${esc(c.sponsor)}</p>` : ""}<div class="prose">${c.body
        .split("\n")
        .map((p) => `<p>${esc(p)}</p>`)
        .join(
          "",
        )}</div><a href="/admin/content/${c.id}">Back to editing</a></article>`,
      { noindex: true },
    );
  });
  app.get("/admin/content/:id", auth, (req, res) => {
    const c =
      req.params.id === "new"
        ? {}
        : db.prepare("SELECT * FROM content WHERE id=?").get(req.params.id);
    if (!c) return res.sendStatus(404);
    const input = (label, name, type = "text") =>
      `<label>${label}<input name="${name}" type="${type}" value="${esc(c[name] || "")}" maxlength="500"></label>`;
    const opts = (label, name, vs) =>
      `<label>${label}<select name="${name}">${vs.map((v) => `<option ${c[name] === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`;
    formPage(
      res,
      c.id ? "Edit content" : "Create content",
      "Draft → review → published, or archive. Future publish times remain hidden until due. Verify permissions and facts before publishing.",
      `<form action="/admin/content/${c.id || "new"}" method="post">${csrfInput(req)}${opts("Channel", "channel", ["buzz", "press"])}${opts("Template", "kind", ["story", "event", "profile", "project"])}${input("Title", "title")}${input("Unique slug", "slug")}${opts("Category", "category", ["Local news", "Community", "Classifieds", "Marketplace", ...cultureCategories])}${input("Summary", "summary")}${input("Verified byline (required for local news)", "byline")}${input("Reporting source URL (required for local news)", "source_url", "url")}${input("Publication time (ISO 8601 with timezone)", "published_at")}${input("Last verified time (ISO 8601 with timezone)", "verified_at")}${input("Tags (comma-separated lowercase slugs)", "tags")}<label>Body (plain text, paragraphs separated by new lines)<textarea name="body" required maxlength="30000">${esc(c.body || "")}</textarea></label>${input("Verified creator / organization name (optional)", "creator_name")}${opts("Creator entity type", "creator_type", ["Person", "Organization"])}${input("Venue or location", "venue")}${input("Verified venue street address (optional)", "venue_address")}${input("Event time (ISO 8601 including offset, e.g. 2026-11-01T19:00:00-08:00)", "event_date")}${input("Official HTTPS source / project URL", "destination", "url")}${input("Sponsor name (adds paid-content disclosure)", "sponsor")}${input("Campaign ID (letters, numbers, hyphens; no personal data)", "campaign_id")}${input("Related creator/project record ID (optional)", "related_id", "number")}${input("Local image path, e.g. /assets/editorial/photo.webp", "image_path")}${input("Image alt text", "image_alt")}${input("Image credit", "image_credit")}${input("Image rights / permission note", "rights_note")}${opts("Workflow status", "status", req.session.role === "contributor" ? ["draft", "review"] : ["draft", "review", "published", "archived"])}${input("Schedule publication (ISO 8601 with offset, optional)", "publish_at")}<label class="check"><input type="checkbox" name="demo" value="1" ${c.demo ? "checked" : ""}>Sample content (excluded from calendar and search indexing)</label><label class="check"><input name="verified" type="checkbox" value="yes" required>I verified accuracy, source information, and permission to publish.</label><button>Save content</button></form>`,
    );
  });
  app.post("/admin/content/:id", auth, csrf, (req, res) => {
    const b = req.body;
    if (
      req.session.role === "contributor" &&
      !["draft", "review"].includes(b.status)
    )
      return res
        .status(403)
        .send("Contributors can save drafts or request review.");
    const iso = (s) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(s) &&
      Number.isFinite(Date.parse(s));
    if (
      !["buzz", "press"].includes(b.channel) ||
      !["story", "event", "profile", "project"].includes(b.kind) ||
      ![
        "Local news",
        "Community",
        "Classifieds",
        "Marketplace",
        ...cultureCategories,
      ].includes(b.category) ||
      !["draft", "review", "published", "archived"].includes(b.status) ||
      !b.title?.trim() ||
      !b.summary?.trim() ||
      !b.body?.trim() ||
      b.body.length > 30000 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug || "") ||
      b.verified !== "yes" ||
      (b.destination && !safeURL(b.destination)) ||
      (b.publish_at && !iso(b.publish_at)) ||
      (b.event_date && !iso(b.event_date)) ||
      (b.kind === "event" && (!b.event_date || !b.destination || !b.venue))
    )
      return res
        .status(400)
        .send(
          "Check required fields, slug, workflow, and ISO timestamps with timezone. Events require source, date, and venue.",
        );
    if (
      (b.source_url && !safeURL(b.source_url)) ||
      ["published_at", "verified_at"].some(
        (k) => b[k] && (!iso(b[k]) || Date.parse(b[k]) > Date.now()),
      )
    )
      return res
        .status(400)
        .send(
          "Use a valid HTTPS reporting source and non-future ISO timestamps.",
        );
    if (
      b.channel === "press" &&
      b.category === "Local news" &&
      b.status === "published" &&
      b.demo !== "1" &&
      (!b.byline?.trim() || !b.source_url || !b.published_at || !b.verified_at)
    )
      return res
        .status(400)
        .send(
          "Local news requires a verified byline, HTTPS source, publication time, and verification time.",
        );
    const values = [
      b.channel,
      b.kind,
      b.slug,
      b.title,
      b.category,
      b.summary,
      b.body,
      b.venue || "",
      b.event_date ? new Date(b.event_date).toISOString() : "",
      b.destination || "",
      b.sponsor || "",
      b.status,
      b.publish_at ? new Date(b.publish_at).toISOString() : "",
      b.demo === "1" ? 1 : 0,
      now(),
    ];
    try {
      if (b.tags && !/^[a-z0-9-]+(?:,[a-z0-9-]+)*$/.test(b.tags))
        return res.status(400).send("Use comma-separated lowercase tag slugs.");
      if (
        (b.campaign_id && !/^[a-zA-Z0-9-]{1,80}$/.test(b.campaign_id)) ||
        (b.image_path &&
          (!/^\/assets\/[a-zA-Z0-9/_-]+\.(webp|png|jpg|jpeg|avif)$/.test(
            b.image_path,
          ) ||
            !b.image_alt ||
            !b.image_credit ||
            !b.rights_note))
      )
        return res
          .status(400)
          .send(
            "Use a valid campaign ID and local image path with alt text, credit, and rights notes.",
          );
      if (
        b.related_id &&
        !db.prepare("SELECT id FROM content WHERE id=?").get(b.related_id)
      )
        return res.status(400).send("Related record does not exist.");
      if (
        req.params.id !== "new" &&
        !db.prepare("SELECT id FROM content WHERE id=?").get(req.params.id)
      )
        return res.sendStatus(404);
      db.exec("BEGIN IMMEDIATE");
      let id;
      if (req.params.id === "new") {
        id = Number(
          db
            .prepare(
              "INSERT INTO content(channel,kind,slug,title,category,summary,body,venue,event_date,destination,sponsor,status,publish_at,demo,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            )
            .run(...values).lastInsertRowid,
        );
      } else {
        id = Number(req.params.id);
        if (!Number.isSafeInteger(id)) return res.sendStatus(400);
        db.prepare(
          "UPDATE content SET channel=?,kind=?,slug=?,title=?,category=?,summary=?,body=?,venue=?,event_date=?,destination=?,sponsor=?,status=?,publish_at=?,demo=?,updated_at=? WHERE id=?",
        ).run(...values, id);
      }
      db.prepare(
        "UPDATE content SET campaign_id=?,related_id=?,image_path=?,image_alt=?,image_credit=?,rights_note=? WHERE id=?",
      ).run(
        b.campaign_id || "",
        b.related_id ? Number(b.related_id) : null,
        b.image_path || "",
        b.image_alt || "",
        b.image_credit || "",
        b.rights_note || "",
        id,
      );
      if (
        b.creator_type &&
        !["Person", "Organization"].includes(b.creator_type)
      )
        throw new Error("Invalid creator type");
      db.prepare(
        "UPDATE content SET tags=?,creator_name=?,creator_type=?,venue_address=? WHERE id=?",
      ).run(
        b.tags || "",
        String(b.creator_name || "").slice(0, 250),
        b.creator_type || "Person",
        String(b.venue_address || "").slice(0, 500),
        id,
      );
      db.prepare(
        "UPDATE content SET byline=?,source_url=?,published_at=?,verified_at=? WHERE id=?",
      ).run(
        String(b.byline || "").slice(0, 250),
        b.source_url || "",
        b.published_at ? new Date(b.published_at).toISOString() : "",
        b.verified_at ? new Date(b.verified_at).toISOString() : "",
        id,
      );
      db.prepare(
        "INSERT INTO revisions(content_id,snapshot,actor,created_at) VALUES(?,?,?,?)",
      ).run(
        id,
        JSON.stringify(db.prepare("SELECT * FROM content WHERE id=?").get(id)),
        req.session.role,
        now(),
      );
      audit("content:" + b.status, id);
      db.exec("COMMIT");
      res.redirect("/admin");
    } catch (e) {
      if (db.isTransaction) db.exec("ROLLBACK");
      if (e.message.includes("UNIQUE"))
        return res
          .status(409)
          .send("This slug already exists. Choose a unique slug.");
      throw e;
    }
  });
  if (channel === "press") mountPressSections(app, { page, live, card });
  mountCompliance(app, { db, page, formPage, guard, esc, channel });
  app.get("/site.webmanifest", (req, res) =>
    res.type("application/manifest+json").send(
      JSON.stringify({
        id: "/",
        name: `VeniceBeach.${channel}`,
        short_name: `VB.${channel}`,
        description: publicPages(channel)["/"].description,
        start_url: "/",
        scope: "/",
        display: "browser",
        background_color: "#f5f2e9",
        theme_color: channel === "buzz" ? "#dcff5d" : "#d3e1d8",
        icons: [
          {
            src: `/assets/favicon-${channel}.svg`,
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      }),
    ),
  );
  app.get("/robots.txt", (req, res) =>
    res
      .type("text")
      .send(
        `User-agent: *\nDisallow: /admin\nDisallow: /out/\nDisallow: /newsletter/manage/\nDisallow: /health\nSitemap: ${publicOrigin(channel)}/sitemap.xml\n`,
      ),
  );
  app.get("/sitemap.xml", (req, res) => {
    const base = publicOrigin(channel),
      records = live().filter((c) => !c.demo);
    const urls = [
      ...Object.keys(publicPages(channel)).map((path) => ({ path })),
      ...records.map((c) => ({
        path: "/stories/" + c.slug,
        lastmod: c.updated_at,
      })),
    ];
    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${esc(absolute(u.path, base))}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : ""}</url>`).join("")}</urlset>`,
      );
  });
  app.get("/health", (req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok", channel });
  });
  app.use((req, res) =>
    page(
      res,
      "Not found",
      '<section class="pagehead"><h1>A little off the beaten path.</h1><a href="/">Back to the scene →</a></section>',
      { status: 404, noindex: true },
    ),
  );
  app.use((err, req, res, next) => {
    console.error("Request failed:", err.code || err.name);
    res
      .status(500)
      .send("We could not complete that request. Please try again later.");
  });
  return app;
}
function safeURL(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
function csv(v) {
  let s = String(v ?? "");
  if (/^[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
