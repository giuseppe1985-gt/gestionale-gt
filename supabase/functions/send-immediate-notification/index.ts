import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  type: "announcement" | "assignment" | "leave_request" | "leave_response";
  user_ids: string[];
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user profile to check role and organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const requestData: NotificationRequest = await req.json();

    // Validate request
    if (!requestData.type || !requestData.user_ids || !requestData.title || !requestData.body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = {
      total: requestData.user_ids.length,
      sent: 0,
      logged: 0,
      errors: [] as string[],
    };

    // Send notification to each user
    for (const userId of requestData.user_ids) {
      try {
        // Get push tokens for this user
        const { data: tokens, error: tokenError } = await supabase
          .from("push_notification_tokens")
          .select("token, device_type")
          .eq("user_id", userId)
          .eq("enabled", true);

        if (tokenError) {
          console.error("Error fetching tokens:", tokenError);
          results.errors.push(`Token fetch error for user ${userId}`);
          continue;
        }

        if (tokens && tokens.length > 0) {
          // In production, send actual push notifications here
          // For now, we log them for the client to poll
          results.sent += tokens.length;
        }

        // Log the notification
        const { error: logError } = await supabase.rpc(
          "create_notification_log",
          {
            p_notification_type: requestData.type,
            p_entity_type: requestData.entity_type,
            p_entity_id: requestData.entity_id,
            p_user_id: userId,
            p_title: requestData.title,
            p_body: requestData.body,
            p_days_before: 0,
            p_organization_id: profile.organization_id,
          }
        );

        if (logError) {
          console.error("Error logging notification:", logError);
          results.errors.push(`Log error for user ${userId}`);
        } else {
          results.logged++;
        }
      } catch (err) {
        console.error("Error processing notification:", err);
        results.errors.push(`Processing error for user ${userId}: ${err}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in immediate notification function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});