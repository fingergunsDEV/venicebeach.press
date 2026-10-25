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
    const color = channel === "buzz" ? "#dcff5d" : "#d3e1d8";
    const svg =
      channel === "press"
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f6f2e9"/><path d="M900 0h300v630H900z" fill="#d3e1d8"/><circle cx="1000" cy="230" r="130" fill="#d9a58f"/><path d="M0 540h1200" stroke="#243c37"/><text x="70" y="70" fill="#243c37" font-family="Arial,sans-serif" font-size="18" letter-spacing="3">VENICE BEACH / LOS ANGELES, CALIFORNIA</text><text x="68" y="180" fill="#243c37" font-family="Georgia,serif" font-size="65">Venice Beach</text><text x="60" y="350" fill="#243c37" font-family="Georgia,serif" font-size="180">PRESS.</text><text x="72" y="440" fill="#a44e3d" font-family="Georgia,serif" font-style="italic" font-size="42">Local perspective. Coastal character.</text><text x="72" y="590" fill="#243c37" font-family="Arial,sans-serif" font-size="18">LOCAL NEWS · COMMUNITY · CLASSIFIEDS · MARKETPLACE</text></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#1e2723"/><circle cx="1040" cy="190" r="230" fill="${color}"/><path d="M0 530L1200 300M0 570L1200 340M0 610L1200 380" stroke="${color}" stroke-width="2"/><text x="70" y="90" fill="${color}" font-family="Arial,sans-serif" font-size="20" letter-spacing="4">VENICEBEACH.MEDIA / INDEPENDENT CULTURE</text><text x="70" y="275" fill="#f5f2e9" font-family="Arial,sans-serif" font-size="85" font-weight="bold">venicebeach.${channel}</text><text x="75" y="370" fill="#f5f2e9" font-family="Georgia,serif" font-size="42">${channel === "buzz" ? "Discover the scene." : "Meet the people behind it."}</text><text x="75" y="580" fill="#f5f2e9" font-family="Arial,sans-serif" font-size="17">MUSIC · FILM · ARTS · VENICE BEACH, CALIFORNIA</text></svg>`;
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
