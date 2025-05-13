import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("list-github-org-members function initializing");

// Function to get GitHub token from user session (same as in list-github-org-projects)
async function getGithubToken(supabaseClient) {
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) {
    console.error("Error getting session or no session found:", sessionError);
    return null;
  }
  if (session.user?.app_metadata?.provider === 'github' && session.provider_token) {
     return session.provider_token;
  } else {
     console.error("GitHub provider token not found in session.");
     const { data: user_data, error: user_error } = await supabaseClient.auth.getUser();
     if (user_error || !user_data?.user?.user_metadata?.github_token) {
        console.error("No suitable GitHub token found in user session or metadata.");
        return null;
     }
     console.log("Using GitHub token from user_metadata");
     return user_data.user.user_metadata.github_token;
  }
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
     if (userError || !user) {
       return new Response(JSON.stringify({ error: 'User not authenticated or token invalid' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
       });
     }

    const githubToken = await getGithubToken(supabaseClient);
    if (!githubToken) {
       return new Response(JSON.stringify({ error: 'Could not retrieve GitHub token for the user' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
       });
    }

    console.log(`Fetching members for organization: ${orgName} for user ${user.id}`);

    // Fetch members for the organization using the GitHub API
    // Requires 'read:org' scope for the token if the user isn't a public member
    const githubApiUrl = `https://api.github.com/orgs/${orgName}/members?per_page=100`; // Get first 100 members

    const response = await fetch(githubApiUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`GitHub API error fetching org members (${response.status}) for org ${orgName}: ${errorBody}`);
       if (response.status === 404) {
         return new Response(JSON.stringify({ error: `Organization '${orgName}' not found or user lacks permissions to view members.` }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
         });
       }
       if (response.status === 403) {
         // Could be rate limit or insufficient permissions
         if (response.headers.get('X-RateLimit-Remaining') === '0') {
            console.warn(`GitHub API rate limit exceeded for user ${user.id}`);
            return new Response(JSON.stringify({ error: 'GitHub API rate limit exceeded.' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429,
            });
         } else {
            console.warn(`Insufficient permissions to list members for org ${orgName} for user ${user.id}`);
            return new Response(JSON.stringify({ error: 'Insufficient permissions to list organization members.' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
            });
         }
       }
      return new Response(JSON.stringify({ error: `Failed to fetch members from GitHub: ${response.statusText}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status,
      });
    }

    const members = await response.json();

    // Map the response to return relevant fields (e.g., login, id, avatar_url)
    const simplifiedMembers = members.map(member => ({
      id: member.id,
      login: member.login,
      avatar_url: member.avatar_url,
      html_url: member.html_url,
      // We might need their Supabase user ID later. This requires mapping GitHub logins to Supabase users.
      // This mapping is complex and likely needs a separate mechanism or table.
      // For now, we return GitHub info. The frontend will need to handle mapping if required.
    }));

    console.log(`Found ${simplifiedMembers.length} members for org ${orgName}`);

    return new Response(JSON.stringify(simplifiedMembers), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (err) {
    console.error("Overall error in list-github-org-members function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to list GitHub members' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

// To deploy: supabase functions deploy list-github-org-members --project-ref <your-project-ref> --no-verify-jwt
