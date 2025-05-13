import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("create-project function initializing");

interface ScopedPath {
  name: string | null;
  path_in_repo: string | null;
  notes: string | null;
}

interface ProjectPayload {
  projectName: string;
  githubRepoURL?: string | null;
  description?: string | null;
  guidelines?: string[];
  scopedPaths?: ScopedPath[];
  org?: string | null; // Added org field
  project_leader?: string | null; // Added project_leader field (user_id)
  user_id_from_gateway?: string; // Added for gateway calls
}

// Helper to create a Supabase client with service_role_key for admin operations
function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

async function insertProjectData(
  supabaseClient: SupabaseClient, // This will be either user-specific or admin client
  userIdForQuery: string, // The effective user ID for the operation
  payload: ProjectPayload
) {
  const { data: projectData, error: projectError } = await supabaseClient
    .from('projects')
    .insert({
      user_id: userIdForQuery, // Use the determined user ID
      name: payload.projectName,
      github_repo_url: payload.githubRepoURL || null,
      description: payload.description || null,
      org: payload.org || null, // Insert org
      project_leader: payload.project_leader || null, // Insert project_leader
    })
    .select()
    .single();

  if (projectError) {
    console.error("Error inserting project:", projectError);
    throw projectError;
  }
  const newProjectId = projectData.id;

  if (payload.guidelines && payload.guidelines.length > 0) {
    const guidelinesToInsert = payload.guidelines.map((text, index) => ({
      project_id: newProjectId,
      guideline_text: text,
      order: index + 1,
    }));
    const { error: guidelineError } = await supabaseClient
      .from('project_guidelines')
      .insert(guidelinesToInsert);
    if (guidelineError) console.error("Error inserting project guidelines:", guidelineError);
  }

  const validScopedPaths = (payload.scopedPaths || []).filter(
    sp => (sp.name && sp.name.trim() !== '') || (sp.path_in_repo && sp.path_in_repo.trim() !== '') || (sp.notes && sp.notes.trim() !== '')
  );
  if (validScopedPaths.length > 0) {
    const scopedPathsToInsert = validScopedPaths.map(sp => ({
      project_id: newProjectId,
      name: (sp.name && sp.name.trim() !== '') ? sp.name.trim() : null,
      path_in_repo: (sp.path_in_repo && sp.path_in_repo.trim() !== '') ? sp.path_in_repo.trim() : null,
      notes: (sp.notes && sp.notes.trim() !== '') ? sp.notes.trim() : null,
    }));
    const { error: scopedPathsError } = await supabaseClient
      .from('scoped_paths')
      .insert(scopedPathsToInsert);
    if (scopedPathsError) console.error("Error inserting scoped paths:", scopedPathsError);
  }
  return newProjectId;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Only POST is accepted.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
    const payload: ProjectPayload = await req.json();
    if (!payload.projectName) {
      return new Response(JSON.stringify({ error: 'projectName is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    let userIdForQuery: string;
    let supabaseClientForQuery: SupabaseClient;
    const userIdFromGateway = payload.user_id_from_gateway; // Gateway adds this to the body

    if (userIdFromGateway) {
      // Called by gateway
      console.log(`create-project called by gateway for user_id: ${userIdFromGateway}`);
      userIdForQuery = userIdFromGateway;
      supabaseClientForQuery = createAdminClient();
      // Service role key will bypass RLS, insertProjectData uses userIdForQuery for ownership.
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

    console.log(`Creating project "${payload.projectName}" for effective user_id ${userIdForQuery}`);
    const newProjectId = await insertProjectData(supabaseClientForQuery, userIdForQuery, payload);

    // Fetch the newly created project with all its details to return
    // Use the same client that performed the insert (could be admin or user-context)
    const { data: newProjectDetails, error: fetchError } = await supabaseClientForQuery
      .from('projects')
      .select('id, name, description, github_repo_url, created_at, updated_at, user_id, org, project_leader, project_guidelines(id, guideline_text, "order"), scoped_paths(id, name, path_in_repo, notes)') // Added org and project_leader
      .eq('id', newProjectId)
      .eq('user_id', userIdForQuery) // Ensure we only fetch if it matches the user context
      .single();
    
    if (fetchError) {
      console.error("Error fetching newly created project details:", fetchError);
      return new Response(JSON.stringify({ message: "Project created, but failed to fetch full details.", project_id: newProjectId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
      });
    }
    
    console.log("Project created successfully:", newProjectDetails);
    return new Response(JSON.stringify(newProjectDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
    });

  } catch (err) {
    console.error("Overall error in create-project function:", err);
    const statusCode = err.code === '23505' ? 409 : 500; // Handle unique constraint violation
    return new Response(JSON.stringify({ error: err.message || 'Failed to create project' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode,
    });
  }
});

// To deploy: supabase functions deploy create-project --project-ref <your-project-ref> --no-verify-jwt
