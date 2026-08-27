begin;
update public.testimonials set verified = true where enabled = true and verified = false;
commit;
