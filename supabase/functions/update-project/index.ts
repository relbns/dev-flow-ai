import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("update-project function initializing");

interface ProjectUpdatePayload {
  projectId: string; // ID of the project to update
  projectName?: string;
  githubRepoURL?: string | null;
  description?: string | null;
  org?: string | null;
  project_leader?: string | null; // user_id
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'PATCH') { // Using PATCH for updates
    return new Response(JSON.stringify({ error: 'Method not allowed. Only PATCH is accepted.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
    const payload: ProjectUpdatePayload = await req.json();
    if (!payload.projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    let userIdForQuery: string;
    let supabaseClientForQuery: SupabaseClient;
    const userIdFromGateway = payload.user_id_from_gateway;

    if (userIdFromGateway) {
      // Called by gateway
      console.log(`update-project called by gateway for user_id: ${userIdFromGateway} on project ${payload.projectId}`);
      userIdForQuery = userIdFromGateway;
      supabaseClientForQuery = createAdminClient();
      // Service role key will bypass RLS for the update, but we should still verify ownership conceptually if needed.
      // For now, assuming gateway calls are trusted or have pre-verified permissions.
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
      // RLS policies should enforce that the user can only update projects they own/have access to.
    }

    console.log(`Updating project ${payload.projectId} for effective user_id ${userIdForQuery}`);

    // Construct the update object, only including fields that are present in the payload
    const updateData: { [key: string]: any } = {};
    if (payload.projectName !== undefined) updateData.name = payload.projectName;
    if (payload.githubRepoURL !== undefined) updateData.github_repo_url = payload.githubRepoURL;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.org !== undefined) updateData.org = payload.org;
    if (payload.project_leader !== undefined) updateData.project_leader = payload.project_leader;

    // Add updated_at timestamp automatically by Supabase
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length <= 1) { // Only contains updated_at
        return new Response(JSON.stringify({ error: 'No update fields provided' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
    }

    const { data: updatedProject, error: updateError } = await supabaseClientForQuery
      .from('projects')
      .update(updateData)
      .eq('id', payload.projectId)
      // If not using admin client, RLS policy should handle ownership check.
      // If using admin client, we might need an explicit check if gateway calls shouldn't bypass ownership.
      // For now, let's assume RLS handles it for direct calls, and gateway calls are authorized.
      .select('id, name, description, github_repo_url, created_at, updated_at, user_id, org, project_leader') // Select the fields needed
      .single();

    if (updateError) {
      console.error("Error updating project:", updateError);
      // Check if the error is due to RLS violation (e.g., user doesn't own the project)
      if (updateError.code === '42501') { // permission denied
         return new Response(JSON.stringify({ error: 'Permission denied or project not found' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403, // Forbidden
         });
      }
      // Check if the error is because the project ID doesn't exist (update returned null)
       if (!updatedProject && !updateError) { // Or specific error code if Supabase provides one for not found on update
         return new Response(JSON.stringify({ error: 'Project not found' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404, // Not Found
         });
       }
      throw updateError; // Re-throw other errors
    }

    if (!updatedProject) {
       // This case might occur if the project ID was valid but RLS prevented the update/select
       // or if the project was deleted between the check and the update.
       return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
       });
    }

    console.log("Project updated successfully:", updatedProject);
    return new Response(JSON.stringify(updatedProject), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200, // OK
    });

  } catch (err) {
    console.error("Overall error in update-project function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to update project' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

// To deploy: supabase functions deploy update-project --project-ref <your-project-ref> --no-verify-jwt
