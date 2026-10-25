import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import {
  PUBLIC_PAGES,
  publicPages,
  pageMetadata,
  headTags,
} from "../src/seo.js";
const graph = (html) =>
  JSON.parse(
    html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1],
  );
const canonical = (html) =>
  html
    .match(/<link rel="canonical" href="([^"]+)"/)[1]
    .replaceAll("&amp;", "&");
test("both channels: complete per-page heads, safe schema graphs, assets, and canonical sitemaps", async () => {
  const saved = process.env.PUBLIC_URL;
  delete process.env.PUBLIC_URL;
  const dir = mkdtempSync(join(tmpdir(), "venice-seo-"));
  try {
    for (const channel of ["buzz", "press"]) {
      const app = createApp({ channel, dataDir: dir }),
        server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const base = `http://127.0.0.1:${server.address().port}`,
        domain = `https://venicebeach.${channel}`;
      const get = (path) => fetch(base + path, { redirect: "manual" });
      try {
        const descriptions = new Set();
        for (const path of Object.keys(publicPages(channel))) {
          const r = await get(path);
          assert.equal(r.status, 200, path);
          const html = await r.text();
          assert.equal(canonical(html), domain + path, path);
          assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
          assert.match(
            html,
            /<meta name="viewport" content="width=device-width,initial-scale=1">/,
          );
          assert.match(
            html,
            /<meta name="robots" content="index,follow,max-image-preview:large">/,
          );
          assert.match(
            html,
            /<script src="\/assets\/site.js" defer><\/script>/,
          );
          assert.match(
            html,
            /<link rel="preload" href="\/assets\/fonts\/dm-sans-latin.woff2" as="font"/,
          );
          assert.doesNotMatch(html, /fonts\.googleapis\.com|@import/);
          descriptions.add(
            html.match(/name="description" content="([^"]+)"/)[1],
          );
          const data = graph(html);
          assert.equal(data["@context"], "https://schema.org");
          const nodes = data["@graph"];
          assert.ok(
            nodes.find(
              (n) => n["@type"] === "WebSite" && n.url === domain + "/",
            ),
          );
          assert.ok(nodes.find((n) => n["@type"] === "BreadcrumbList"));
          assert.ok(nodes.find((n) => n["@id"] === domain + path + "#webpage"));
          assert.equal(
            nodes.find(
              (n) =>
                n["@id"] ===
                "https://holisticgrowthmarketing.com/#organization",
            ).name,
            "Holistic Growth Marketing LLC",
          );
          assert.match(
            r.headers.get("content-security-policy"),
            /script-src 'self' 'nonce-/,
          );
        }
        assert.equal(
          descriptions.size,
          Object.keys(publicPages(channel)).length,
          "Each public route has its own description",
        );
        const filtered = await (
          await get("/explore?category=Music&tag=independent")
        ).text();
        assert.equal(
          canonical(filtered),
          domain + "/explore?category=Music&tag=independent",
        );
        const search = await (await get("/explore?q=private-query")).text();
        assert.match(search, /noindex,nofollow/);
        assert.equal(canonical(search), domain + "/explore");
        for (const path of ["/admin/login", "/privacy/request"]) {
          const html = await (await get(path)).text();
          assert.match(html, /noindex,nofollow/);
          assert.doesNotMatch(html, /application\/ld\+json/);
        }
        const missing = await get("/unknown");
        assert.equal(missing.status, 404);
        assert.match(missing.headers.get("x-robots-tag"), /noindex/);
        for (const path of [
          `/assets/social-${channel}.png`,
          `/assets/favicon-${channel}.svg`,
          "/assets/fonts/dm-sans-latin.woff2",
          "/assets/fonts/dm-serif-display-latin.woff2",
          "/assets/site.js",
        ])
          assert.equal((await get(path)).status, 200, path);
        const manifest = await (await get("/site.webmanifest")).json();
        assert.equal(manifest.name, `VeniceBeach.${channel}`);
        const robots = await (await get("/robots.txt")).text();
        assert.match(robots, new RegExp("Sitemap: " + domain + "/sitemap.xml"));
        assert.match(robots, /Disallow: \/newsletter\/manage\//);
        const xml = await (await get("/sitemap.xml")).text();
        for (const path of Object.keys(publicPages(channel)))
          assert.ok(xml.includes(`<loc>${domain + path}</loc>`));
        assert.doesNotMatch(xml, /\/admin|\/stories\/|\/privacy\/request/);
        const stmt = app.locals.db.prepare(
          "INSERT INTO content(channel,kind,slug,title,category,summary,body,status,updated_at,event_date,venue,destination,creator_name,creator_type) VALUES(?,?,?,?,?,?,?,'published',?,?,?,?,?,?)",
        );
        for (const [kind, name] of [
          ["story", "article"],
          ["event", "event"],
          ["profile", "profile"],
          ["project", "project"],
        ]) {
          const slug = channel + "-" + name;
          stmt.run(
            channel,
            kind,
            slug,
            "Test " + name,
            "Music",
            "Unique description for " + name,
            "Visible body for " + name,
            "2026-10-16T00:00:00Z",
            kind === "event" ? "2099-01-01T20:00:00Z" : "",
            kind === "event" ? "Test venue" : "",
            "https://example.com/project",
            kind === "profile" ? "Fixture Artist" : "",
            "Person",
          );
          const html = await (await get("/stories/" + slug)).text(),
            nodes = graph(html)["@graph"];
          assert.ok(
            nodes.find(
              (n) =>
                n["@type"] ===
                (kind === "event"
                  ? "Event"
                  : kind === "project"
                    ? "CreativeWork"
                    : "Article"),
            ),
          );
          if (kind === "profile") {
            assert.ok(nodes.find((n) => n["@type"] === "ProfilePage"));
            assert.ok(
              nodes.find(
                (n) => n["@type"] === "Person" && n.name === "Fixture Artist",
              ),
            );
          }
        }
        const sample = await (
          await get(
            "/stories/" +
              (channel === "buzz"
                ? "after-the-last-set"
                : "the-space-between-frames"),
          )
        ).text();
        assert.match(sample, /noindex,nofollow/);
        assert.ok(
          !graph(sample)["@graph"].some((n) =>
            ["Article", "Event", "Person"].includes(n["@type"]),
          ),
        );
        const updated = await (await get("/sitemap.xml")).text();
        assert.match(
          updated,
          new RegExp(domain + "/stories/" + channel + "-article"),
        );
        assert.match(updated, /<lastmod>2026-10-16T00:00:00Z<\/lastmod>/);
      } finally {
        await new Promise((r) => server.close(r));
        app.locals.db.close();
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (saved === undefined) delete process.env.PUBLIC_URL;
    else process.env.PUBLIC_URL = saved;
  }
});
test("JSON-LD escaping, canonical isolation, and optional Google font hints", () => {
  const prev = process.env.FONT_SOURCE;
  process.env.FONT_SOURCE = "google";
  try {
    const meta = pageMetadata({
      channel: "buzz",
      title: "</script><script>alert(1)</script>",
      request: { path: "/about", method: "GET" },
      path: "/about",
    });
    const html = headTags(meta, {
      channel: "buzz",
      nonce: "test-nonce",
      esc: (s) =>
        String(s)
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;"),
    });
    assert.match(html, /preconnect.*fonts\.googleapis\.com/);
    assert.match(html, /fonts\.gstatic\.com" crossorigin/);
    assert.match(html, /display=optional/);
    const serialized = html.match(
      /application\/ld\+json[^>]*>(.*?)<\/script>/s,
    )[1];
    assert.doesNotMatch(serialized, /<script>/);
    assert.ok(JSON.parse(serialized)["@graph"]);
    const privateMeta = pageMetadata({
      channel: "press",
      title: "Manage subscription",
      request: { path: "/newsletter/manage/secret-token", method: "GET" },
    });
    assert.equal(privateMeta.graph, null);
    assert.doesNotMatch(privateMeta.canonical, /secret-token/);
  } finally {
    if (prev === undefined) delete process.env.FONT_SOURCE;
    else process.env.FONT_SOURCE = prev;
  }
});
