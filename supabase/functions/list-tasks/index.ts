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
    // Parameters from query string
    let project_id_param: string | null = url.searchParams.get('project_id');
    let org_id_param: string | null = url.searchParams.get('org_id');
    const userIdFromGateway = url.searchParams.get('user_id_from_gateway');
    // Optional filters for list-tasks
    const status_filter = url.searchParams.get('status_filter');
    const scoped_path_filter = url.searchParams.get('scoped_path_filter');

    // Try to get parameters from request body if not in query string and method is POST
    let requestBody: Record<string, any> = {};
    if (req.method === 'POST') {
      try {
        requestBody = await req.json();
        console.log("Request body:", requestBody);
        
        // If parameters not in query string, try to get from body
        if (!project_id_param && requestBody.project_id) {
          project_id_param = String(requestBody.project_id);
        }
        
        // If org_id not in query string, try to get from body
        if (!org_id_param && requestBody.org_id) {
          org_id_param = String(requestBody.org_id);
        }
      } catch (error) {
        console.log("No request body or error parsing it:", error);
      }
    }

    console.log("Parameters after checking both query and body:", {
      project_id_param,
      org_id_param,
      userIdFromGateway,
      status_filter,
      scoped_path_filter,
      method: req.method
    });

    if (!project_id_param && !org_id_param) {
      return new Response(JSON.stringify({ error: 'Either project_id or org_id parameter is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    
    if (project_id_param && org_id_param) {
      return new Response(JSON.stringify({ error: 'Provide either project_id or org_id, not both.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    let userIdForQuery: string;
    let supabaseClientForQuery: SupabaseClient;

    if (userIdFromGateway) {
      // Called by gateway
      let logMessage = `list-tasks called by gateway for user_id: ${userIdFromGateway}`;
      if (project_id_param) logMessage += `, project_id: ${project_id_param}`;
      if (org_id_param) logMessage += `, org_id: ${org_id_param}`;
      console.log(logMessage);
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

    let projectIdsToQuery: string[] = [];

    if (project_id_param) {
      // Verify project ownership using the determined userIdForQuery
      const isOwner = await verifyProjectOwnership(supabaseClientForQuery, userIdForQuery, project_id_param);
      if (!isOwner) {
        return new Response(JSON.stringify({ error: 'Access denied: User does not own this project or project not found.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
        });
      }
      projectIdsToQuery.push(project_id_param);
      console.log(`Fetching tasks for specific project ${project_id_param} by effective user_id: ${userIdForQuery}`);
    } else if (org_id_param) {
      console.log(`Fetching tasks for org_id ${org_id_param} by effective user_id: ${userIdForQuery}`);
      let projectsQuery = supabaseClientForQuery
        .from('projects')
        .select('id')
        .eq('user_id', userIdForQuery); // User must own the project record

      if (org_id_param === 'personal') {
        projectsQuery = projectsQuery.is('github_org_id', null);
      } else {
        const orgIdNum = parseInt(org_id_param, 10);
        if (!isNaN(orgIdNum)) {
          projectsQuery = projectsQuery.eq('github_org_id', orgIdNum);
        } else {
          console.warn(`Invalid org_id parameter: ${org_id_param}. Fetching no projects for this org.`);
          // Return empty if org_id is invalid and not 'personal'
           return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
          });
        }
      }
      
      const { data: projectsData, error: projectsError } = await projectsQuery;
      if (projectsError) {
        console.error("Error fetching projects for org_id:", projectsError);
        throw projectsError;
      }
      if (!projectsData || projectsData.length === 0) {
        console.log("No projects found for this user and org_id. Returning empty task list.");
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });
      }
      projectIdsToQuery = projectsData.map(p => p.id);
      console.log(`Found ${projectIdsToQuery.length} projects for org_id ${org_id_param}. Fetching their tasks.`);
    }

    if (projectIdsToQuery.length === 0) {
        console.log("No project IDs to query tasks for. Returning empty list.");
        return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });
    }
    
    let query = supabaseClientForQuery
      .from('tasks')
      .select('id, project_id, scoped_path_id, title, description, status, current_branch, pull_request_url, created_at, updated_at, scoped_paths(name, path_in_repo)')
      .in('project_id', projectIdsToQuery);

    if (status_filter) {
      query = query.eq('status', status_filter);
    }
    if (scoped_path_filter) {
      // This requires a join or a subquery if scoped_path_filter is by name.
      // For now, let's assume scoped_path_filter is by scoped_path_id if provided.
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
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to fetch tasks' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
