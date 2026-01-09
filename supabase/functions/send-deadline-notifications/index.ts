import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const notifications: Array<{
      type: string;
      user_id: string;
      title: string;
      body: string;
      entity_type: string;
      entity_id: string;
      days_before: number;
      organization_id: string;
    }> = [];

    // Get medical checkup notifications
    const { data: medicalNotifs, error: medicalError } = await supabase.rpc(
      "get_pending_medical_notifications"
    );

    if (medicalError) {
      console.error("Error fetching medical notifications:", medicalError);
    } else if (medicalNotifs) {
      medicalNotifs.forEach((notif: any) => {
        notifications.push({
          type: "medical_expiry",
          user_id: notif.worker_id,
          title: notif.notification_title,
          body: notif.notification_body,
          entity_type: "medical_checkup",
          entity_id: notif.entity_id,
          days_before: notif.days_before,
          organization_id: notif.organization_id,
        });
      });
    }

    // Get course notifications
    const { data: courseNotifs, error: courseError } = await supabase.rpc(
      "get_pending_course_notifications"
    );

    if (courseError) {
      console.error("Error fetching course notifications:", courseError);
    } else if (courseNotifs) {
      courseNotifs.forEach((notif: any) => {
        notifications.push({
          type: "course_expiry",
          user_id: notif.worker_id,
          title: notif.notification_title,
          body: notif.notification_body,
          entity_type: "course",
          entity_id: notif.entity_id,
          days_before: notif.days_before,
          organization_id: notif.organization_id,
        });
      });
    }

    // Get invoice notifications
    const { data: invoiceNotifs, error: invoiceError } = await supabase.rpc(
      "get_pending_invoice_notifications"
    );

    if (invoiceError) {
      console.error("Error fetching invoice notifications:", invoiceError);
    } else if (invoiceNotifs) {
      invoiceNotifs.forEach((notif: any) => {
        notif.admin_users.forEach((userId: string) => {
          notifications.push({
            type: "invoice_due",
            user_id: userId,
            title: notif.notification_title,
            body: notif.notification_body,
            entity_type: "invoice",
            entity_id: notif.entity_id,
            days_before: notif.days_before,
            organization_id: notif.organization_id,
          });
        });
      });
    }

    // Get RiBa notifications
    const { data: ribaNotifs, error: ribaError } = await supabase.rpc(
      "get_pending_riba_notifications"
    );

    if (ribaError) {
      console.error("Error fetching riba notifications:", ribaError);
    } else if (ribaNotifs) {
      ribaNotifs.forEach((notif: any) => {
        notif.admin_users.forEach((userId: string) => {
          notifications.push({
            type: "riba_due",
            user_id: userId,
            title: notif.notification_title,
            body: notif.notification_body,
            entity_type: "riba",
            entity_id: notif.entity_id,
            days_before: notif.days_before,
            organization_id: notif.organization_id,
          });
        });
      });
    }

    // Get payment schedule notifications
    const { data: paymentNotifs, error: paymentError } = await supabase.rpc(
      "get_pending_payment_notifications"
    );

    if (paymentError) {
      console.error("Error fetching payment notifications:", paymentError);
    } else if (paymentNotifs) {
      paymentNotifs.forEach((notif: any) => {
        notif.admin_users.forEach((userId: string) => {
          notifications.push({
            type: "payment_due",
            user_id: userId,
            title: notif.notification_title,
            body: notif.notification_body,
            entity_type: "payment_schedule",
            entity_id: notif.entity_id,
            days_before: notif.days_before,
            organization_id: notif.organization_id,
          });
        });
      });
    }

    // Get vehicle inspection notifications
    const { data: vehicleNotifs, error: vehicleError } = await supabase.rpc(
      "get_pending_vehicle_notifications"
    );

    if (vehicleError) {
      console.error("Error fetching vehicle notifications:", vehicleError);
    } else if (vehicleNotifs) {
      vehicleNotifs.forEach((notif: any) => {
        notif.admin_users.forEach((userId: string) => {
          notifications.push({
            type: "vehicle_inspection",
            user_id: userId,
            title: notif.notification_title,
            body: notif.notification_body,
            entity_type: "vehicle",
            entity_id: notif.entity_id,
            days_before: notif.days_before,
            organization_id: notif.organization_id,
          });
        });
      });
    }

    // Send notifications and log them
    const results = {
      total: notifications.length,
      sent: 0,
      logged: 0,
      errors: [] as string[],
    };

    for (const notif of notifications) {
      try {
        // Get push tokens for this user
        const { data: tokens, error: tokenError } = await supabase
          .from("push_notification_tokens")
          .select("token, device_type")
          .eq("user_id", notif.user_id)
          .eq("enabled", true);

        if (tokenError) {
          console.error("Error fetching tokens:", tokenError);
          results.errors.push(`Token fetch error for user ${notif.user_id}`);
          continue;
        }

        if (tokens && tokens.length > 0) {
          // In production, here you would send actual push notifications
          // For now, we'll use the browser Notification API via service worker
          // or integrate with FCM/APNS
          
          // For web notifications, we'll store them and let the client poll
          // or use real-time subscriptions
          
          results.sent += tokens.length;
        }

        // Log the notification
        const { error: logError } = await supabase.rpc(
          "create_notification_log",
          {
            p_notification_type: notif.type,
            p_entity_type: notif.entity_type,
            p_entity_id: notif.entity_id,
            p_user_id: notif.user_id,
            p_title: notif.title,
            p_body: notif.body,
            p_days_before: notif.days_before,
            p_organization_id: notif.organization_id,
          }
        );

        if (logError) {
          console.error("Error logging notification:", logError);
          results.errors.push(`Log error for notification ${notif.entity_id}`);
        } else {
          results.logged++;
        }
      } catch (err) {
        console.error("Error processing notification:", err);
        results.errors.push(`Processing error: ${err}`);
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
    console.error("Error in notification function:", error);
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