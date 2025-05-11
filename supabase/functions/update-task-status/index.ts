import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("update-task-status function initializing");

interface UpdateTaskStatusPayload {
  task_id: string;
  new_status: string;
  current_branch?: string | null;
  pull_request_url?: string | null;
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

// Updated helper function to verify task ownership using the determined userIdForQuery
async function verifyTaskOwnership(supabaseClient: SupabaseClient, userIdForQuery: string, taskId: string): Promise<boolean> {
  const { data: task, error } = await supabaseClient
    .from('tasks')
    .select('id, projects!inner(user_id)') // Ensure project exists and join user_id
    .eq('id', taskId)
    .eq('projects.user_id', userIdForQuery) // Check ownership via project
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error verifying task ownership:", error);
  }
  return !!task; // If task is found matching criteria, ownership is verified
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
    const payload: UpdateTaskStatusPayload = await req.json();
    if (!payload.task_id || !payload.new_status) {
      return new Response(JSON.stringify({ error: 'task_id and new_status are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const allowedStatuses = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
    if (!allowedStatuses.includes(payload.new_status)) {
        return new Response(JSON.stringify({ error: 'Invalid status. Must be one of: ' + allowedStatuses.join(', ') }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
    }

    let userIdForQuery: string;
    let supabaseClientForQuery: SupabaseClient;
    const userIdFromGateway = payload.user_id_from_gateway;

    if (userIdFromGateway) {
      // Called by gateway
      console.log(`update-task-status called by gateway for user_id: ${userIdFromGateway}, task_id: ${payload.task_id}`);
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

    // Verify task ownership using the determined userIdForQuery
    const isOwner = await verifyTaskOwnership(supabaseClientForQuery, userIdForQuery, payload.task_id);
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Task not found or access denied.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }
    
    console.log(`Updating task ${payload.task_id} to status "${payload.new_status}" by effective user_id ${userIdForQuery}`);

    const updates: any = { // Use 'any' for updates object flexibility
      status: payload.new_status,
      updated_at: new Date().toISOString(),
    };
    if (payload.current_branch !== undefined) updates.current_branch = payload.current_branch;
    if (payload.pull_request_url !== undefined) updates.pull_request_url = payload.pull_request_url;

    const { data: updatedTask, error: updateError } = await supabaseClientForQuery
      .from('tasks')
      .update(updates)
      .eq('id', payload.task_id)
      // No need to filter by user_id here again if verifyTaskOwnership is robust
      // and RLS is in place for direct calls. For service_role calls, verifyTaskOwnership is key.
      .select('*, scoped_paths(name, path_in_repo)')
      .single();

    if (updateError) {
      console.error("Error updating task status:", updateError);
      throw updateError;
    }
    
    console.log("Task status updated successfully:", updatedTask);

    return new Response(JSON.stringify(updatedTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (err) {
    console.error("Overall error in update-task-status function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to update task status' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

// To deploy: supabase functions deploy update-task-status --project-ref <your-project-ref> --no-verify-jwt
