import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("mcp-gateway function initializing");

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

// Helper to invoke another Supabase function using Service Role Key + User ID for context
async function invokeTargetFunctionAsUser(
  targetFunction: string, 
  userId: string, // User ID to act on behalf of
  method: string = 'POST', 
  body: any = {} // Original arguments from AI, plus userId
): Promise<Response> {
  const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${targetFunction}`;
  
  // The gateway calls other functions using its service_role privileges.
  // It passes the user_id so the target function can scope its actions.
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    // IMPORTANT: Use service_role_key for the gateway to call other functions
    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 
    'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  };

  // Add user_id to the arguments being passed to the target function
  const finalBody = { ...body, user_id_from_gateway: userId }; // Target function needs to expect this

  let response;
  if (method === 'GET') {
    const queryString = new URLSearchParams(finalBody).toString();
    response = await fetch(`${functionUrl}?${queryString}`, { method: 'GET', headers });
  } else {
    response = await fetch(functionUrl, { method, headers, body: JSON.stringify(finalBody) });
  }
  return response;
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const devFlowApiKey = req.headers.get('X-DevFlow-API-Key');

    if (!devFlowApiKey) {
      return new Response(JSON.stringify({ error: 'Missing X-DevFlow-API-Key header' }), {
        headers: corsHeaders, status: 401,
      });
    }
    // User JWT is NO LONGER expected here by the gateway itself.

    const { tool_name, arguments: tool_arguments } = await req.json();
    if (!tool_name) {
      return new Response(JSON.stringify({ error: 'tool_name is required in request body' }), {
        headers: corsHeaders, status: 400,
      });
    }

    const hashedApiKeyFromRequest = await hashApiKey(devFlowApiKey);
    const supabaseAdminClient = createAdminClient(); // Used for API key validation

    // 1. Validate API Key
    const { data: apiKeyRecord, error: apiKeyDbError } = await supabaseAdminClient
      .from('user_api_keys')
      .select('user_id, id')
      .eq('hashed_key', hashedApiKeyFromRequest)
      .single();

    if (apiKeyDbError || !apiKeyRecord) {
      return new Response(JSON.stringify({ error: 'Invalid or unauthorized X-DevFlow-API-Key' }), {
        headers: corsHeaders, status: 403,
      });
    }
    const userIdFromApiKey = apiKeyRecord.user_id;
    console.log(`Gateway: API Key validated for user_id: ${userIdFromApiKey}, tool: ${tool_name}`);
    
    // Update last_used_at for the DevFlow API Key
    supabaseAdminClient
      .from('user_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRecord.id)
      .then(({ error: updateError }) => {
        if (updateError) console.error('Failed to update last_used_at for API key:', updateError);
      });

    // 2. Route to the appropriate MCP tool
    let targetFunctionName = '';
    let requestMethod = 'POST';
    let finalToolArguments = tool_arguments || {};

    switch (tool_name) {
      case 'get-task-details':
        targetFunctionName = 'get-task-details';
        requestMethod = 'GET';
        // `task_id` is already in finalToolArguments from tool_arguments.
        // `user_id_from_gateway` will be added by invokeTargetFunctionAsUser.
        break;
      case 'get-project-details':
        targetFunctionName = 'get-project-details';
        requestMethod = 'GET';
        break;
      case 'list-projects':
        targetFunctionName = 'list-projects';
        requestMethod = 'GET';
        // This function will need to use user_id_from_gateway
        break;
      case 'list-tasks':
        targetFunctionName = 'list-tasks';
        requestMethod = 'GET';
        // `project_id` is in finalToolArguments. user_id_from_gateway for RLS.
        break;
      case 'create-project':
        targetFunctionName = 'create-project';
        requestMethod = 'POST';
        break;
      case 'create-task':
        targetFunctionName = 'create-task';
        requestMethod = 'POST';
        break;
      case 'update-task-status':
        targetFunctionName = 'update-task-status';
        requestMethod = 'POST';
        break;
      case 'add-comment-to-task':
        targetFunctionName = 'add-comment-to-task';
        requestMethod = 'POST';
        break;
      // ... other POST cases
      default:
        return new Response(JSON.stringify({ error: `Tool '${tool_name}' not recognized by gateway.` }), {
          headers: corsHeaders, status: 400,
        });
    }

    // Invoke the target function, passing the authenticated user_id for context
    const targetResponse = await invokeTargetFunctionAsUser(
      targetFunctionName, 
      userIdFromApiKey, 
      requestMethod, 
      finalToolArguments
    );
    
    return new Response(targetResponse.body, {
        status: targetResponse.status,
        headers: { ...corsHeaders, 'Content-Type': targetResponse.headers.get('Content-Type') || 'application/json' }
    });

  } catch (err) {
    console.error("Overall error in mcp-gateway function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Gateway processing failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy mcp-gateway --project-ref <your-project-ref> --no-verify-jwt
