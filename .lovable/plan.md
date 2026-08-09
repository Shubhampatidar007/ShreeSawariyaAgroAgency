# Fix-up Pass: Access Control, Real Data, Cart UI, Broken Actions

## 1. About the "missing project" in your organization
Your backend runs on Lovable Cloud, which manages the database for you. It does not show up inside your own organization because it lives in Lovable-managed infrastructure. Tables, auth users and data are all visible from the in-app Backend view. No code change — just clarification.

## 2. Owner account
Create the shop-owner account with the email and password you provided, confirmed and ready to sign in, and grant it the admin role. Other new sign-ups keep the customer role.

## 3. Hide the admin entry from the public site
- Remove the always-visible "Shop admin panel" link from the storefront top nav, mobile menu and footer.
- Show an "Admin panel" entry only inside the account dropdown, and only for a signed-in admin/staff user.
- Guard the whole `/admin` area: not signed in -> back to the storefront with the login dialog; signed in without admin/staff -> access denied screen.

## 4. Cart UI (front-end only)
- Browser-side cart store: add, change quantity, remove, clear, persisted locally.
- "Add to cart" on product cards actually adds, with a confirmation toast.
- Header cart icon shows the live count and opens a slide-over panel: line items, quantity steppers, remove, subtotal, and a Checkout button left inert for your backend work.
- Translated and theme-aware.

## 5. Replace remaining mock data with live records
Wired to the database, with loading and empty states:
- Dashboard overview: stats, sales trend, recent bills, low-stock alerts.
- Advertisements, activity logs, security logs, backups list.
- Global admin search: real products, customers, suppliers, orders.
- Analytics and the settings business profile.
- Storefront categories and featured products come from published products; only static shop contact/branding info stays hard-coded.

## 6. Broken actions and redirects
- Advertisements: "New campaign" opens a working create form (name, placement, schedule, status) that saves; row actions edit/pause/delete.
- Any remaining dead button gets a real action or is removed.
- Khata export and the generic export menu produce real CSV/print output instead of a "coming soon" toast.
- Remove leftover "arriving in Phase X" placeholder wording wherever it still shows.

## 7. Translation gaps
Sweep remaining hard-coded English in admin modules, dialogs, toasts and empty states into the dictionaries so Hindi covers the full interface. User-entered data (names, amounts, remarks) stays as typed.

## Technical notes
- Admin gating reads roles through the existing auth store; data access stays protected by row-level policies, with the UI guard as a convenience layer.
- Cart state is a small `useSyncExternalStore` store in `src/lib/`, matching the existing store pattern; no new tables.
- Advertisements need persistence, so a migration adding an advertisements table is proposed before that screen is wired.
- Mock modules under `src/data/` are deleted as each consumer migrates, except navigation and static shop info.