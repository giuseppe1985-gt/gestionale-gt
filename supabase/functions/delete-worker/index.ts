import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeleteWorkerRequest {
  worker_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized: ' + (userError?.message || 'Invalid token'));
    }

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error('Error fetching profile: ' + profileError.message);
    }

    if (!adminProfile || adminProfile.role !== 'admin') {
      throw new Error('Only admins can delete workers');
    }

    const body: DeleteWorkerRequest = await req.json();

    const { data: workerProfile, error: workerError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', body.worker_id)
      .maybeSingle();

    if (workerError) {
      throw new Error('Error fetching worker: ' + workerError.message);
    }

    if (!workerProfile) {
      throw new Error('Worker not found');
    }

    if (workerProfile.organization_id !== adminProfile.organization_id) {
      throw new Error('Cannot delete worker from another organization');
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', body.worker_id);

    if (deleteProfileError) {
      throw new Error('Error deleting profile: ' + deleteProfileError.message);
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      body.worker_id
    );

    if (deleteAuthError) {
      throw new Error('Error deleting auth user: ' + deleteAuthError.message);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});