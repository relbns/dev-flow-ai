import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-task-details function initializing");

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { task_id } = await req.json();
    if (!task_id) {
      return new Response(JSON.stringify({ error: 'task_id is required' }), {
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

    console.log(`Fetching details for task_id: ${task_id} by user ${user.id}`);

    // Fetch task and verify ownership through project
    // RLS on 'tasks' table (based on project ownership) should also enforce this,
    // but an explicit check here adds a layer of function-level security.
    const { data: taskDetails, error } = await supabaseClient
      .from('tasks')
      .select('*, projects(user_id)') // Select project's user_id to verify ownership
      .eq('id', task_id)
      .single();

    if (error) {
      console.error("Error fetching task details (could be not found):", error);
      // PGRST116: "Searched item was not found" - handle as 404
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      throw error; // Other errors
    }

    if (!taskDetails) { // Should be caught by error.code PGRST116, but as a safeguard
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Verify ownership: task's project's user_id must match current user's id
    // The 'projects' field in taskDetails will be an object like { user_id: "..." }
    // If RLS is perfectly set up and disallows reading tasks from non-owned projects, 
    // this check might be redundant but adds explicit security.
    if (taskDetails.projects?.user_id !== user.id) {
        console.warn('User ' + user.id + ' attempted to access task ' + task_id + ' not owned by them.'); // Changed to string concatenation
        return new Response(JSON.stringify({ error: 'Access denied: You do not own the project this task belongs to.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403, // Forbidden
        });
    }
    
    // Remove the joined projects data before returning, as it was only for auth check
    const { projects, ...restOfTaskDetails } = taskDetails;


    console.log("Task details fetched:", restOfTaskDetails);

    return new Response(JSON.stringify(restOfTaskDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error("Overall error in get-task-details function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch task details' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy get-task-details --project-ref <your-project-ref>
// Example curl to test:
// curl -X POST 'http://localhost:54321/functions/v1/get-task-details' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json" \
//   -d '{"task_id":"your-task-uuid"}'
