import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("list-api-keys function initializing");

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // This function should be a GET request
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Only GET is accepted.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
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

    console.log(`Fetching API keys for user ${user.id}`);

    const { data: apiKeys, error } = await supabaseClient
      .from('user_api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, expires_at') // Exclude hashed_key
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching API keys:", error);
      throw error;
    }

    return new Response(JSON.stringify(apiKeys || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Overall error in list-api-keys function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch API keys' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy list-api-keys --project-ref <your-project-ref>
// Note: This function requires a user JWT, so --no-verify-jwt is NOT needed if called directly by user.
// If called by gateway (e.g. admin listing keys for a user), then gateway would use service_role
// and this function would need the dual-auth pattern. For now, assume direct user call.
