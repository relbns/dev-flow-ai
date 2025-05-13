import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-supabase-users-by-github-logins function initializing");

interface RequestPayload {
  github_logins: string[];
}

// Helper to create a Supabase client with service_role_key for admin operations
function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
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
    // Validate user JWT: The user calling this function should be authenticated.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not authenticated or token invalid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    console.log(`Function called by authenticated user: ${user.id}`);

    // Get GitHub logins from request body
    const payload: RequestPayload = await req.json();
    if (!payload.github_logins || !Array.isArray(payload.github_logins) || payload.github_logins.length === 0) {
      return new Response(JSON.stringify({ error: 'github_logins array is required in the request body and cannot be empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const githubLogins = payload.github_logins.map(login => login.toLowerCase()); // Normalize to lowercase for case-insensitive matching

    const supabaseAdminClient = createAdminClient();

    // Query auth.users table
    // We assume GitHub login is stored in raw_user_meta_data.user_name.
    // Supabase stores JSON, so direct querying of raw_user_meta_data for a specific key can be tricky.
    // A common approach is to fetch users and filter in code, or use a SQL function if performance is critical.
    // For simplicity here, let's fetch users who have a github provider and then filter.
    // A more optimized query would be:
    // .ilike('raw_user_meta_data->>user_name', login) OR .ilike('raw_user_meta_data->>preferred_username', login)
    // However, Supabase JS client might not directly support JSONB operators like ->> in .filter() in a straightforward way for all cases.
    // Let's try a broader fetch and filter, or use a specific query if possible.

    // Fetch all users and their metadata (can be inefficient for many users)
    // A better approach would be to use a SQL function or more targeted query if Supabase allows.
    // For now, let's assume we can query based on the identity data if available.

    // Attempt to query users whose raw_user_meta_data->>'user_name' is in the list of githubLogins.
    // This requires knowing the exact path and that the value is a string.
    // Supabase stores raw_user_meta_data as JSON.
    // The `identities` array in `auth.users` is more reliable for provider-specific user IDs.
    // Each identity has `provider` and `identity_data.sub` (GitHub numeric ID) or `identity_data.user_name`.

    const { data: usersWithIdentities, error: usersError } = await supabaseAdminClient
      .from('users') // Accessing auth.users table
      .select('id, email, raw_user_meta_data, identities'); // Select necessary fields

    if (usersError) {
      console.error("Error fetching users from auth.users:", usersError);
      throw usersError;
    }

    const matchedSupabaseUsers = [];
    if (usersWithIdentities) {
      for (const u of usersWithIdentities) {
        if (u.identities && Array.isArray(u.identities)) {
          for (const identity of u.identities) {
            if (identity.provider === 'github' && identity.identity_data) {
              // Check against GitHub login (user_name) from identity_data
              const githubIdentityUserName = identity.identity_data.user_name?.toLowerCase();
              if (githubIdentityUserName && githubLogins.includes(githubIdentityUserName)) {
                // Try to get a display name from raw_user_meta_data or profiles table
                let displayName = u.raw_user_meta_data?.full_name || u.raw_user_meta_data?.name || u.raw_user_meta_data?.user_name || u.email;
                
                // Optional: Try to fetch from a 'profiles' table for a better display name
                try {
                    const { data: profile, error: profileError } = await supabaseAdminClient
                        .from('profiles')
                        .select('full_name, username') // Adjust columns as needed
                        .eq('id', u.id)
                        .single();
                    if (!profileError && profile) {
                        displayName = profile.full_name || profile.username || displayName;
                    }
                } catch (profileQueryError) {
                    console.warn(`Could not query profiles table for user ${u.id}: ${profileQueryError.message}`);
                }

                matchedSupabaseUsers.push({
                  id: u.id, // Supabase user UUID
                  display_name: displayName,
                  github_login: identity.identity_data.user_name // Include original GitHub login for reference
                });
                break; // Found a match for this Supabase user, move to the next one
              }
            }
          }
        }
      }
    }
    
    // Deduplicate based on Supabase user ID, in case a user somehow matched multiple times (shouldn't happen with break)
    const uniqueMatchedUsers = Array.from(new Map(matchedSupabaseUsers.map(user => [user.id, user])).values());

    console.log(`Found ${uniqueMatchedUsers.length} Supabase users matching the provided GitHub logins.`);

    return new Response(JSON.stringify(uniqueMatchedUsers), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (err) {
    console.error("Overall error in get-supabase-users-by-github-logins function:", err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to process request' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

// To deploy: supabase functions deploy get-supabase-users-by-github-logins --project-ref <your-project-ref> --no-verify-jwt (if called by gateway)
// or without --no-verify-jwt if called directly by authenticated user.
