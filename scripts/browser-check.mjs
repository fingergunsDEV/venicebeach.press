import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const failures = [];
try {
  for (const [channel, port] of [
    ["buzz", 3000],
    ["press", 3001],
  ]) {
    for (const [label, width, height] of [
      ["desktop", 1440, 1000],
      ["mobile", 390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } });
      page.on("pageerror", (e) => failures.push(e.message));
      for (const route of [
        "/",
        "/events",
        "/creators",
        "/explore",
        "/sponsor",
        "/submit",
        "/inquire",
        "/newsletter",
        "/about",
        "/privacy",
        "/privacy/request",
        "/disclosures",
        "/accessibility",
        "/terms",
        "/admin/login",
        ...(channel === "press"
          ? ["/news", "/community", "/classifieds", "/marketplace"]
          : []),
        "/stories/" +
          (channel === "buzz"
            ? "after-the-last-set"
            : "the-space-between-frames"),
      ]) {
        const r = await page.goto(`http://127.0.0.1:${port}${route}`);
        assert.equal(r.status(), 200, `${channel} ${route}`);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
          `Overflow: ${channel} ${label} ${route}`,
        );
        if (route === "/")
          await page.screenshot({
            path: `artifacts/${channel}-${label}.png`,
            fullPage: true,
          });
      }
      await page.goto(`http://127.0.0.1:${port}/submit`);
      await page.getByRole("button", { name: "Send for review" }).click();
      assert.equal(
        (await page.locator("input:invalid").count()) > 0,
        true,
        "HTML form validation",
      );
      if (label === "mobile") {
        const scan = await browser.newPage({
          bypassCSP: true,
          viewport: { width, height },
        });
        for (const route of [
          "/",
          "/events",
          "/explore",
          "/sponsor",
          "/submit",
          "/inquire",
          "/newsletter",
          "/about",
          "/privacy",
          "/privacy/request",
          "/disclosures",
          "/accessibility",
          "/terms",
          "/admin/login",
          ...(channel === "press"
            ? ["/news", "/community", "/classifieds", "/marketplace"]
            : []),
        ]) {
          await scan.goto(`http://127.0.0.1:${port}${route}`);
          await scan.addScriptTag({
            path: require.resolve("axe-core/axe.min.js"),
          });
          const result = await scan.evaluate(
            async () =>
              await axe.run(document, {
                runOnly: {
                  type: "tag",
                  values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
                },
              }),
          );
          assert.deepEqual(
            result.violations.map((v) => v.id),
            [],
            `${channel} ${route}: WCAG violations`,
          );
        }
        await scan.close();
      }
      await page.close();
      console.log(
        `${channel} ${label}: public pages render without horizontal overflow; required form validation works`,
      );
    }
  }
  assert.deepEqual(failures, []);
} finally {
  await browser.close();
}
