// supabase/functions/get-github-user-organizations/index.ts
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

// Helper function to fetch GitHub organizations using a token
async function fetchGitHubOrgs(accessToken: string): Promise<Response> {
  console.log("Fetching GitHub organizations with token");
  return await fetch('https://api.github.com/user/orgs', {
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    // Validate the user's JWT
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        }
      }
    );
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();

    if (userError || !user) {
      console.error("Error validating user:", userError);
      return new Response(JSON.stringify({ error: 'User not authenticated.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    
    console.log(`User ${user.id} authenticated. Retrieving GitHub token from database.`);

    // Retrieve the GitHub token from our table
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('github_access_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (tokenError || !tokenData) {
      console.error("GitHub token not found for user:", tokenError || "No record found");
      
      // Check if we have a provider_token in the session
      const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();
      
      if (sessionError || !session || !session.provider_token) {
        return new Response(JSON.stringify({ 
          error: 'GitHub access token not found for the user. Please re-link your GitHub account.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
        });
      }
      
      console.log("Found provider_token in session. Using it to fetch organizations.");
      
      // Use the provider_token to fetch organizations
      try {
        const githubResponse = await fetchGitHubOrgs(session.provider_token);
        const responseBodyText = await githubResponse.text();
        
        if (!githubResponse.ok) {
          console.error(`GitHub API error (${githubResponse.status}):`, responseBodyText);
          
          let errorMessage = `GitHub API request failed: ${githubResponse.status} ${githubResponse.statusText}`;
          if (githubResponse.status === 401) {
            errorMessage = "GitHub token is invalid or expired. Please re-link your GitHub account.";
          }
          
          return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: githubResponse.status,
          });
        }
        
        // Parse organizations from the response
        let orgs: GitHubOrg[];
        try {
          orgs = JSON.parse(responseBodyText);
        } catch (parseError) {
          console.error("Error parsing GitHub API response:", parseError);
          return new Response(JSON.stringify({ 
            error: 'Failed to parse GitHub API response', 
            details: parseError instanceof Error ? parseError.message : 'Unknown error'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
        
        console.log(`Successfully fetched ${orgs.length} organizations from GitHub using provider_token`);
        
        // Store the provider_token in the github_access_tokens table for future use
        const { error: storeTokenError } = await supabaseAdmin
          .from('github_access_tokens')
          .upsert({
            user_id: user.id,
            access_token: session.provider_token,
            created_at: new Date().toISOString(),
          });
          
        if (storeTokenError) {
          console.error("Error storing provider_token:", storeTokenError);
        } else {
          console.log("Successfully stored provider_token in github_access_tokens table");
        }
        
        // Format and return the organizations
        const simplifiedOrgs = orgs.map(org => ({
          id: org.id,
          login: org.login,
          avatar_url: org.avatar_url,
        }));

        return new Response(JSON.stringify(simplifiedOrgs), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (fetchError) {
        console.error("Error fetching from GitHub API with provider_token:", fetchError);
        return new Response(JSON.stringify({ 
          error: 'Failed to connect to GitHub API', 
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        });
      }
    }
    
    // Check if token is expired and needs refreshing
    const now = Math.floor(Date.now() / 1000);
    let accessToken = tokenData.access_token;
    
    if (tokenData.expires_at && tokenData.expires_at < now && tokenData.refresh_token) {
      try {
        console.log("Token expired. Attempting to refresh...");
        const githubClientId = Deno.env.get('GITHUB_CLIENT_ID');
        const githubClientSecret = Deno.env.get('GITHUB_CLIENT_SECRET');
        
        if (!githubClientId || !githubClientSecret) {
          throw new Error('GitHub credentials not configured');
        }
        
        const refreshResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: githubClientId,
            client_secret: githubClientSecret,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
          }),
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          accessToken = refreshData.access_token;
          
          // Update token in database
          await supabaseAdmin
            .from('github_access_tokens')
            .upsert({
              id: tokenData.id,
              user_id: user.id,
              access_token: refreshData.access_token,
              refresh_token: refreshData.refresh_token || tokenData.refresh_token,
              expires_in: refreshData.expires_in,
              expires_at: refreshData.expires_in 
                ? Math.floor(Date.now() / 1000) + refreshData.expires_in 
                : null,
              scope: refreshData.scope || tokenData.scope,
              created_at: new Date().toISOString(),
            });
            
          console.log("Token refreshed successfully");
        } else {
          console.error("Token refresh failed:", await refreshResponse.text());
        }
      } catch (refreshError) {
        console.error("Error during token refresh:", refreshError);
      }
    }

    // Fetch organizations from GitHub
    let githubResponse: Response;
    let responseBodyText: string;
    
    try {
      githubResponse = await fetchGitHubOrgs(accessToken);
      responseBodyText = await githubResponse.text();
      
      if (!githubResponse.ok) {
        console.error(`GitHub API error (${githubResponse.status}):`, responseBodyText);
        
        let errorMessage = `GitHub API request failed: ${githubResponse.status} ${githubResponse.statusText}`;
        if (githubResponse.status === 401) {
          errorMessage = "GitHub token is invalid or expired. Please re-link your GitHub account.";
        }
        
        return new Response(JSON.stringify({ error: errorMessage }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: githubResponse.status,
        });
      }
    } catch (fetchError) {
      console.error("Error fetching from GitHub API:", fetchError);
      return new Response(JSON.stringify({ 
        error: 'Failed to connect to GitHub API', 
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }
    
    // Parse organizations from the response
    let orgs: GitHubOrg[];
    try {
      orgs = JSON.parse(responseBodyText);
    } catch (parseError) {
      console.error("Error parsing GitHub API response:", parseError);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse GitHub API response', 
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    console.log(`Successfully fetched ${orgs.length} organizations from GitHub`);
    
    // Format and return the organizations
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
    console.error("Overall error in function:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : 'Failed to fetch GitHub organizations'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
