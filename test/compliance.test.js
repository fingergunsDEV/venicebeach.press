import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import { NOTICE_VERSION } from "../src/compliance.js";

test("commercial notices, privacy isolation, consent evidence, and unsubscribe failures", async () => {
  const keys = [
    "ADMIN_PASSWORD",
    "EDITOR_PASSWORD",
    "COMMERCIAL_PASSWORD",
    "MAILCHIMP_API_KEY",
    "MAILCHIMP_LIST_ID",
    "MAILCHIMP_SERVER",
    "PRIVACY_EMAIL",
    "BUSINESS_ADDRESS",
    "EMAIL_COMPLIANCE_CONFIRMED",
  ];
  const saved = keys.map((k) => process.env[k]);
  for (const k of keys) delete process.env[k];
  const originalFetch = globalThis.fetch,
    providerCalls = [];
  let providerFails = false;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes(".api.mailchimp.com/")) {
      providerCalls.push(options);
      return new Response("{}", { status: providerFails ? 500 : 200 });
    }
    return originalFetch(url, options);
  };
  const dir = mkdtempSync(join(tmpdir(), "venice-compliance-")),
    app = createApp({ dataDir: dir }),
    server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (p, cookie) =>
    fetch(base + p, {
      redirect: "manual",
      headers: cookie ? { Cookie: cookie } : {},
    });
  const post = (p, b, cookie) =>
    fetch(base + p, {
      redirect: "manual",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: new URLSearchParams(b),
    });
  const login = async (role) => {
    const key =
      role === "administrator"
        ? "ADMIN_PASSWORD"
        : role.toUpperCase() + "_PASSWORD";
    process.env[key] = "long-fixture-password-for-tests";
    const r = await post("/admin/login", { role, password: process.env[key] });
    assert.equal(r.status, 302);
    return r.headers.get("set-cookie").split(";")[0];
  };
  try {
    for (const path of [
      "/privacy",
      "/terms",
      "/disclosures",
      "/accessibility",
      "/privacy/request",
    ])
      assert.equal((await get(path)).status, 200);
    const privacy = await (await get("/privacy")).text();
    assert.match(privacy, /Holistic Growth Marketing LLC/);
    assert.match(privacy, /215 Market Street, Venice, CA 90291/);
    assert.match(privacy, /mailto:info@venicebeach.buzz/);
    assert.match(privacy, /jason@holisticgrowthmarketing.com/);
    assert.match(privacy, /California single-member LLC/);
    assert.match(privacy, /holisticgrowthmarketing.com\/privacy.html/);
    const nl = await (await get("/newsletter")).text();
    assert.match(nl, /sponsor promotions/);
    assert.doesNotMatch(nl, /name="consent"[^>]*checked/);
    assert.equal(
      (
        await post("/newsletter", {
          email: "requester@example.com",
          consent: "yes",
        })
      ).status,
      400,
    );
    const signup = await post("/newsletter", {
      email: "requester@example.com",
      consent: "yes",
      adult: "yes",
    });
    assert.equal(signup.status, 200);
    const first = app.locals.db.prepare("SELECT * FROM subscribers").get();
    assert.equal(first.notice_version, NOTICE_VERSION);
    assert.ok(first.consent_at);
    assert.equal(signup.headers.get("cache-control"), "no-store");
    assert.match(
      await signup.text(),
      new RegExp("/newsletter/manage/" + first.token),
    );
    assert.equal((await get("/newsletter/manage/" + first.token)).status, 200);
    assert.equal(
      app.locals.db.prepare("SELECT status FROM subscribers").get().status,
      "pending_configuration",
      "GET cannot unsubscribe",
    );
    assert.equal(
      (await post("/newsletter/manage/" + first.token, {})).status,
      200,
    );
    const withdrawn = app.locals.db.prepare("SELECT * FROM subscribers").get();
    assert.equal(withdrawn.status, "unsubscribed");
    assert.ok(withdrawn.withdrawn_at);
    assert.equal(
      (
        await post("/privacy/request", {
          email: "private-rights@example.com",
          request_type: "Deletion",
          summary: "Remove my submitted contact information.",
        })
      ).status,
      200,
    );
    const request = app.locals.db
      .prepare("SELECT * FROM leads WHERE type='privacy'")
      .get();
    assert.equal(request.status, "new");
    assert.equal(JSON.parse(request.payload).notice_version, NOTICE_VERSION);
    for (const role of ["commercial", "editor", "administrator"]) {
      const cookie = await login(role);
      const html = await (await get("/admin", cookie)).text();
      if (role === "administrator") {
        assert.match(html, /private-rights@example.com/);
        const csrf = html.match(/name="csrf" value="([a-f0-9]+)"/)[1];
        assert.equal(
          (
            await post(
              "/admin/contracts",
              {
                name: "Customer",
                recurring: "Recurring",
                monthly_cents: "50000",
                deliverables: "Placement",
                renewal_date: "2027-01-01",
                csrf,
              },
              cookie,
            )
          ).status,
          400,
        );
      } else {
        assert.doesNotMatch(html, /private-rights@example.com/);
        assert.equal(
          (
            await post(
              "/admin/leads/" + request.id,
              {
                status: "closed",
                csrf: html.match(/name="csrf" value="([a-f0-9]+)"/)[1],
              },
              cookie,
            )
          ).status,
          403,
        );
      }
    }
    process.env.MAILCHIMP_API_KEY = "fixture-not-a-real-key";
    process.env.MAILCHIMP_LIST_ID = "fixture";
    process.env.MAILCHIMP_SERVER = "us1";
    assert.equal(
      (
        await post("/newsletter", {
          email: "provider@example.com",
          adult: "yes",
          consent: "yes",
        })
      ).status,
      503,
    );
    assert.equal(providerCalls.length, 0);
    process.env.BUSINESS_ADDRESS = "Fixture business mailing address";
    process.env.PRIVACY_EMAIL = "privacy@example.com";
    process.env.EMAIL_COMPLIANCE_CONFIRMED = "yes";
    assert.equal(
      (
        await post("/newsletter", {
          email: "provider@example.com",
          adult: "yes",
          consent: "yes",
        })
      ).status,
      200,
    );
    assert.equal(JSON.parse(providerCalls[0].body).status, "pending");
    providerFails = true;
    const sub = app.locals.db
      .prepare("SELECT * FROM subscribers WHERE email=?")
      .get("provider@example.com");
    const unsubscribe = await post("/newsletter/manage/" + sub.token, {});
    assert.equal(unsubscribe.status, 200);
    assert.match(await unsubscribe.text(), /could not be confirmed/);
    assert.equal(
      app.locals.db
        .prepare("SELECT status FROM subscribers WHERE id=?")
        .get(sub.id).status,
      "unsubscribed",
    );
    assert.ok(
      app.locals.db
        .prepare("SELECT count(*) AS n FROM leads WHERE type='privacy'")
        .get().n >= 2,
    );
    assert.equal((await get("/newsletter/manage/bad-token")).status, 404);
    assert.doesNotMatch(
      JSON.stringify(app.locals.db.prepare("SELECT * FROM metrics").all()),
      /requester@example.com|private-rights@example.com/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise((r) => server.close(r));
    app.locals.db.close();
    rmSync(dir, { recursive: true, force: true });
    keys.forEach((k, i) => {
      if (saved[i] === undefined) delete process.env[k];
      else process.env[k] = saved[i];
    });
  }
});
