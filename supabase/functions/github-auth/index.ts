// supabase/functions/github-auth/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GITHUB_CLIENT_ID = Deno.env.get('GITHUB_CLIENT_ID') || '';
const GITHUB_CLIENT_SECRET = Deno.env.get('GITHUB_CLIENT_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  avatar_url: string;
  name: string;
  email: string;
}

interface GitHubOrgResponse {
  id: number;
  login: string;
  avatar_url: string;
}

// Helper to exchange the GitHub code for an access token
async function exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error exchanging code for token:', error);
    throw new Error(`GitHub token exchange failed: ${response.status}`);
  }

  return await response.json();
}

// Helper to get GitHub user information
async function getGitHubUser(token: string): Promise<GitHubUserResponse> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error fetching GitHub user:', error);
    throw new Error(`GitHub user fetch failed: ${response.status}`);
  }

  return await response.json();
}

// Helper to get GitHub user organizations
async function getGitHubOrgs(token: string): Promise<GitHubOrgResponse[]> {
  const response = await fetch('https://api.github.com/user/orgs', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error fetching GitHub organizations:', error);
    throw new Error(`GitHub organizations fetch failed: ${response.status}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log("Request received:", req);
  console.log("Request headers:", req.headers);
  
  let requestBody: Record<string, any> = {};
  try {
    requestBody = await req.json();
    console.log("Request body:", requestBody);
  } catch (error) {
    console.log("Error parsing request body:", error);
  }

  try {
    const url = new URL(req.url);
    // Check if action is in the body or URL
    const action = url.searchParams.get('action') || (requestBody.action as string | undefined);
    console.log("Action determined:", action);

    // Exchange GitHub code for token
    if (action === 'exchange-code') {
      const code = requestBody.code as string | undefined;
      
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Code is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      try {
        const tokenData = await exchangeCodeForToken(code);
        const githubUser = await getGitHubUser(tokenData.access_token);
        const githubOrgs = await getGitHubOrgs(tokenData.access_token);
        
        // Create admin client to store the token securely
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Store the GitHub token in a secure table
        const { data: tokenInsertResult, error: tokenError } = await supabaseAdmin
          .from('github_access_tokens')
          .upsert({
            user_id: githubUser.id.toString(),
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            expires_in: tokenData.expires_in || null,
            expires_at: tokenData.expires_in
              ? Math.floor(Date.now() / 1000) + tokenData.expires_in
              : null,
            scope: tokenData.scope,
            created_at: new Date().toISOString(),
          })
          .select('id');
        
        if (tokenError) {
          throw new Error(`Failed to store GitHub token: ${tokenError.message}`);
        }
        
        return new Response(
          JSON.stringify({
            user: {
              id: githubUser.id,
              login: githubUser.login,
              name: githubUser.name,
              email: githubUser.email,
              avatar_url: githubUser.avatar_url,
            },
            organizations: githubOrgs,
            token_id: tokenInsertResult && tokenInsertResult.length > 0 ? tokenInsertResult[0].id : null,
            scopes: tokenData.scope,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error during GitHub authentication:', error);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Store GitHub token (called from Layout.jsx via githubApi.js)
    else if (action === 'store-token') {
      const token = requestBody.token as string | undefined;
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      try {
        // Get GitHub user info to get the user ID
        const githubUser = await getGitHubUser(token);
        
        // Create admin client to store the token securely
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Get the Supabase user ID from the auth header
        const authHeader = req.headers.get('Authorization');
        let supabaseUserId = null;
        
        if (authHeader) {
          const supabaseClient = createClient(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            { global: { headers: { Authorization: authHeader } } }
          );
          
          const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
          if (!userError && user) {
            supabaseUserId = user.id;
          }
        }
        
        // Store the GitHub token in the secure table
        const { data: tokenInsertResult, error: tokenError } = await supabaseAdmin
          .from('github_access_tokens')
          .upsert({
            user_id: supabaseUserId || githubUser.id.toString(), // Use Supabase user ID if available
            github_user_id: githubUser.id.toString(),
            access_token: token,
            created_at: new Date().toISOString(),
          })
          .select('id');
        
        if (tokenError) {
          throw new Error(`Failed to store GitHub token: ${tokenError.message}`);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: githubUser.id,
              login: githubUser.login,
              name: githubUser.name,
              email: githubUser.email,
              avatar_url: githubUser.avatar_url,
            },
            token_id: tokenInsertResult && tokenInsertResult.length > 0 ? tokenInsertResult[0].id : null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error storing GitHub token:', error);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Get user organizations
    else if (action === 'get-orgs') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      
      // Authenticate the user with Supabase
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'User not authenticated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      
      // Get the GitHub token from our secure table
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('github_access_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: 'GitHub token not found. Please reconnect your GitHub account.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      // Check if token is expired and refresh if needed
      const now = Math.floor(Date.now() / 1000);
      let accessToken = tokenData.access_token;
      
      if (tokenData.expires_at && tokenData.expires_at < now && tokenData.refresh_token) {
        try {
          const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              client_id: GITHUB_CLIENT_ID,
              client_secret: GITHUB_CLIENT_SECRET,
              refresh_token: tokenData.refresh_token,
              grant_type: 'refresh_token',
            }),
          });
          
          if (response.ok) {
            const refreshData: GitHubTokenResponse = await response.json();
            accessToken = refreshData.access_token;
            
            // Update token in database
            await supabaseClient
              .from('github_access_tokens')
              .upsert({
                user_id: user.id,
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token || tokenData.refresh_token,
                expires_in: refreshData.expires_in,
                expires_at: refreshData.expires_in 
                  ? Math.floor(Date.now() / 1000) + refreshData.expires_in 
                  : null,
                scope: refreshData.scope,
                created_at: new Date().toISOString(),
              });
          } else {
            console.error('Token refresh failed:', await response.text());
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
        }
      }
      
      // Get GitHub organizations with the token
      try {
        const orgs = await getGitHubOrgs(accessToken);
        return new Response(
          JSON.stringify(orgs),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Unknown action
    else {
      return new Response(
        JSON.stringify({ error: 'Unknown action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
  } catch (err) {
    console.error('Server error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
