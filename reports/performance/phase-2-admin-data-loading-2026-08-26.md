# Phase 2 — Admin Data Loading

Date: 2026-08-26
Branch: `fix/lagging-issue-26-08`

## Changes

The admin route no longer starts the legacy all-dataset shop load when `/admin` opens.

Data is now requested by the active admin route and cached per section. Concurrent requests for the same section share one in-flight promise, and returning to an already-loaded section does not trigger another section request.

The overview loads only the data it actually needs plus a small shared set required by globally mounted admin UI:

- notifications
- customer summary fields used by the dashboard and header alerts
- inventory fields used by dashboard/low-stock UI
- active inventory reminder records used by the low-stock popup
- overview orders and ledger data

Other datasets are loaded only when their related admin area is opened.

The Customers/Khata area also lazy-loads the published product/variant catalog because `KhataSaleDialog` directly depends on that catalog.

## Scope Protection

No Supabase migrations, tables, columns, functions, policies, storage objects, or data were changed by Phase 2.

The Phase 2 diff against the Phase 1 checkpoint contains only:

- `src/lib/admin-route-data-v2.ts`
- `src/lib/admin-supporting-data.ts`
- `src/routes/admin.tsx`

The earlier superseded loader created during implementation was removed before the final Phase 2 diff.

## Verification

GitHub diff inspection confirms no unrelated files and no Supabase changes.

Local production build/runtime verification must be run from the developer environment before Phase 2 is marked fully accepted. The GitHub connector does not expose a runnable local build environment or configured CI checks for this repository.
