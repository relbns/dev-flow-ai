import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("list-projects function initializing");

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
    let orgIdParam: string | number | null = null;
    let userIdFromGateway: string | null = null;
    let requestBody: any = null;

    // Try parsing query parameters for GET or direct calls
    try {
      const url = new URL(req.url);
      userIdFromGateway = url.searchParams.get('user_id_from_gateway');
      orgIdParam = url.searchParams.get('orgId');
    } catch (e) {
      console.warn("Could not parse URL, likely not a standard HTTP request:", e.message);
    }

    // If invoked via POST (e.g., functions.invoke), try parsing body
    if (req.method === 'POST' && req.body) {
      try {
        requestBody = await req.json();
        // Allow orgId from body to override query param if both present
        if (requestBody?.orgId !== undefined) {
          orgIdParam = requestBody.orgId;
          console.log("Read orgId from POST body:", orgIdParam);
        }
        // Allow userId from body (if gateway pattern changes)
        if (requestBody?.user_id_from_gateway) {
           userIdFromGateway = requestBody.user_id_from_gateway;
           console.log("Read user_id_from_gateway from POST body:", userIdFromGateway);
        }
      } catch (e) {
        console.warn("Could not parse POST body as JSON:", e.message);
        // Don't fail, maybe it wasn't JSON or body was empty
      }
    }

    let userIdForQuery: string;
    let supabaseClientForQuery: SupabaseClient;

    if (userIdFromGateway) {
      // Called by gateway, use service role client and provided user_id
      console.log(`list-projects called by gateway for user_id: ${userIdFromGateway}`);
      userIdForQuery = userIdFromGateway;
      supabaseClientForQuery = createAdminClient();
      // Service role key will bypass RLS, so queries MUST use userIdForQuery.
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

    console.log(`Fetching projects for effective user_id: ${userIdForQuery}, orgIdParam: ${orgIdParam}`);

    // Start building the query
    let query = supabaseClientForQuery
      .from('projects')
      .select('id, name, description, github_repo_url, created_at, updated_at, user_id, leader_user_id, github_org_id, github_org_login, project_guidelines(id, guideline_text, "order"), scoped_paths(id, name, path_in_repo, notes)')
      .eq('user_id', userIdForQuery); // Always filter by the user who owns the project record

    // Apply organization filtering based on orgIdParam (which could be string or number now)
    if (orgIdParam !== null && orgIdParam !== undefined) {
      if (orgIdParam === 'personal') {
        console.log("Filtering for personal projects (github_org_id IS NULL)");
        query = query.is('github_org_id', null);
      } else {
        // Attempt to parse if it's not already a number (e.g., from query param)
        const orgIdNum = typeof orgIdParam === 'number' ? orgIdParam : parseInt(String(orgIdParam), 10);
        if (!isNaN(orgIdNum)) {
          console.log(`Filtering for organization ID: ${orgIdNum}`);
          query = query.eq('github_org_id', orgIdNum);
        } else {
          console.warn(`Invalid orgId parameter received: ${orgIdParam}. Ignoring org filter.`);
        }
      }
    } else {
      console.log("No valid orgId parameter provided, fetching all user's projects.");
    }

    // Add ordering and execute the query
    const { data: projects, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      throw error; // Let the generic error handler below catch it
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

// To deploy: supabase functions deploy list-projects --project-ref <your-project-ref> --no-verify-jwt
// Example curl (direct user call):
// curl -X GET 'http://localhost:54321/functions/v1/list-projects' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "apikey: <SUPABASE_ANON_KEY>"
//
// Example call from gateway (gateway constructs this):
// GET 'http://localhost:54321/functions/v1/list-projects?user_id_from_gateway=<USER_ID>'
// (with service_role_key in Authorization header from gateway)
