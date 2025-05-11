import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("delete-project function initializing");

// Helper to create a Supabase client with service_role_key for admin operations
// Needed because we might be deleting across tables where RLS might interfere
// with cascade if not perfectly set up, or if we do multi-step deletes.
// However, for simple deletes with ON DELETE CASCADE, user client might be enough if RLS allows delete on projects.
// Let's use user client first and ensure RLS allows user to delete their own projects.
// If cascade issues arise, switch to admin client with explicit user_id check.

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') { // Using POST for delete to send body easily
    return new Response(JSON.stringify({ error: 'Method not allowed. Only POST is accepted.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    console.log(`Attempting to delete project ${project_id} for user ${user.id}`);

    // Verify ownership before delete - RLS should also enforce this on the 'projects' table for delete operations.
    // The .eq('user_id', user.id) in the delete query itself acts as the primary ownership check.
    
    // Supabase by default sets ON DELETE CASCADE for foreign keys if not specified otherwise.
    // We need to ensure our FKs from tasks, project_guidelines, scoped_paths to projects
    // have ON DELETE CASCADE set up in their migration SQL.
    // If they do, deleting from 'projects' will cascade.

    // Check if migrations have ON DELETE CASCADE:
    // - tasks.project_id -> projects.id
    // - project_guidelines.project_id -> projects.id
    // - scoped_paths.project_id -> projects.id
    // - task_comments.task_id -> tasks.id (this means deleting tasks cascades to comments)

    // Assuming ON DELETE CASCADE is set for related tables:
    const { error: deleteError, count } = await supabaseClient
      .from('projects')
      .delete()
      .eq('id', project_id)
      .eq('user_id', user.id); // Ensures user can only delete their own projects

    if (deleteError) {
      console.error("Error deleting project:", deleteError);
      throw deleteError;
    }

    if (count === 0) {
      // This could mean project not found OR user_id didn't match (RLS or explicit .eq failed)
      return new Response(JSON.stringify({ error: 'Project not found or access denied.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404, 
      });
    }

    console.log(`Project ${project_id} deleted successfully by user ${user.id}`);

    return new Response(JSON.stringify({ message: 'Project and all associated data deleted successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Overall error in delete-project function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to delete project' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy delete-project --project-ref <your-project-ref>
// Example curl:
// curl -X POST 'http://localhost:54321/functions/v1/delete-project' \
//   -H "Authorization: Bearer <USER_JWT>" \
//   -H "Content-Type: application/json" \
//   -d '{"project_id": "your-project-uuid-to-delete"}'
