import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";

test("shared network: public discovery, moderation, publishing, reporting, privacy", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "venice-test-"));
  const mailKeys = [
    "MAILCHIMP_API_KEY",
    "MAILCHIMP_LIST_ID",
    "MAILCHIMP_SERVER",
  ];
  const mailValues = mailKeys.map((k) => process.env[k]);
  for (const k of mailKeys) delete process.env[k];
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "test-password-at-least-16";
  const buzz = createApp({ channel: "buzz", dataDir: dir }),
    press = createApp({ channel: "press", dataDir: dir });
  const a = buzz.listen(0, "127.0.0.1"),
    b = press.listen(0, "127.0.0.1");
  await Promise.all([
    new Promise((r) => a.once("listening", r)),
    new Promise((r) => b.once("listening", r)),
  ]);
  const base = `http://127.0.0.1:${a.address().port}`,
    second = `http://127.0.0.1:${b.address().port}`;
  const get = (path, options = {}) =>
    fetch(base + path, { redirect: "manual", ...options });
  const post = (path, body, cookie = "") =>
    get(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: new URLSearchParams(body),
    });
  let cookie, csrf;
  try {
    await t.test(
      "distinct server-rendered channels with safe preview content",
      async () => {
        const r = await get("/");
        assert.equal(r.status, 200);
        assert.match(await r.text(), /Pure Venice/);
        assert.match(
          r.headers.get("content-security-policy"),
          /frame-ancestors 'none'/,
        );
        assert.match(await (await fetch(second)).text(), /Meet the minds/);
        const calendar = await (await get("/events")).text();
        assert.match(calendar, /No matching published listings/);
        assert.doesNotMatch(calendar, /After the last set/);
        const sitemap = await (await get("/sitemap.xml")).text();
        assert.doesNotMatch(sitemap, /after-the-last-set/);
        assert.equal((await get("/missing")).status, 404);
      },
    );
    await t.test(
      "consent validation and private moderation queue",
      async () => {
        assert.equal((await post("/submit", { email: "bad" })).status, 400);
        const payload = {
          name: "Private Submitter",
          email: "private@example.com",
          title: "Test show",
          kind: "event",
          category: "Music",
          destination: "https://example.com/show",
          summary: "An original project",
          rights: "yes",
          consent: "yes",
          adult: "yes",
        };
        assert.equal((await post("/submit", payload)).status, 200);
        assert.equal(
          buzz.locals.db.prepare("SELECT count(*) AS n FROM leads").get().n,
          1,
        );
        assert.doesNotMatch(
          await (await get("/")).text(),
          /private@example.com/,
        );
        assert.equal((await get("/admin")).status, 302);
        const hostile = await get("/submit", {
          method: "POST",
          headers: {
            Origin: "https://attacker.example",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(payload),
        });
        assert.equal(hostile.status, 403);
      },
    );
    await t.test(
      "password authentication, session and CSRF protection",
      async () => {
        assert.equal(
          (await post("/admin/login", { password: "wrong" })).status,
          401,
        );
        const r = await post("/admin/login", {
          password: process.env.ADMIN_PASSWORD,
        });
        assert.equal(r.status, 302);
        cookie = r.headers.get("set-cookie").split(";")[0];
        assert.match(r.headers.get("set-cookie"), /HttpOnly/);
        const admin = await get("/admin", { headers: { Cookie: cookie } });
        assert.equal(admin.headers.get("cache-control"), "no-store");
        const html = await admin.text();
        assert.match(html, /private@example.com/);
        csrf = html.match(/name="csrf" value="([a-f0-9]+)"/)[1];
        assert.equal(
          (await post("/admin/leads/1", { status: "accepted" }, cookie)).status,
          403,
        );
        assert.equal(
          (await post("/admin/leads/1", { status: "accepted", csrf }, cookie))
            .status,
          302,
        );
      },
    );
    const content = {
      channel: "buzz",
      kind: "event",
      slug: "verified-test-show",
      title: "Verified test show",
      category: "Music",
      summary: "Verified test fixture",
      body: "A real test body <script>alert(1)</script>",
      venue: "Test venue",
      event_date: "2099-01-01T20:00:00-08:00",
      destination: "https://example.com/show",
      sponsor: "Example sponsor",
      campaign_id: "test-campaign-01",
      tags: "independent-music,live",
      status: "published",
      verified: "yes",
    };
    await t.test(
      "publishing, expiry, scheduling, safe links and duplicate slugs",
      async () => {
        assert.equal(
          (await post("/admin/content/new", { ...content, csrf }, cookie))
            .status,
          302,
        );
        const html = await (await get("/events")).text();
        assert.match(html, /Verified test show/);
        assert.match(html, /Advertisement · Paid content by Example sponsor/);
        const tagged = await (await get("/explore?tag=live")).text();
        assert.match(tagged, /Verified test show/);
        assert.doesNotMatch(tagged, /After the last set/);
        assert.equal((await get("/events?date=2099-01-01")).status, 200);
        const story = await (await get("/stories/verified-test-show")).text();
        assert.match(story, /&lt;script&gt;/);
        assert.doesNotMatch(story, /<script>alert/);
        assert.equal(
          (await post("/admin/content/new", { ...content, csrf }, cookie))
            .status,
          409,
        );
        assert.equal(
          (
            await post(
              "/admin/content/new",
              {
                ...content,
                slug: "bad-url",
                destination: "javascript:alert(1)",
                csrf,
              },
              cookie,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await post(
              "/admin/content/new",
              {
                ...content,
                slug: "old-show",
                event_date: "2020-01-01T00:00:00Z",
                csrf,
              },
              cookie,
            )
          ).status,
          302,
        );
        assert.doesNotMatch(
          await (await get("/events")).text(),
          /href="\/stories\/old-show"/,
        );
        assert.equal(
          (
            await post(
              "/admin/content/new",
              {
                ...content,
                slug: "scheduled-show",
                publish_at: "2099-01-01T00:00:00Z",
                csrf,
              },
              cookie,
            )
          ).status,
          302,
        );
        assert.equal((await get("/stories/scheduled-show")).status, 404);
        assert.equal(
          (
            await post(
              "/admin/content/new",
              {
                ...content,
                slug: "press-profile",
                channel: "press",
                kind: "profile",
                csrf,
              },
              cookie,
            )
          ).status,
          302,
        );
        assert.equal(
          (await fetch(second + "/stories/press-profile")).status,
          200,
        );
        assert.equal((await get("/stories/press-profile")).status, 404);
      },
    );
    await t.test(
      "outbound tracking and financial reporting separate recurring fees",
      async () => {
        const id = buzz.locals.db
          .prepare("SELECT id FROM content WHERE slug=?")
          .get("verified-test-show").id;
        const out = await get("/out/" + id);
        assert.equal(out.status, 302);
        assert.equal(out.headers.get("location"), "https://example.com/show");
        for (const [name, recurring, monthly_cents] of [
          ["Monthly sponsor", "Recurring", "35000"],
          ["Single campaign", "One-time", "90000"],
        ])
          assert.equal(
            (
              await post(
                "/admin/contracts",
                {
                  name,
                  recurring,
                  monthly_cents,
                  renewal_date: "2027-01-01",
                  deliverables: "One agreed placement",
                  agreement_ref: "TEST-SIGNED-001",
                  terms_confirmed: "yes",
                  csrf,
                },
                cookie,
              )
            ).status,
            302,
          );
        const html = await (
          await get("/admin", { headers: { Cookie: cookie } })
        ).text();
        assert.match(html, /Contracted MRR: \$350.00/);
        const csv = await (
          await get("/admin/report.csv", { headers: { Cookie: cookie } })
        ).text();
        assert.match(csv, /event_outbound_click/);
        assert.doesNotMatch(csv, /private@example.com/);
      },
    );
    await t.test(
      "roles restrict publishing, private submissions, and billing",
      async () => {
        for (const role of ["editor", "contributor", "commercial"]) {
          const key = role.toUpperCase() + "_PASSWORD";
          process.env[key] = "role-password-at-least-16";
          const login = await post("/admin/login", {
            role,
            password: process.env[key],
          });
          assert.equal(login.status, 302);
          const roleCookie = login.headers.get("set-cookie").split(";")[0];
          const desk = await (
            await get("/admin", { headers: { Cookie: roleCookie } })
          ).text();
          if (role === "commercial") {
            assert.doesNotMatch(desk, /private@example.com/);
            assert.equal(
              (
                await get("/admin/content/1", {
                  headers: { Cookie: roleCookie },
                })
              ).status,
              403,
            );
          } else if (role === "contributor") {
            assert.doesNotMatch(desk, /private@example.com/);
            assert.equal(
              (
                await get("/admin/content/1", {
                  headers: { Cookie: roleCookie },
                })
              ).status,
              403,
            );
            const form = await (
              await get("/admin/content/new", {
                headers: { Cookie: roleCookie },
              })
            ).text();
            const token = form.match(/name="csrf" value="([a-f0-9]+)"/)[1];
            assert.equal(
              (
                await post(
                  "/admin/content/new",
                  {
                    ...content,
                    slug: "contributor-draft",
                    status: "published",
                    csrf: token,
                  },
                  roleCookie,
                )
              ).status,
              403,
            );
            assert.equal(
              (
                await post(
                  "/admin/content/new",
                  {
                    ...content,
                    slug: "contributor-draft",
                    status: "review",
                    csrf: token,
                  },
                  roleCookie,
                )
              ).status,
              302,
            );
            assert.equal((await get("/stories/contributor-draft")).status, 404);
          } else {
            assert.match(desk, /private@example.com/);
            assert.doesNotMatch(desk, /Monthly sponsor/);
            assert.equal(
              (
                await get("/admin/report.csv", {
                  headers: { Cookie: roleCookie },
                })
              ).status,
              403,
            );
            assert.equal(
              (
                await get("/admin/preview/1", {
                  headers: { Cookie: roleCookie },
                })
              ).status,
              200,
            );
          }
          delete process.env[key];
        }
        assert.ok(
          buzz.locals.db.prepare("SELECT count(*) AS n FROM revisions").get()
            .n >= 4,
        );
        const csv = await (
          await get("/admin/report.csv", { headers: { Cookie: cookie } })
        ).text();
        assert.match(csv, /test-campaign-01/);
      },
    );
    await t.test(
      "newsletter remains honestly pending without provider credentials",
      async () => {
        const r = await post("/newsletter", {
          email: "subscriber@example.com",
          consent: "yes",
          adult: "yes",
        });
        assert.equal(r.status, 200);
        assert.match(await r.text(), /no email has been sent/);
        assert.equal(
          buzz.locals.db.prepare("SELECT status FROM subscribers").get().status,
          "pending_configuration",
        );
        assert.equal(
          (await post("/admin/logout", { csrf }, cookie)).status,
          302,
        );
        assert.equal(
          (await get("/admin", { headers: { Cookie: cookie } })).status,
          302,
        );
      },
    );
  } finally {
    await Promise.all([
      new Promise((r) => a.close(r)),
      new Promise((r) => b.close(r)),
    ]);
    buzz.locals.db.close();
    press.locals.db.close();
    rmSync(dir, { recursive: true, force: true });
    mailKeys.forEach((k, i) => {
      if (mailValues[i] === undefined) delete process.env[k];
      else process.env[k] = mailValues[i];
    });
    if (previous === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previous;
  }
});
