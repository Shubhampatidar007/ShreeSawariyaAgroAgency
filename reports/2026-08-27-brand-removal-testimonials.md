# Brand removal + verified testimonials

## Live behavior

- Public product queries no longer select or map `products.brand`.
- The homepage no longer renders the former live-catalog brand section.
- Product publishing no longer accepts or writes a brand value.
- Existing `products.brand` values were cleared in Supabase.
- A locked rollback table preserves any non-empty historical brand values.
- Public testimonials are read only when `verified = true`.
- Staff/admin testimonial mutations require the existing `private.is_staff()` authorization path.
- Testimonial images use the public `testimonial-images` bucket and `testimonials/<testimonial-id>/...` paths.
- Admin image uploads reuse the product image compression helper, with a 256px maximum dimension and 200KB target for avatars.
- Testimonial deletion uses the authenticated `delete-testimonial` Edge Function, which removes the Storage object before deleting the database record.

## Migration sequence

1. Add the new testimonial fields while retaining the legacy fields for compatibility.
2. Backfill the new testimonial fields from existing values without deleting the legacy columns.
3. Back up non-empty product brand values into `product_brand_rollback_20260827`.
4. Clear live product brand values.
5. Replace testimonial RLS policies with verified-public and staff-management policies.
6. Create the dedicated testimonial image bucket and staff-only write/delete policies.
7. Lock the brand rollback table so it is not exposed through the Data API.
8. Preserve any legacy `enabled=true` testimonial publication state in `verified`.

## Rollback

The rollback is intentionally data-preserving. To restore product brand metadata, run:

```sql
update public.products p
set brand = b.brand
from public.product_brand_rollback_20260827 b
where p.id = b.product_id;
```

To roll back the UI behavior, restore the pre-change branch commit or revert the brand-removal commits. The database migration does not drop the `products.brand` column or legacy testimonial columns.

Testimonial image objects should be removed through the Supabase Storage API, not SQL, if they are intentionally purged.
