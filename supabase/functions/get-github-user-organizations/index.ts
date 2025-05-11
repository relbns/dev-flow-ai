import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-github-user-organizations function initializing");

interface GitHubOrg {
  login: string;
  id: number;
  node_id: string;
  url: string;
  repos_url: string;
  events_url: string;
  hooks_url: string;
  issues_url: string;
  members_url: string;
  public_members_url: string;
  avatar_url: string;
  description: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
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

    // Create ONE Supabase client initialized with the user's JWT from the header
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // First, try to get the user object. This validates the JWT.
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      console.error("Error from supabaseUserClient.auth.getUser():", userError);
      return new Response(JSON.stringify({ error: 'User not authenticated via getUser(). Ensure JWT is valid.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    console.log("User object from getUser():", JSON.stringify(user, null, 2));

    // Now, try to get the session using the same client.
    // This session object is expected to contain the provider_token.
    const { data: sessionData, error: sessionError } = await supabaseUserClient.auth.getSession();
    
    console.log("Data from getSession():", JSON.stringify(sessionData, null, 2));
    console.log("Error from getSession():", JSON.stringify(sessionError, null, 2));

    if (sessionError || !sessionData?.session) {
      console.error("Error or null session from getSession(). Error:", sessionError, "SessionData:", sessionData);
      return new Response(JSON.stringify({ error: 'Failed to retrieve full session data (session is null or error occurred).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }
    
    const session = sessionData.session;
    // Double-check user consistency (should match if using the same client and JWT)
    if (session.user.id !== user.id) {
      console.error("Session user ID mismatch. getUser ID:", user.id, "getSession ID:", session.user.id);
      return new Response(JSON.stringify({ error: 'Session user ID mismatch after successful getUser(). This is unexpected.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const githubAccessToken = session.provider_token;

    if (!githubAccessToken) {
      console.error("provider_token is missing from session object. Session:", JSON.stringify(session, null, 2));
      return new Response(JSON.stringify({ error: 'GitHub provider_token not found in session. Ensure OAuth scopes (e.g., read:org) were granted and user re-authenticated if scopes changed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    console.log(`Successfully retrieved provider_token. Fetching GitHub organizations for user ${user.id}`);

    // If we got here, provider_token exists. Proceed with GitHub API call.
    const githubResponse = await fetch('https://api.github.com/user/orgs', {
      headers: {
        'Authorization': `token ${githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!githubResponse.ok) {
      const errorBody = await githubResponse.text();
      console.error(`GitHub API error: ${githubResponse.status}`, errorBody);
      // Try to parse errorBody as JSON for more details if possible
      let ghError = errorBody;
      try {
        ghError = JSON.parse(errorBody);
      } catch (e) { /* ignore parsing error */ }
      
      let message = `GitHub API request failed: ${githubResponse.status}.`;
      if (typeof ghError === 'object' && ghError !== null && (ghError as any).message) {
        message += ` Message: ${(ghError as any).message}`;
      }
      if (githubResponse.status === 401) {
        message += " This might be due to an invalid or expired GitHub token, or insufficient OAuth scopes (read:org needed)."
      }
      if (githubResponse.status === 403) {
         message += " This might be due to insufficient OAuth scopes (read:org needed) or other GitHub permission issues."
      }

      return new Response(JSON.stringify({ error: message, details: ghError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: githubResponse.status, // Propagate GitHub status
      });
    }

    const orgs: GitHubOrg[] = await githubResponse.json();
    
    const simplifiedOrgs = orgs.map(org => ({
      id: org.id,
      login: org.login,
      avatar_url: org.avatar_url,
    }));

    return new Response(JSON.stringify(simplifiedOrgs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Overall error in get-github-user-organizations function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch GitHub organizations' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// To deploy: supabase functions deploy get-github-user-organizations --project-ref <your-project-ref>
// This function requires a user JWT.
