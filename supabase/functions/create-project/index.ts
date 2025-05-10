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
  guidelines?: string[]; // Array of guideline strings
  scopedPaths?: ScopedPath[];
}

async function insertProjectData(
  supabaseClient: SupabaseClient,
  userId: string,
  payload: ProjectPayload
) {
  // 1. Insert into 'projects' table
  const { data: projectData, error: projectError } = await supabaseClient
    .from('projects')
    .insert({
      user_id: userId,
      name: payload.projectName,
      github_repo_url: payload.githubRepoURL || null,
      description: payload.description || null,
    })
    .select()
    .single();

  if (projectError) {
    console.error("Error inserting project:", projectError);
    throw projectError;
  }
  const newProjectId = projectData.id;

  // 2. Insert into 'project_guidelines' table
  if (payload.guidelines && payload.guidelines.length > 0) {
    const guidelinesToInsert = payload.guidelines.map((text, index) => ({
      project_id: newProjectId,
      guideline_text: text,
      order: index + 1,
    }));
    const { error: guidelineError } = await supabaseClient
      .from('project_guidelines')
      .insert(guidelinesToInsert);
    if (guidelineError) {
      console.error("Error inserting project guidelines:", guidelineError);
      // Decide if this should be a fatal error or just a warning
      // For now, log and continue
    }
  }

  // 3. Insert into 'scoped_paths' table
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
    if (scopedPathsError) {
      console.error("Error inserting scoped paths:", scopedPathsError);
      // Log and continue
    }
  }
  return newProjectId;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: ProjectPayload = await req.json();
    if (!payload.projectName) {
      return new Response(JSON.stringify({ error: 'projectName is required' }), {
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

    console.log(`Creating project "${payload.projectName}" for user ${user.id}`);

    const newProjectId = await insertProjectData(supabaseClient, user.id, payload);

    // Fetch the newly created project with all its details to return
    const { data: newProjectDetails, error: fetchError } = await supabaseClient
      .from('projects')
      .select('id, name, description, github_repo_url, created_at, updated_at, user_id, project_guidelines(id, guideline_text, "order"), scoped_paths(id, name, path_in_repo, notes)')
      .eq('id', newProjectId)
      .single();
    
    if (fetchError) {
        console.error("Error fetching newly created project details:", fetchError);
        // Still return a success for creation, but indicate fetch error
        return new Response(JSON.stringify({ message: "Project created, but failed to fetch full details.", project_id: newProjectId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201, // Created
        });
    }
    
    console.log("Project created successfully:", newProjectDetails);

    return new Response(JSON.stringify(newProjectDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (err) {
    console.error("Overall error in create-project function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to create project' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: err.code === '23505' ? 409 : 500, // Handle unique constraint violation (e.g. duplicate project name if unique)
    });
  }
});

// To deploy: supabase functions deploy create-project --project-ref <your-project-ref>
// Example curl to test:
// curl -X POST 'http://localhost:54321/functions/v1/create-project' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json" \
//   -d '{
//         "projectName": "My AI Test Project",
//         "githubRepoURL": "https://github.com/my-org/my-ai-repo",
//         "description": "A project created via MCP for AI testing.",
//         "guidelines": ["Use TypeScript.", "Follow TDD principles."],
//         "scopedPaths": [
//           {"name": "Frontend", "path_in_repo": "/frontend", "notes": "React app"},
//           {"name": "Backend", "path_in_repo": "/backend", "notes": "Node.js API"},
//           {"name": "Shared Lib", "notes": "Utilities shared by both."}
//         ]
//       }'
