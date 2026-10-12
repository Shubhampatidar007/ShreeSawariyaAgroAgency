export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load — Shree Sawariya Agro Agency</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
    <style>
      :root { color-scheme: light dark; }
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: max(env(safe-area-inset-top), 1.5rem) max(env(safe-area-inset-right), 1.5rem) max(env(safe-area-inset-bottom), 1.5rem) max(env(safe-area-inset-left), 1.5rem); }
      @media (prefers-color-scheme: dark) { body { background: #000; color: #f5f5f5; } .card { background: #171717; border-color: #262626; } p { color: #a3a3a3; } .secondary { background: #171717; color: #f5f5f5; border-color: #262626; } }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; border: 1px solid #e5e7eb; border-radius: 0.75rem; background: #fff; }
      .icon { width: 3.5rem; height: 3.5rem; margin: 0 auto 1rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; background: #fee2e2; color: #dc2626; font-size: 1.5rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; display: inline-flex; align-items: center; gap: 0.375rem; }
      .primary { background: #16a34a; color: #fff; }
      .primary:hover { background: #15803d; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
      .secondary:hover { background: #f5f5f5; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon" aria-hidden="true">!</div>
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
