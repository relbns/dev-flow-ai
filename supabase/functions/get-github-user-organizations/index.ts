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
  // Change to accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Only POST is accepted.' }), {
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
    
    // Extract body to get provider_token
    let requestBody: { provider_token?: string };
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const githubAccessToken = requestBody.provider_token;

    if (!githubAccessToken) {
      console.error("provider_token is missing from request body.");
      return new Response(JSON.stringify({ error: 'GitHub provider_token not found in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400, // Bad request
      });
    }

    // Create Supabase client primarily for auth validation using the user's JWT
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        }
      }
    );

    // First, try to get the user object. This validates the JWT.
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      console.error("Error from supabaseUserClient.auth.getUser():", userError);
      return new Response(JSON.stringify({ error: 'User not authenticated via getUser(). Ensure JWT is valid.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    console.log(`User ${user.id} authenticated via JWT. Using provider_token from request body (length: ${githubAccessToken.length}).`);

    // Proceed with GitHub API call using the token from the body
    let githubResponse: Response;
    let responseBodyText: string = ''; // Declare responseBodyText outside the try block
    try {
      console.log("Attempting fetch to https://api.github.com/user/orgs");
      githubResponse = await fetch('https://api.github.com/user/orgs', {
        headers: {
          'Authorization': `token ${githubAccessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      console.log(`GitHub API response status: ${githubResponse.status}`);

      // Read body once as text, regardless of status, to handle both success and error parsing
      responseBodyText = await githubResponse.text(); // Assign to the outer scope variable
      console.log(`GitHub API response body (raw text, first 500 chars): ${responseBodyText.substring(0, 500)}...`);

    } catch (fetchError) {
      console.error("Error during fetch to GitHub API:", fetchError);
      return new Response(JSON.stringify({ error: 'Failed to connect to GitHub API.', details: fetchError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502, // Bad Gateway might be more appropriate
      });
    }

    if (!githubResponse.ok) {
      // We already read the body text above
      console.error(`GitHub API request failed with status: ${githubResponse.status}. Body: ${responseBodyText}`);

      // Try to parse errorBody as JSON for more details
      let ghError: any = responseBodyText; // Default to text
      try {
        ghError = JSON.parse(responseBodyText); // Try parsing
      } catch (e) { 
         console.warn("GitHub response body was not valid JSON.");
      }
      
      let message = `GitHub API request failed with status: ${githubResponse.status}.`;
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

    // Now try to parse the successful response as JSON
    let orgs: GitHubOrg[];
    try {
      orgs = JSON.parse(responseBodyText); // Parse the text we already read
    } catch (parseError) {
      console.error("Error parsing successful GitHub API response:", parseError);
      console.error("Response body that failed parsing:", responseBodyText);
      return new Response(JSON.stringify({ error: 'Failed to parse GitHub API response.', details: parseError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500, 
      });
    }
    
    console.log(`Successfully parsed ${orgs.length} organizations from GitHub response.`);
    
    const simplifiedOrgs = orgs.map(org => ({
      id: org.id, // Keep original GitHub ID
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
