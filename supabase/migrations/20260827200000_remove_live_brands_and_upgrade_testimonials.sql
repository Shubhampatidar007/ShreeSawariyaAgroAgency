begin;

alter table public.testimonials
  add column if not exists farmer_name text,
  add column if not exists farm_name text,
  add column if not exists content text,
  add column if not exists image_url text,
  add column if not exists verified boolean not null default false;

update public.testimonials
set
  farmer_name = coalesce(nullif(trim(farmer_name), ''), nullif(trim(name), ''), 'Unknown farmer'),
  farm_name = coalesce(nullif(trim(farm_name), ''), nullif(trim(location), ''), null),
  content = coalesce(nullif(trim(content), ''), nullif(trim(quote), ''), ''),
  verified = coalesce(verified, enabled, false);

create index if not exists testimonials_verified_created_idx on public.testimonials (verified, created_at desc);

create table if not exists public.product_brand_rollback_20260827 (
  product_id uuid primary key,
  brand text not null,
  backed_up_at timestamptz not null default now()
);

insert into public.product_brand_rollback_20260827 (product_id, brand)
select id, brand from public.products where nullif(trim(brand), '') is not null
on conflict (product_id) do nothing;

update public.products set brand = null where brand is not null;

drop policy if exists testimonials_public_read on public.testimonials;
drop policy if exists testimonials_staff on public.testimonials;
drop policy if exists testimonials_authenticated_read on public.testimonials;
drop policy if exists testimonials_staff_insert on public.testimonials;
drop policy if exists testimonials_staff_update on public.testimonials;
drop policy if exists testimonials_staff_delete on public.testimonials;

create policy testimonials_public_read on public.testimonials for select to anon using (verified = true);
create policy testimonials_authenticated_read on public.testimonials for select to authenticated using (verified = true or (select private.is_staff()));
create policy testimonials_staff_insert on public.testimonials for insert to authenticated with check ((select private.is_staff()));
create policy testimonials_staff_update on public.testimonials for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy testimonials_staff_delete on public.testimonials for delete to authenticated using ((select private.is_staff()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('testimonial-images', 'testimonial-images', true, 209715, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists testimonial_images_staff_insert on storage.objects;
drop policy if exists testimonial_images_staff_delete on storage.objects;

create policy testimonial_images_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'testimonial-images' and (select private.is_staff()) and name like 'testimonials/%');
create policy testimonial_images_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'testimonial-images' and (select private.is_staff()) and name like 'testimonials/%');

commit;
