import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("add-comment-to-task function initializing");

interface AddCommentPayload {
  task_id: string;
  comment_text: string;
  author_display_name?: string | null; // Optional: for AI agents or if user's name is passed directly
}

// Helper function to verify project ownership via task_id
async function verifyTaskOwnership(supabaseClient: SupabaseClient, userId: string, taskId: string): Promise<boolean> {
  const { data: task, error } = await supabaseClient
    .from('tasks')
    .select('id, projects (user_id)') // projects!inner(user_id) might be better if RLS allows
    .eq('id', taskId)
    .single();

  if (error && error.code !== 'PGRST116') { 
    console.error("Error verifying task ownership:", error);
  }
  // Ensure task exists and the associated project's user_id matches the current user.
  // Note: task.projects will be null if the join fails or if RLS prevents access to the project.
  // The RLS policy on task_comments also performs a similar check.
  if (!task || !task.projects || task.projects.user_id !== userId) {
    return false;
  }
  return true;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: AddCommentPayload = await req.json();
    if (!payload.task_id || !payload.comment_text || payload.comment_text.trim() === '') {
      return new Response(JSON.stringify({ error: 'task_id and non-empty comment_text are required' }), {
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
        status: 403, 
      });
    }
    
    console.log('Adding comment to task ' + payload.task_id + ' by user ' + user.id);

    const commentToInsert = {
      task_id: payload.task_id,
      comment_text: payload.comment_text,
      user_id: user.id, // Associate comment with the authenticated user
      // Use provided author_display_name, or default to user's email or a placeholder
      author_display_name: payload.author_display_name || user.email || 'Authenticated User',
    };

    const { data: newComment, error: insertError } = await supabaseClient
      .from('task_comments')
      .insert(commentToInsert)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting task comment:", insertError);
      throw insertError;
    }
    
    console.log("Task comment added successfully:", newComment);

    return new Response(JSON.stringify(newComment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (err) {
    console.error("Overall error in add-comment-to-task function:", err);
    if (err.code === '23503') { // foreign_key_violation (e.g., task_id doesn't exist)
        return new Response(JSON.stringify({ error: 'Invalid task_id.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, 
        });
    }
    return new Response(JSON.stringify({ error: err.message || 'Failed to add comment' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy add-comment-to-task --project-ref <your-project-ref>
// Example curl to test:
// curl -X POST 'http://localhost:54321/functions/v1/add-comment-to-task' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json" \
//   -d '{
//         "task_id": "your-task-uuid",
//         "comment_text": "This is a test comment from an AI agent.",
//         "author_display_name": "AI Assistant" 
//       }'
//
// To test as a regular user (author_display_name will be overridden by user.email or default):
// curl -X POST 'http://localhost:54321/functions/v1/add-comment-to-task' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json" \
//   -d '{
//         "task_id": "your-task-uuid",
//         "comment_text": "This is a comment from the logged-in user."
//       }'
