import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("list-projects function initializing");

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    console.log(`Fetching projects for user ${user.id}`);

    const { data: projects, error } = await supabaseClient
      .from('projects')
      .select('id, name, description, github_repo_url, created_at, updated_at, user_id, project_guidelines(id, guideline_text, "order"), scoped_paths(id, name, path_in_repo, notes)')
      .eq('user_id', user.id) // RLS also enforces this, but explicit is good
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      throw error;
    }

    console.log("Projects fetched:", projects?.length || 0);

    return new Response(JSON.stringify(projects || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error("Overall error in list-projects function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch projects' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy list-projects --project-ref <your-project-ref>
// Example curl to test:
// curl -X GET 'http://localhost:54321/functions/v1/list-projects' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "apikey: <SUPABASE_ANON_KEY>" // Anon key needed for GET if not in auth header for some reason
//
// For POST (if you change method or add payload later):
// curl -X POST 'http://localhost:54321/functions/v1/list-projects' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json"
// (No body needed for V1)
