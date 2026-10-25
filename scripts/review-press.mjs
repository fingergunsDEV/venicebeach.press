import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  for (const width of [360, 768, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      bypassCSP: true,
    });
    await page.goto("http://127.0.0.1:3001/");
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      "Reflow at " + width,
    );
    await page.screenshot({
      path: `artifacts/press-${width}.png`,
      fullPage: true,
    });
    if (width === 360)
      await page.screenshot({
        path: "artifacts/press-360-fold.png",
        fullPage: false,
      });
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").innerText(), "Skip to content");
    await page.keyboard.press("Enter");
    assert.match(page.url(), /#main$/);
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(
          () =>
            getComputedStyle(document.activeElement).outlineStyle !== "none",
        ),
        true,
        "Visible keyboard focus",
      );
    }
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const results = await page.evaluate(async () =>
      axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      }),
    );
    for (const violation of results.violations)
      console.log(
        width,
        violation.id,
        violation.nodes.map((n) => n.target),
      );
    assert.deepEqual(
      results.violations.map((v) => v.id),
      [],
    );
    console.log(
      `Press ${width}px: reflow, one H1, skip navigation, visible keyboard focus, and automated accessibility pass`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
