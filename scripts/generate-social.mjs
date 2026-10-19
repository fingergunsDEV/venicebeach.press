// Original brand artwork, rendered locally. No remote images or fonts.
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  headless: true,
});
try {
  for (const channel of ["buzz", "press"]) {
    const color = channel === "buzz" ? "#dcff5d" : "#efb9fd";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#1e2723"/><circle cx="1040" cy="190" r="230" fill="${color}"/><path d="M0 530L1200 300M0 570L1200 340M0 610L1200 380" stroke="${color}" stroke-width="2"/><text x="70" y="90" fill="${color}" font-family="Arial,sans-serif" font-size="20" letter-spacing="4">VENICEBEACH.MEDIA / INDEPENDENT CULTURE</text><text x="70" y="275" fill="#f5f2e9" font-family="Arial,sans-serif" font-size="85" font-weight="bold">venicebeach.${channel}</text><text x="75" y="370" fill="#f5f2e9" font-family="Georgia,serif" font-size="42">${channel === "buzz" ? "Discover the scene." : "Meet the people behind it."}</text><text x="75" y="580" fill="#f5f2e9" font-family="Arial,sans-serif" font-size="17">MUSIC · FILM · ARTS · VENICE BEACH, CALIFORNIA</text></svg>`;
    writeFileSync(
      new URL(`../public/social-${channel}.svg`, import.meta.url),
      svg,
    );
    writeFileSync(
      new URL(`../public/favicon-${channel}.svg`, import.meta.url),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${color}"/><path d="M14 18h9l9 26 9-26h9L36 50h-8z" fill="#1e2723"/></svg>`,
    );
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<html><head><style>html,body{margin:0;width:1200px;height:630px;overflow:hidden}</style></head><body>${svg}</body></html>`,
    );
    await page.screenshot({
      path: new URL(`../public/social-${channel}.png`, import.meta.url)
        .pathname,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
