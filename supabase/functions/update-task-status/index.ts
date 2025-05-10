import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("update-task-status function initializing");

interface UpdateTaskStatusPayload {
  task_id: string;
  new_status: string;
  current_branch?: string | null;
  pull_request_url?: string | null;
}

// Helper function to verify project ownership via task_id
async function verifyTaskOwnership(supabaseClient: SupabaseClient, userId: string, taskId: string): Promise<boolean> {
  const { data: task, error } = await supabaseClient
    .from('tasks')
    .select('id, projects (user_id)')
    .eq('id', taskId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error verifying task ownership:", error);
  }
  if (!task || task.projects?.user_id !== userId) {
    return false;
  }
  return true;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: UpdateTaskStatusPayload = await req.json();
    if (!payload.task_id || !payload.new_status) {
      return new Response(JSON.stringify({ error: 'task_id and new_status are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Validate new_status against allowed values
    const allowedStatuses = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
    if (!allowedStatuses.includes(payload.new_status)) {
        return new Response(JSON.stringify({ error: 'Invalid status. Must be one of: ' + allowedStatuses.join(', ') }), {
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

    // Verify task ownership
    const isOwner = await verifyTaskOwnership(supabaseClient, user.id, payload.task_id);
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Task not found or access denied.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden or 404 if we don't want to reveal existence
      });
    }
    
    console.log('Updating task ' + payload.task_id + ' to status "' + payload.new_status + '" by user ' + user.id);

    const updates: { 
        status: string; 
        updated_at: string;
        current_branch?: string | null;
        pull_request_url?: string | null;
    } = {
      status: payload.new_status,
      updated_at: new Date().toISOString(),
    };

    if (payload.current_branch !== undefined) {
        updates.current_branch = payload.current_branch;
    }
    if (payload.pull_request_url !== undefined) {
        updates.pull_request_url = payload.pull_request_url;
    }

    const { data: updatedTask, error: updateError } = await supabaseClient
      .from('tasks')
      .update(updates)
      .eq('id', payload.task_id)
      .select('*, scoped_paths(name, path_in_repo)') // Return updated task with scoped_path details
      .single();

    if (updateError) {
      console.error("Error updating task status:", updateError);
      throw updateError;
    }
    
    console.log("Task status updated successfully:", updatedTask);

    return new Response(JSON.stringify(updatedTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Overall error in update-task-status function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to update task status' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy update-task-status --project-ref <your-project-ref>
// Example curl to test:
// curl -X POST 'http://localhost:54321/functions/v1/update-task-status' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json" \
//   -d '{
//         "task_id": "your-task-uuid",
//         "new_status": "In Progress",
//         "current_branch": "feature/new-thing"
//       }'
