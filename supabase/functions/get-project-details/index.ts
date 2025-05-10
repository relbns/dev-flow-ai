import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-project-details function initializing");

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the Auth context of the logged-in user.
    // This is how you can make sure RLS is enforced.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // It's generally better to use the service_role key for server-side operations
    // if you are not relying on RLS for this specific function, or if you need broader access.
    // However, to enforce RLS based on the calling user, you'd use a client initialized
    // with the user's JWT. For MCP tools called by an AI agent acting as a user,
    // the AI agent would need to provide its user JWT.

    // For simplicity in this example, let's assume the AI agent provides its JWT.
    // The Supabase client will be initialized with this JWT.
    // In a real scenario, the AI agent would get this JWT after the user logs into the AI agent's system
    // using your app's Supabase Auth.

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Using anon key, RLS will be primary security
      { global: { headers: { Authorization: authHeader } } }
    );
    
    // Alternatively, if this function is meant to be called with elevated privileges (e.g., by a trusted service)
    // and RLS is handled by checking user_id explicitly in queries, you might use the service_role key.
    // const supabaseAdminClient = createClient(
    //   Deno.env.get('SUPABASE_URL') ?? '',
    //   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    // );

    console.log(`Fetching details for project_id: ${project_id}`);

    const { data: projectDetails, error } = await supabaseClient
      .from('projects')
      .select('id, name, description, github_repo_url, created_at, updated_at, user_id, project_guidelines(id, guideline_text, "order"), scoped_paths(id, name, path_in_repo, notes)')
      .eq('id', project_id)
      .single();

    if (error) {
      console.error("Error fetching project details:", error);
      throw error;
    }

    if (!projectDetails) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log("Project details fetched:", projectDetails);

    return new Response(JSON.stringify(projectDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error("Overall error in function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy get-project-details --project-ref <your-project-ref>
// To call (example):
// curl -X POST 'http://localhost:54321/functions/v1/get-project-details' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json" \
//   -d '{"project_id":"your-project-uuid"}'
//
// Or if using service_role key (not recommended for direct client/AI agent calls if RLS is desired):
// curl -X POST 'http://localhost:54321/functions/v1/get-project-details' \
//   -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
//   -H "apikey: <SUPABASE_ANON_KEY>" \
//   -H "Content-Type: application/json" \
//   -d '{"project_id":"your-project-uuid"}'
