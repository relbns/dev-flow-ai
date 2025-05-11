import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("add-comment-to-task function initializing");

interface AddCommentPayload {
  task_id: string;
  comment_text: string;
  author_display_name?: string | null; 
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
    .select('id, projects!inner(user_id)') 
    .eq('id', taskId)
    .eq('projects.user_id', userIdForQuery)
    .single();

  if (error && error.code !== 'PGRST116') { 
    console.error("Error verifying task ownership:", error);
  }
  return !!task;
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
    const payload: AddCommentPayload = await req.json();
    if (!payload.task_id || !payload.comment_text || payload.comment_text.trim() === '') {
      return new Response(JSON.stringify({ error: 'task_id and non-empty comment_text are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    let userIdForOperation: string; // User ID who is performing the action / whose behalf it's on
    let userEmailForDisplayName: string | undefined = undefined; // For default display name
    let supabaseClientForQuery: SupabaseClient;
    const userIdFromGateway = payload.user_id_from_gateway;

    if (userIdFromGateway) {
      // Called by gateway
      console.log(`add-comment-to-task called by gateway for user_id: ${userIdFromGateway}, task_id: ${payload.task_id}`);
      userIdForOperation = userIdFromGateway;
      supabaseClientForQuery = createAdminClient();
      // For display name, if AI doesn't provide one, we might not have user's email easily here.
      // The gateway could pass it, or we use a generic "AI Agent" or the API key's name.
      // For now, if author_display_name is not in payload, it will be null for gateway calls.
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
      userIdForOperation = user.id;
      userEmailForDisplayName = user.email;
    }

    // Verify task ownership using the determined userIdForOperation
    const isOwner = await verifyTaskOwnership(supabaseClientForQuery, userIdForOperation, payload.task_id);
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Task not found or access denied.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403, 
      });
    }
    
    console.log(`Adding comment to task ${payload.task_id} by effective user_id ${userIdForOperation}`);

    const commentToInsert = {
      task_id: payload.task_id,
      comment_text: payload.comment_text,
      user_id: userIdForOperation, 
      author_display_name: payload.author_display_name || (userIdFromGateway ? 'AI Agent' : (userEmailForDisplayName || 'User')),
    };

    // Use the same client that verified ownership for the insert
    const { data: newComment, error: insertError } = await supabaseClientForQuery
      .from('task_comments')
      .insert(commentToInsert)
      .select() // Select all columns of the newly inserted comment
      .single();

    if (insertError) {
      console.error("Error inserting task comment:", insertError);
      throw insertError;
    }
    
    console.log("Task comment added successfully:", newComment);

    return new Response(JSON.stringify(newComment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
    });

  } catch (err) {
    console.error("Overall error in add-comment-to-task function:", err);
    const statusCode = err.code === '23503' ? 400 : 500; // foreign_key_violation
    return new Response(JSON.stringify({ error: err.message || 'Failed to add comment' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode,
    });
  }
});

// To deploy: supabase functions deploy add-comment-to-task --project-ref <your-project-ref> --no-verify-jwt
