import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("create-task function initializing");

interface TaskPayload {
  project_id: string;
  title: string;
  description?: string | null;
  status?: string | null; // Default to 'Backlog' if not provided
  scoped_path_id?: string | null;
}

// Helper function to verify project ownership
async function verifyProjectOwnership(supabaseClient: SupabaseClient, userId: string, projectId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116: "Searched item was not found"
    console.error("Error verifying project ownership:", error);
  }
  return !!data;
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: TaskPayload = await req.json();
    if (!payload.project_id || !payload.title) {
      return new Response(JSON.stringify({ error: 'project_id and title are required' }), {
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

    // Verify project ownership
    const isOwner = await verifyProjectOwnership(supabaseClient, user.id, payload.project_id);
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'User does not own this project or project not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }
    
    console.log(`Creating task "${payload.title}" for project ${payload.project_id} by user ${user.id}`);

    const taskToInsert = {
      project_id: payload.project_id,
      title: payload.title,
      description: payload.description || null,
      status: payload.status || 'Backlog', // Default to 'Backlog'
      scoped_path_id: payload.scoped_path_id || null,
      // user_id could be added here if tasks are directly associated with a creator user
      // but current schema links tasks to projects, and projects to users.
    };

    const { data: newTask, error: insertError } = await supabaseClient
      .from('tasks')
      .insert(taskToInsert)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting task:", insertError);
      throw insertError;
    }
    
    console.log("Task created successfully:", newTask);

    return new Response(JSON.stringify(newTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (err) {
    console.error("Overall error in create-task function:", err);
    // Check for specific PostgreSQL error codes if needed, e.g., foreign key violation
    if (err.code === '23503') { // foreign_key_violation
        return new Response(JSON.stringify({ error: 'Invalid project_id or scoped_path_id.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, 
        });
    }
    return new Response(JSON.stringify({ error: err.message || 'Failed to create task' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy create-task --project-ref <your-project-ref>
// Example curl to test:
// curl -X POST 'http://localhost:54321/functions/v1/create-task' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json" \
//   -d '{
//         "project_id": "your-project-uuid",
//         "title": "New MCP Task Title",
//         "description": "Description for the new MCP task.",
//         "status": "To Do",
//         "scoped_path_id": "optional-scoped-path-uuid" 
//       }'
