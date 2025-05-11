import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("delete-api-key function initializing");

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
    const { api_key_id } = await req.json();
    if (!api_key_id) {
      return new Response(JSON.stringify({ error: 'api_key_id is required' }), {
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

    console.log(`Attempting to delete API key ${api_key_id} for user ${user.id}`);

    // Delete the key only if it belongs to the authenticated user
    const { error: deleteError, count } = await supabaseClient
      .from('user_api_keys')
      .delete()
      .eq('id', api_key_id)
      .eq('user_id', user.id); // Crucial ownership check

    if (deleteError) {
      console.error("Error deleting API key:", deleteError);
      throw deleteError;
    }

    if (count === 0) {
      return new Response(JSON.stringify({ error: 'API Key not found or not owned by user.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404, // Or 403
      });
    }

    console.log(`API Key ${api_key_id} deleted successfully for user ${user.id}`);

    return new Response(JSON.stringify({ message: 'API Key deleted successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Overall error in delete-api-key function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to delete API key' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy delete-api-key --project-ref <your-project-ref>
