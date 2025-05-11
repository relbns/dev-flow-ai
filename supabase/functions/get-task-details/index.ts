import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-task-details function initializing");

// Helper to create a Supabase client with service_role_key for admin operations
function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const task_id = url.searchParams.get('task_id');
    const userIdFromGateway = url.searchParams.get('user_id_from_gateway'); // New: Check for gateway call

    if (!task_id) {
      return new Response(JSON.stringify({ error: 'task_id query parameter is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    let userIdForQuery: string;
    let supabaseClientForQuery: SupabaseClient;

    if (userIdFromGateway) {
      // Called by gateway, use service role client and provided user_id
      console.log(`get-task-details called by gateway for user_id: ${userIdFromGateway}`);
      userIdForQuery = userIdFromGateway;
      supabaseClientForQuery = createAdminClient();
      // We trust the gateway has validated the user_id's legitimacy via API key.
      // The service role key will bypass RLS, so queries MUST use userIdForQuery.
    } else {
      // Direct call, expect User JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
        });
      }
      supabaseClientForQuery = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: userError } = await supabaseClientForQuery.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'User not authenticated or token invalid' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
        });
      }
      userIdForQuery = user.id;
    }

    console.log(`Fetching details for task_id: ${task_id} by effective user_id: ${userIdForQuery}`);

    // Fetch task and verify ownership using userIdForQuery
    const { data: taskDetails, error } = await supabaseClientForQuery
      .from('tasks')
      .select('*, projects!inner(user_id)') // Use inner join to ensure project exists
      .eq('id', task_id)
      .eq('projects.user_id', userIdForQuery) // Explicitly check ownership
      .single();

    if (error) {
      console.error("Error fetching task details (could be not found or access denied):", error);
      if (error.code === 'PGRST116') { // Not found (or RLS/join condition failed)
        return new Response(JSON.stringify({ error: 'Task not found or access denied' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
        });
      }
      throw error; 
    }

    if (!taskDetails) { // Should be caught by error.code PGRST116
      return new Response(JSON.stringify({ error: 'Task not found or access denied' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }
    
    // Remove the joined projects data before returning if it's not needed in the response
    // Or, if projects data is simple like {user_id: ...} it might be fine.
    // For now, let's assume the original select was fine and RLS handled it,
    // but with service_role, we MUST filter by user_id in the query.
    // The current select `projects!inner(user_id)` and `eq('projects.user_id', userIdForQuery)` handles this.
    // We can destructure to remove `projects` if it's just for the check.
    const { projects, ...restOfTaskDetails } = taskDetails;


    console.log("Task details fetched:", restOfTaskDetails);

    return new Response(JSON.stringify(restOfTaskDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (err) {
    console.error("Overall error in get-task-details function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch task details' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

// To deploy: supabase functions deploy get-task-details --project-ref <your-project-ref> --no-verify-jwt (if called directly by user)
// If only called by gateway (which uses service_role), JWT verification is not strictly needed on this function itself.
// However, keeping --no-verify-jwt might be simpler if direct user calls are still possible.
// The function now handles both scenarios.
