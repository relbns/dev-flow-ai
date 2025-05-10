import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("list-tasks function initializing");

// Helper function to verify project ownership (can be moved to a shared file later)
async function verifyProjectOwnership(supabaseClient: SupabaseClient, userId: string, projectId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116: "Searched item was not found"
    console.error("Error verifying project ownership:", error);
  }
  return !!data;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // For GET request, project_id would be a query parameter
    // For POST request (as per MCP spec for tools that might take complex inputs), it's in the body
    let project_id: string | null = null;
    if (req.method === 'POST') {
      const body = await req.json();
      project_id = body.project_id;
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      project_id = url.searchParams.get('project_id');
    }

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required (in request body for POST, or as query param for GET)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not authenticated or token invalid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Verify project ownership
    const isOwner = await verifyProjectOwnership(supabaseClient, user.id, project_id);
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'User does not own this project or project not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    console.log(`Fetching tasks for project ${project_id} by user ${user.id}`);

    const { data: tasks, error } = await supabaseClient
      .from('tasks')
      .select('id, project_id, scoped_path_id, title, description, status, current_branch, pull_request_url, created_at, updated_at, scoped_paths(name, path_in_repo)') // Optionally join scoped_path details
      .eq('project_id', project_id)
      .order('created_at', { ascending: true });

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

// To deploy: supabase functions deploy list-tasks --project-ref <your-project-ref>
// Example curl to test (using POST):
// curl -X POST 'http://localhost:54321/functions/v1/list-tasks' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json" \
//   -d '{"project_id":"your-project-uuid"}'
//
// Example curl to test (using GET):
// curl -X GET 'http://localhost:54321/functions/v1/list-tasks?project_id=your-project-uuid' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "apikey: <SUPABASE_ANON_KEY>"
