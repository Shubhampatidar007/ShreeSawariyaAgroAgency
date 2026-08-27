import { withSupabase } from "npm:@supabase/server@^1";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const { id } = await req.json().catch(() => ({ id: "" }));
    if (!id || typeof id !== "string") return Response.json({ error: "Testimonial id is required" }, { status: 400 });

    const { data: role, error: roleError } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userClaims.sub).in("role", ["admin", "staff"]).limit(1).maybeSingle();
    if (roleError || !role) return Response.json({ error: "Staff authorization required" }, { status: 403 });

    const { data: testimonial, error: testimonialError } = await ctx.supabaseAdmin.from("testimonials").select("id, image_url").eq("id", id).maybeSingle();
    if (testimonialError) return Response.json({ error: testimonialError.message }, { status: 500 });
    if (!testimonial) return Response.json({ error: "Testimonial not found" }, { status: 404 });

    if (testimonial.image_url) {
      const marker = "/storage/v1/object/public/testimonial-images/";
      const markerIndex = testimonial.image_url.indexOf(marker);
      if (markerIndex >= 0) {
        const path = decodeURIComponent(testimonial.image_url.slice(markerIndex + marker.length));
        const { error: storageError } = await ctx.supabaseAdmin.storage.from("testimonial-images").remove([path]);
        if (storageError) return Response.json({ error: `Could not remove testimonial image: ${storageError.message}` }, { status: 500 });
      }
    }

    const { error: deleteError } = await ctx.supabaseAdmin.from("testimonials").delete().eq("id", id);
    if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });
    return Response.json({ ok: true, id });
  }),
};
