import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "super_admin" || !callerProfile.active) {
      return new Response(JSON.stringify({ error: "Réservé au Super Administrateur" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, target_user_id } = body;

    if (!action || !target_user_id) {
      return new Response(JSON.stringify({ error: "Action et target_user_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("role, email")
      .eq("id", target_user_id)
      .maybeSingle();

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetProfile.role === "super_admin") {
      return new Response(JSON.stringify({ error: "Les comptes Super Admin sont protégés" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let logAction = action;
    let newValues: Record<string, unknown> = {};

    if (action === "block") {
      await adminClient.from("profiles").update({ active: false }).eq("id", target_user_id);
      await adminClient.auth.admin.updateUserById(target_user_id, { ban_duration: "876000h" });
      newValues = { active: false };
    } else if (action === "unblock") {
      await adminClient.from("profiles").update({ active: true }).eq("id", target_user_id);
      await adminClient.auth.admin.updateUserById(target_user_id, { ban_duration: "none" });
      newValues = { active: true };
    } else if (action === "reset_password") {
      const { error: resetErr } = await adminClient.auth.admin.updateUserById(target_user_id, { password: body.new_password });
      if (resetErr) {
        return new Response(JSON.stringify({ error: resetErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await adminClient.from("profiles").update({ must_change_password: true }).eq("id", target_user_id);
      newValues = { must_change_password: true };
    } else {
      return new Response(JSON.stringify({ error: "Action non reconnue" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("audit_logs").insert({
      actor_id: user.id,
      action: logAction,
      entity: "profiles",
      entity_id: target_user_id,
      new_values: newValues,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
