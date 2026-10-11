/**
 * Postbuild SW generator.
 *
 * Why this exists: VitePWA's `closeBundle` hook fires BEFORE Nitro (the TanStack
 * Start bundler) has moved the build output into `.output/public/`. As a result,
 * VitePWA writes `sw.js` to `dist/` with an empty precache list (because the
 * real JS/CSS chunks live in `.output/public/assets/`, not `dist/`).
 *
 * This script runs AFTER `vite build` completes (via the `postbuild` npm hook).
 * It scans the final deployable directory (`.output/public/`) and regenerates
 * `sw.js` + `workbox-*.js` there, with a precache list that actually includes
 * all the app's hashed JS/CSS/PNG assets.
 *
 * The runtime-caching rules are duplicated from vite.config.ts so dev-mode
 * (VitePWA virtual SW) and prod-mode (this script's output) behave identically.
 */
const { generateSW } = require('workbox-build');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = '/home/z/my-project/repos/ShreeSawariyaAgroAgency';
const OUT_DIR = path.join(REPO_ROOT, '.output/public');

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error(`ERROR: ${OUT_DIR} does not exist. Run "npm run build" first.`);
    process.exit(1);
  }

  const fileCount = fs
    .readdirSync(OUT_DIR, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? fs.readdirSync(path.join(OUT_DIR, e.name)) : [e.name]))
    .length;
  console.log(`Scanning ${OUT_DIR} (${fileCount}+ entries)...`);

  const result = await generateSW({
    swDest: path.join(OUT_DIR, 'sw.js'),
    globDirectory: OUT_DIR,
    globPatterns: ['**/*.{js,css,html,svg,png,ico,jpg,jpeg,woff2,woff}'],
    globIgnores: ['**/sw.js', '**/workbox-*.js'],
    // Skip cache-busting for already-hashed Vite assets — Vite adds content
    // hashes to filenames so the URL itself is the cache key. Match anything
    // in /assets/ (Vite's hashed-output folder).
    dontCacheBustURLsMatching: /^\/assets\//,
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /^\/realtime\//],
    runtimeCaching: [
      {
        // Supabase REST + Auth + Edge Functions — online-first, fall back to cache.
        urlPattern: /^https:\/\/[^/]+\.supabase\.co\/(?:rest|auth|functions)\//i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Supabase Storage images — immutable CDN assets, cache-first.
        urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\//i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'supabase-storage',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Google Fonts stylesheets — stale-while-revalidate for instant paint.
        urlPattern: /^https:\/\/fonts\.googleapis\.com\//i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'google-fonts-stylesheets',
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Google Fonts woff2 files — immutable, cache-first.
        urlPattern: /^https:\/\/fonts\.gstatic\.com\//i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-webfonts',
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  });

  console.log(`\nSW generated:`);
  console.log(`  sw.js:                ${path.join(OUT_DIR, 'sw.js')}`);
  console.log(`  precached entries:    ${result.count}`);
  console.log(`  precached size:       ${(result.size / 1024).toFixed(1)} KB`);
  console.log(`  warnings:             ${result.warnings?.length ?? 0}`);

  // Also write a small marker file so we can verify postbuild ran
  fs.writeFileSync(
    path.join(OUT_DIR, '_pwa-build-info.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        precachedCount: result.count,
        precachedSize: result.size,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('SW generation failed:', err);
  process.exit(1);
});
