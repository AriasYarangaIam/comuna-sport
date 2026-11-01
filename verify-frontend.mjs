// Verify frontend implementation matches FRONTEND_PLAN.md
const task = await taskSpace("verify-frontend-plan");
const page = task.page("p1");

// Navigate to the running frontend
await page.goto("http://localhost:5173");
await page.waitForLoadState("networkidle");

console.log("=== VERIFICACIÓN DEL FRONTEND ===\n");

// Take initial snapshot
const snapshot = await page.snapshot();
console.log("SNAPSHOT INICIAL:");
console.log(snapshot);
console.log("\n");

// Check HTML lang attribute
const lang = await page.evaluate(() => document.documentElement.lang);
console.log(`✓ HTML lang: ${lang} (plan: es-PE)`);

// Check title
const title = await page.title();
console.log(`✓ Title: ${title}`);

// Check if Tailwind is working (not CDN)
const hasTailwindCDN = await page.evaluate(() => {
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  return scripts.some(s => s.src.includes('cdn.tailwindcss.com'));
});
console.log(`✓ Tailwind CDN: ${hasTailwindCDN ? '❌ PRESENTE (mal)' : '✅ AUSENTE (bien)'}`);

// Check if fonts are self-hosted (not Google Fonts CDN)
const hasGoogleFonts = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  return links.some(l => l.href.includes('fonts.googleapis.com'));
});
console.log(`✓ Google Fonts CDN: ${hasGoogleFonts ? '❌ PRESENTE (mal)' : '✅ AUSENTE (bien)'}`);

// Check semantic structure
const semanticCheck = await page.evaluate(() => {
  return {
    hasHeader: !!document.querySelector('header'),
    hasNav: !!document.querySelector('nav'),
    hasMain: !!document.querySelector('main'),
    hasFooter: !!document.querySelector('footer'),
    hasH1: !!document.querySelector('h1'),
  };
});
console.log(`✓ Estructura semántica:`);
console.log(`  - header: ${semanticCheck.hasHeader ? '✅' : '❌'}`);
console.log(`  - nav: ${semanticCheck.hasNav ? '✅' : '❌'}`);
console.log(`  - main: ${semanticCheck.hasMain ? '✅' : '❌'}`);
console.log(`  - footer: ${semanticCheck.hasFooter ? '✅' : '❌'}`);
console.log(`  - h1: ${semanticCheck.hasH1 ? '✅' : '❌'}`);

// Check viewport
const viewport = await page.evaluate(() => ({
  width: window.innerWidth,
  height: window.innerHeight,
}));
console.log(`\n✓ Viewport actual: ${viewport.width}x${viewport.height}`);

// Check responsive navigation (should be bottom nav on mobile)
const hasBottomNav = await page.evaluate(() => {
  const bottomNav = document.querySelector('nav[aria-label*="inferior"], nav[class*="bottom"], nav[class*="fixed bottom"]');
  return !!bottomNav;
});
console.log(`✓ Bottom navigation (mobile): ${hasBottomNav ? '✅' : '❌'}`);

// Check for skip link (accessibility)
const hasSkipLink = await page.evaluate(() => {
  const skipLink = document.querySelector('a[href="#main-content"], a[href="#content"], a.skip-link');
  return !!skipLink;
});
console.log(`✓ Skip link: ${hasSkipLink ? '✅' : '❌'}`);

console.log("\n=== FIN DE VERIFICACIÓN BÁSICA ===");

// Keep the task open for further inspection
await task.finish({ keep: ["p1"] });
