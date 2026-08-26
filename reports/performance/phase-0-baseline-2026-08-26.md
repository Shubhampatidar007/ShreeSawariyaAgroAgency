# Phase 0 — Performance Baseline

Date: 2026-08-26
Branch: `fix/lagging-issue-26-08`
Baseline source: uploaded Chrome performance trace + HAR from the development environment.

## Scope and safety rules

- No application code was changed in Phase 0.
- No Supabase schema, data, policies, functions, storage, or configuration was changed.
- This phase records a baseline only; optimization starts after this checkpoint.
- Existing functionality and business logic remain untouched.

## Measurements available from the supplied artifacts

### HAR: `localhost:8080`

- Browser page: `http://localhost:8080/`
- DOMContentLoaded: 757 ms
- Load event: 1,063 ms
- Requests captured: 41
- All 41 requests were Supabase fetches.
- HTTP responses: 40 × 200 and 1 × 401.
- Transferred bytes recorded by HAR: 63,131 bytes.
- The HAR shows repeated requests to the same endpoints, including `profiles`, `user_roles`, `products`, `product_variants`, and `cms_sections`.
- The slowest captured request was `profiles` at 1,226 ms.
- Other high-latency requests included `user_roles` at 1,168 ms, auth token exchange at 1,040 ms, and another `user_roles`/`profiles` pair at about 918/914 ms.

### Chrome performance trace

The supplied trace contains the initial public page plus admin soft navigations to:

- `/admin`
- `/admin/sales`
- `/admin/inventory`
- `/admin/customers`

The trace records a navigation LCP candidate of 7,267 ms, but this is not treated as a clean production LCP baseline because the trace also contains later soft navigations and development-session activity. The trace should therefore be used as diagnostic evidence, not as the final production KPI.

Measured soft-navigation FCP timings in the trace were approximately:

| Route | FCP after soft navigation |
| --- | ---: |
| `/admin` | 152 ms |
| `/admin/sales` | 788 ms |
| `/admin/inventory` | 781 ms |
| `/admin/customers` | 2,078 ms |

The trace also shows a large amount of browser/devtools/system work, so laptop/tooling overhead is not yet separated from application work.

## What Phase 0 could not safely complete in this environment

The repository is public, but this execution environment could not resolve `github.com`, so a local production build and browser run from the repository could not be executed here. Because of that limitation, the following are intentionally marked incomplete rather than guessed:

- Production `npm run build` verification.
- Five clean production measurements for the public homepage.
- Five clean production measurements for login.
- Five clean production measurements for `/admin` after authentication.
- Clean extension-disabled / DevTools-disabled measurements.
- Reliable production LCP, FCP, CLS, TBT, INP and TTFB across the requested five-run samples.
- Exact "time until usable" for each flow under production conditions.

## Required next measurement run

Before changing application behavior, repeat the following against the production build:

1. Build with `npm run build`.
2. Serve with the production preview/server.
3. Measure homepage with a hard reload five times.
4. Measure login five times.
5. Measure authenticated `/admin` five times.
6. Record median and worst-case LCP, FCP, CLS, TBT, INP, TTFB, request count, transferred bytes, and time-to-usable.
7. Repeat the same tests with browser extensions and DevTools disabled.
8. Compare the clean production measurements with this diagnostic baseline.

## Phase 0 conclusion

The supplied evidence already identifies real application-level loading concerns, especially repeated authentication/profile requests and broad Supabase data loading. However, no optimization is being applied in Phase 0. Those changes must wait until the clean production baseline is available so improvements can be measured without confusing browser/devtools overhead with application performance.
