import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";
test("Press coastal editorial design and source-backed local news publishing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "press-design-")),
    previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "press-fixture-password-12345";
  const app = createApp({ channel: "press", dataDir: dir }),
    server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path, headers = {}) =>
    fetch(base + path, { headers, redirect: "manual" });
  const post = (path, data, cookie = "") =>
    fetch(base + path, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      body: new URLSearchParams(data),
    });
  try {
    const html = await (await get("/")).text();
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.match(html, /Venice Beach,<br><em>in focus/);
    assert.match(html, /local news, community announcements, classifieds/i);
    assert.match(html, /original editorial illustration/);
    assert.match(html, /not a live conditions feed/);
    assert.match(html, /Sample content/);
    for (const path of [
      "/news",
      "/community",
      "/classifieds",
      "/marketplace",
    ]) {
      const r = await get(path);
      assert.equal(r.status, 200);
      const page = await r.text();
      assert.match(page, /No (verified local news stories|approved listings)/);
      assert.match(page, /application\/ld\+json/);
    }
    const sitemap = await (await get("/sitemap.xml")).text();
    assert.match(sitemap, /https:\/\/venicebeach.press\/community/);
    assert.equal((await get("/assets/press-coast.svg")).status, 200);
    assert.equal((await get("/assets/press.css")).status, 200);
    const login = await post("/admin/login", {
      password: process.env.ADMIN_PASSWORD,
    });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const form = await (
      await get("/admin/content/new", { Cookie: cookie })
    ).text();
    const csrf = form.match(/name="csrf" value="([a-f0-9]+)"/)[1];
    const article = {
      csrf,
      channel: "press",
      kind: "story",
      slug: "fixture-local-news",
      title: "Fixture neighborhood report",
      category: "Local news",
      summary: "This is an isolated test, not a real report.",
      body: "Source-attributed test fixture.",
      status: "published",
      verified: "yes",
    };
    assert.equal(
      (await post("/admin/content/new", article, cookie)).status,
      400,
      "Unverified local news cannot publish",
    );
    const verified = {
      ...article,
      byline: "Fixture Reporter",
      source_url: "https://example.com/source",
      published_at: "2026-10-01T12:00:00Z",
      verified_at: "2026-10-01T13:00:00Z",
    };
    assert.equal(
      (
        await post(
          "/admin/content/new",
          { ...verified, verified_at: "2099-01-01T00:00:00Z" },
          cookie,
        )
      ).status,
      400,
    );
    assert.equal(
      (await post("/admin/content/new", verified, cookie)).status,
      302,
    );
    const story = await (await get("/stories/fixture-local-news")).text();
    assert.match(story, /By Fixture Reporter/);
    assert.match(story, /<time datetime="2026-10-01T12:00:00.000Z">/);
    assert.match(story, /Last verified/);
    assert.match(story, /https:\/\/example.com\/source/);
    const graph = JSON.parse(
      story.match(/application\/ld\+json[^>]*>(.*?)<\/script>/s)[1],
    )["@graph"];
    const news = graph.find((n) => n["@type"] === "NewsArticle");
    assert.equal(news.author.name, "Fixture Reporter");
    assert.equal(news.citation, "https://example.com/source");
    assert.ok(
      graph.find((n) => n["@type"] === "Place" && n.name === "Venice Beach"),
    );
  } finally {
    await new Promise((r) => server.close(r));
    app.locals.db.close();
    rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previous;
  }
});
