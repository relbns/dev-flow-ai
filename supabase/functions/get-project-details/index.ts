import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-project-details function initializing");

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
    const project_id = url.searchParams.get('project_id');
    const userIdFromGateway = url.searchParams.get('user_id_from_gateway');

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id query parameter is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    let userIdForQuery: string;
    let supabaseClientForQuery: SupabaseClient;

    if (userIdFromGateway) {
      // Called by gateway
      console.log(`get-project-details called by gateway for user_id: ${userIdFromGateway}`);
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

    console.log(`Fetching details for project_id: ${project_id}, effective user_id: ${userIdForQuery}`);

    const { data: projectDetails, error } = await supabaseClientForQuery
      .from('projects')
      .select('id, name, description, github_repo_url, created_at, updated_at, user_id, project_guidelines(id, guideline_text, "order"), scoped_paths(id, name, path_in_repo, notes)')
      .eq('id', project_id)
      .eq('user_id', userIdForQuery) // Ensure project belongs to the user
      .single();

    if (error) {
      console.error("Error fetching project details (could be not found or access denied):", error);
      if (error.code === 'PGRST116') { // Not found or RLS/join condition failed
         return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
        });
      }
      throw error;
    }

    if (!projectDetails) { // Should be caught by error.code PGRST116
       return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }

    console.log("Project details fetched:", projectDetails);

    return new Response(JSON.stringify(projectDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error("Overall error in get-project-details function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch project details' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy get-project-details --project-ref <your-project-ref> --no-verify-jwt
