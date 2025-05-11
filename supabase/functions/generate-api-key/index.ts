import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// import { hash } from 'https://deno.land/x/bcrypt@v0.4.0/mod.ts'; // Removed bcrypt
import { corsHeaders } from '../_shared/cors.ts';

console.log("generate-api-key function initializing");

// Function to generate a random string for the API key
function generateApiKey(length = 32): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Function to "hash" API key using SHA-256 (hex encoded)
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const API_KEY_PREFIX = 'dfai_sk_'; // DevFlow AI Secret Key prefix

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const keyName = body?.name || null; 

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

    const rawApiKeyRandomPart = generateApiKey(32);
    const fullApiKey = `${API_KEY_PREFIX}${rawApiKeyRandomPart}`;
    
    // "Hash" the full API key using SHA-256 for storage
    const hashedApiKeyForStorage = await hashApiKey(fullApiKey);

    const keyPrefixForDisplay = `${API_KEY_PREFIX}${rawApiKeyRandomPart.substring(0, 8)}`;

    const { data: newKeyRecord, error: insertError } = await supabaseClient
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        name: keyName,
        hashed_key: hashedApiKeyForStorage, // Store the SHA-256 hash
        key_prefix: keyPrefixForDisplay,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting API key:", insertError);
      throw insertError;
    }

    console.log(`API Key generated for user ${user.id}, prefix: ${keyPrefixForDisplay}`);

    return new Response(JSON.stringify({ 
      message: "API Key generated successfully. Store it securely, it will not be shown again.",
      apiKey: fullApiKey,
      id: newKeyRecord.id,
      name: newKeyRecord.name,
      key_prefix: newKeyRecord.key_prefix,
      created_at: newKeyRecord.created_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Overall error in generate-api-key function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to generate API key' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy generate-api-key --project-ref <your-project-ref>
// Example curl to test:
// curl -X POST 'http://localhost:54321/functions/v1/generate-api-key' \
//   -H "Authorization: Bearer <USER_JWT_TOKEN>" \
//   -H "Content-Type: application/json" \
//   -d '{"name":"My Test Key"}'
