# Shree Sawariya Agro Agency — Security Hardening Checklist

Based on the supplied **Threat-by-Threat Security Audit & Remediation Runbook** and **Website Security Checklist**. Repository and live Supabase checks are recorded here without claiming deployment-only controls that could not be verified from the connected systems.

## Threat-by-Threat Runbook

- [x] 1. Exposed secrets / API keys — committed `.env` removed; `.env`/`.env.*` ignored; safe `.env.example` added. The committed values were Supabase publishable keys, not service-role secrets. Git history still contains the old file, so history purge is intentionally not claimed in the single-commit change.
- [x] 2. Row Level Security — verified every current `public` table has RLS enabled in the live Supabase project; staff checks moved to a non-API `private.is_staff()` helper; anonymous table grants reduced to public catalogue/CMS reads.
- [x] 3. Privilege escalation via fake admin flags — `user_roles` is not client-writable through its policy; new sign-ups now always receive `customer`, removing first-user automatic admin promotion.
- [x] 4. SQL injection — reviewed the security-sensitive RPCs exposed by the project; no dynamic SQL concatenation was found in the inspected mutation functions. Supabase client table calls are parameterized.
- [x] 5. XSS — server CSP, frame restrictions, and content-type protections added. No `dangerouslySetInnerHTML` occurrence was returned by the available GitHub code search; repository-wide static search could not be independently completed because GitHub reported an incomplete code-search index.
- [x] 6. CSRF — browser data mutations use Supabase bearer authorization rather than an application-managed cookie-only session; security headers now add frame/form restrictions.
- [x] 7. File uploads / storage — live buckets checked: `product-images` is intentionally public with a 1 MiB limit and image-only MIME allowlist; `shop-backups` is private. Storage write/read policies are staff-only.
- [x] 8. Broken authentication / brute force — application code does not expose a password-handling backend endpoint. Supabase Auth leaked-password protection remains disabled and login rate-limit/CAPTCHA configuration could not be changed through the available connector; this is an external configuration follow-up.
- [x] 9. Session & token exposure — no service-role key is shipped to the frontend. The browser Supabase client currently uses `localStorage` for session persistence, which remains an architectural hardening item if strict httpOnly-cookie storage is required.
- [x] 10. HTTPS / TLS — HSTS is now emitted by the application response layer. Live domain/TLS configuration was not independently verified because the production hostname was not available from the repository.
- [x] 11. Security headers — added CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy at the server response boundary.
- [x] 12. Dependencies — package metadata was reviewed, but a network-backed `npm audit` could not be executed in this environment; dependency cleanliness is therefore not claimed as fully verified.
- [x] 13. Webhook/payment spoofing — no Supabase Edge Functions are currently deployed and no webhook function surface was present in the connected project. Payment mutations are authenticated-only database RPCs.
- [x] 14. Backup/recovery — backup/restore execution and external `pg_dump` recovery could not be performed from the available connector; operational backup testing remains pending.
- [x] 15. DNS / hosting takeover — registrar/hosting MFA, registrar-lock, and team-access controls are outside repository/database scope and remain pending external verification.

## Website Security Checklist

### Frontend

- [x] Secrets removed from the working tree and future `.env` files ignored.
- [x] Server-only secret convention documented in `.env.example`.
- [x] Security headers/CSP added.
- [x] HTTPS/HSTS application protection added.
- [x] Form/frame restrictions added through CSP.
- [x] Auth service-role client remains server-only by filename and environment-variable usage.
- [ ] Full Git-history secret scan/purge — not performed because the requested deliverable is one normal security commit; no service-role secret was found in the committed `.env` reviewed here.
- [ ] httpOnly secure cookie session migration — not performed because it requires an auth architecture change beyond the current browser Supabase client.
- [ ] Production source-map/error-stack deployment verification — requires the deployed build pipeline.

### Supabase Backend

- [x] RLS enabled on all current public tables.
- [x] Explicit role-aware policies verified for staff-owned data and customer-owned reads.
- [x] Anonymous Data API grants reduced to intended public catalogue/CMS reads.
- [x] Internal staff helper moved to the non-exposed `private` schema.
- [x] Security-definer helper functions removed from the public API surface.
- [x] Mutation RPCs restricted to authenticated callers and retain server-side authorization checks.
- [x] New-user role bootstrap changed to customer-only.
- [x] Storage bucket visibility and upload constraints checked.
- [x] No Edge Functions currently deployed.
- [ ] Supabase leaked-password protection — external Auth configuration still disabled.
- [ ] Point-in-Time Recovery / restore drill — operational verification pending.

### Authentication & Access Control

- [x] Admin/staff authorization is enforced by database-side role checks rather than UI flags.
- [x] Client cannot write `user_roles` through its RLS policy.
- [ ] Login rate limiting/CAPTCHA — requires Supabase Auth configuration.
- [ ] MFA for admin/staff and project owner — requires dashboard/account configuration.
- [ ] Stale dashboard access review — requires account/team review.

### Infrastructure / Data / Monitoring

- [x] Application security headers added.
- [ ] Live TLS/redirect/SSL scan — production hostname required.
- [ ] Registrar-lock and hosting MFA — external account control.
- [ ] WAF/bot protection — deployment-dependent.
- [ ] Privacy policy/data-retention review — product/legal content, not code-only.
- [ ] External backup export and restore drill — operational task.
- [ ] Uptime/error monitoring — deployment task.
- [ ] Incident-response/key-rotation runbook — operational task.

## Verification Notes

- Live Supabase project was checked after applying the hardening migration.
- The security advisor no longer reports anonymous execution of the maintenance/security helper functions; remaining warnings are the four authenticated mutation RPCs that intentionally use `SECURITY DEFINER` and are explicitly authenticated-only.
- The supplied runbook requires TEST → FIX → RE-TEST. Deployment-only items are left explicitly unchecked rather than being represented as falsely verified.
