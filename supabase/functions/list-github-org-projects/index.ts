import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("list-github-org-projects function initializing");

// Function to get GitHub token from user session
async function getGithubToken(supabaseClient) {
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    console.error("Error getting session or no session found:", sessionError);
    return null;
  }
  // Check if the provider is GitHub and get the token
  if (session.user?.app_metadata?.provider === 'github' && session.provider_token) {
     return session.provider_token;
  } else {
     console.error("GitHub provider token not found in session.");
     // Attempt to get user metadata directly for alternative token storage if needed
     const { data: user_data, error: user_error } = await supabaseClient.auth.getUser();
     if (user_error || !user_data?.user?.user_metadata?.github_token) { // Example: Check a custom metadata field
        console.error("No suitable GitHub token found in user session or metadata.");
        return null;
     }
     console.log("Using GitHub token from user_metadata"); // Log if using fallback
     return user_data.user.user_metadata.github_token;
  }
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
   // Ensure it's a GET request
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Only GET is accepted.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
    const url = new URL(req.url);
    const orgName = url.searchParams.get('orgName');

    if (!orgName) {
      return new Response(JSON.stringify({ error: 'orgName query parameter is required' }), {
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

    // Validate user session before proceeding
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
     if (userError || !user) {
       return new Response(JSON.stringify({ error: 'User not authenticated or token invalid' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
       });
     }

    const githubToken = await getGithubToken(supabaseClient);
    if (!githubToken) {
      // Try fetching token via dedicated function if available (e.g., from api_keys table)
      // This part is hypothetical, depends on how tokens might be stored securely elsewhere
      // const tokenFromDb = await fetchTokenFromSecureStorage(supabaseClient, user.id);
      // if (!tokenFromDb) { ... return error ... }
      // githubToken = tokenFromDb;

      // If still no token after checking alternatives:
       return new Response(JSON.stringify({ error: 'Could not retrieve GitHub token for the user' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401, // Or 403 Forbidden if auth is ok but token missing
       });
    }


    console.log(`Fetching projects for organization: ${orgName} for user ${user.id}`);

    // Fetch repositories for the organization using the GitHub API
    // Note: This fetches repos the *authenticated user* has access to within that org.
    const githubApiUrl = `https://api.github.com/orgs/${orgName}/repos?type=all&per_page=100`; // Fetch all types, up to 100

    const response = await fetch(githubApiUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28' // Recommended header
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`GitHub API error fetching org repos (${response.status}) for org ${orgName}: ${errorBody}`);
       // Handle specific errors like 404 Not Found (org might not exist or user lacks access)
       if (response.status === 404) {
         return new Response(JSON.stringify({ error: `Organization '${orgName}' not found or user lacks access.` }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
         });
       }
       // Handle potential rate limiting
       if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
         console.warn(`GitHub API rate limit exceeded for user ${user.id}`);
         return new Response(JSON.stringify({ error: 'GitHub API rate limit exceeded.' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429, // Too Many Requests
         });
       }
      return new Response(JSON.stringify({ error: `Failed to fetch projects from GitHub: ${response.statusText}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status,
      });
    }

    const projects = await response.json();

    // Map the response to return only needed fields
    const simplifiedProjects = projects.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      private: repo.private,
    }));

    console.log(`Found ${simplifiedProjects.length} projects for org ${orgName} accessible by user ${user.id}`);

    return new Response(JSON.stringify(simplifiedProjects), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (err) {
    console.error("Overall error in list-github-org-projects function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to list GitHub projects' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

// To deploy: supabase functions deploy list-github-org-projects --project-ref <your-project-ref> --no-verify-jwt
