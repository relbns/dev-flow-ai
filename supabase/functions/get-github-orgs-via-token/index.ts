import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-github-orgs-via-token function initializing");

interface GitHubOrg {
  login: string;
  id: number;
  avatar_url: string;
  // Add other fields if needed from GitHub API response
}

interface RequestPayload {
  provider_token: string;
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
    // 1. Authenticate the user making this call via their JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const supabaseClient = createClient( // Client for JWT validation
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      console.error("Error validating user JWT:", userError);
      return new Response(JSON.stringify({ error: 'User not authenticated or token invalid.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    console.log(`User ${user.id} authenticated to call get-github-orgs-via-token.`);

    // 2. Get the provider_token from the request body
    const payload: RequestPayload = await req.json();
    const githubAccessToken = payload.provider_token;

    if (!githubAccessToken) {
      return new Response(JSON.stringify({ error: 'Missing provider_token in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // 3. Call GitHub API
    console.log(`Fetching GitHub organizations for user ${user.id} using provided token.`);
    const githubResponse = await fetch('https://api.github.com/user/orgs', {
      headers: {
        'Authorization': `token ${githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!githubResponse.ok) {
      const errorBody = await githubResponse.text();
      console.error(`GitHub API error: ${githubResponse.status}`, errorBody);
      let ghError = errorBody;
      try { ghError = JSON.parse(errorBody); } catch (e) { /* ignore */ }
      
      let message = `GitHub API request failed: ${githubResponse.status}.`;
      if (typeof ghError === 'object' && ghError !== null && (ghError as any).message) {
        message += ` Message: ${(ghError as any).message}`;
      }
      // Add more specific messages based on GitHub status codes if needed
      return new Response(JSON.stringify({ error: message, details: ghError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: githubResponse.status,
      });
    }

    const orgsFromGitHub: any[] = await githubResponse.json(); // Type as any[] initially
    
    const simplifiedOrgs = orgsFromGitHub.map(org => ({
      id: org.id,
      name: org.login, // Map github's 'login' to our 'name' field
      avatar_url: org.avatar_url,
    }));

    return new Response(JSON.stringify(simplifiedOrgs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Overall error in get-github-orgs-via-token function:", err);
    // Check if err is already a Response object (e.g. from early returns)
    if (err instanceof Response) {
        return err;
    }
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch GitHub organizations' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy get-github-orgs-via-token --project-ref <your-project-ref>
// This function requires a user JWT for auth, and provider_token in body.
