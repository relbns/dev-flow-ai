import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("list-tasks function initializing");

// Helper to create a Supabase client with service_role_key for admin operations
function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

// Updated helper function to verify project ownership using the determined userIdForQuery
async function verifyProjectOwnership(supabaseClient: SupabaseClient, userIdForQuery: string, projectId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userIdForQuery) // Check against the effective user ID
    .single();
  
  if (error && error.code !== 'PGRST116') { 
    console.error("Error verifying project ownership:", error);
  }
  return !!data;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Parameters from query string (gateway will always call via GET)
    const project_id = url.searchParams.get('project_id');
    const userIdFromGateway = url.searchParams.get('user_id_from_gateway');
    // Optional filters for list-tasks
    const status_filter = url.searchParams.get('status_filter');
    const scoped_path_filter = url.searchParams.get('scoped_path_filter');


    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id query parameter is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    let userIdForQuery: string;
    let supabaseClientForQuery: SupabaseClient;

    if (userIdFromGateway) {
      // Called by gateway
      console.log(`list-tasks called by gateway for user_id: ${userIdFromGateway}, project_id: ${project_id}`);
      userIdForQuery = userIdFromGateway;
      supabaseClientForQuery = createAdminClient();
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

    // Verify project ownership using the determined userIdForQuery
    const isOwner = await verifyProjectOwnership(supabaseClientForQuery, userIdForQuery, project_id);
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Access denied: User does not own this project or project not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    console.log(`Fetching tasks for project ${project_id} by effective user_id: ${userIdForQuery}`);

    let query = supabaseClientForQuery
      .from('tasks')
      .select('id, project_id, scoped_path_id, title, description, status, current_branch, pull_request_url, created_at, updated_at, scoped_paths(name, path_in_repo)')
      .eq('project_id', project_id); // Already scoped by project ownership check

    if (status_filter) {
      query = query.eq('status', status_filter);
    }
    if (scoped_path_filter) {
      // This requires a join or a subquery if scoped_path_filter is by name.
      // For now, let's assume scoped_path_filter is by scoped_path_id if provided.
      // If it's by name, the query needs to be more complex:
      // query = query.eq('scoped_paths.name', scoped_path_filter); // This won't work directly
      // A proper way would be to filter on a join or use a view.
      // For simplicity, if scoped_path_filter is an ID:
      // query = query.eq('scoped_path_id', scoped_path_filter);
      // Let's keep it simple and assume scoped_path_filter is not implemented via name yet for this refactor.
      console.warn("scoped_path_filter by name is not fully implemented in this version of list-tasks for simplicity.");
    }
    
    query = query.order('created_at', { ascending: true });
    
    const { data: tasks, error } = await query;

    if (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }

    console.log("Tasks fetched for project:", tasks?.length || 0);

    return new Response(JSON.stringify(tasks || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error("Overall error in list-tasks function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch tasks' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy list-tasks --project-ref <your-project-ref> --no-verify-jwt
