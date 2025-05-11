import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("create-task function initializing");

interface TaskPayload {
  project_id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  scoped_path_id?: string | null;
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

// Updated helper function to verify project ownership using the determined userIdForQuery
async function verifyProjectOwnership(supabaseClient: SupabaseClient, userIdForQuery: string, projectId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userIdForQuery)
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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Only POST is accepted.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
    const payload: TaskPayload = await req.json();
    if (!payload.project_id || !payload.title) {
      return new Response(JSON.stringify({ error: 'project_id and title are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    let userIdForQuery: string;
    let supabaseClientForQuery: SupabaseClient;
    const userIdFromGateway = payload.user_id_from_gateway;

    if (userIdFromGateway) {
      // Called by gateway
      console.log(`create-task called by gateway for user_id: ${userIdFromGateway}, project_id: ${payload.project_id}`);
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

    // Verify project ownership using the determined userIdForQuery
    const isOwner = await verifyProjectOwnership(supabaseClientForQuery, userIdForQuery, payload.project_id);
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Access denied: User does not own this project or project not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }
    
    console.log(`Creating task "${payload.title}" for project ${payload.project_id} by effective user_id ${userIdForQuery}`);

    const taskToInsert = {
      project_id: payload.project_id,
      title: payload.title,
      description: payload.description || null,
      status: payload.status || 'Backlog',
      scoped_path_id: payload.scoped_path_id || null,
    };

    const { data: newTask, error: insertError } = await supabaseClientForQuery
      .from('tasks')
      .insert(taskToInsert)
      .select() // Select all columns of the newly inserted task
      .single();

    if (insertError) {
      console.error("Error inserting task:", insertError);
      throw insertError;
    }
    
    console.log("Task created successfully:", newTask);

    return new Response(JSON.stringify(newTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
    });

  } catch (err) {
    console.error("Overall error in create-task function:", err);
    const statusCode = err.code === '23503' ? 400 : 500; // foreign_key_violation (e.g. bad project_id)
    return new Response(JSON.stringify({ error: err.message || 'Failed to create task' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode,
    });
  }
});

// To deploy: supabase functions deploy create-task --project-ref <your-project-ref> --no-verify-jwt
