import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("add-project-member function initializing");

interface AddMemberPayload {
  project_id: string;
  role: string;
  user_id?: string; // DevFlow AI user ID
  github_user_id?: number;
  github_username?: string;
  name_override?: string;
  avatar_url_override?: string;
}

const ROLES = ['Project Lead', 'Developer', 'Designer', 'QA', 'Stakeholder', 'Viewer'];

async function verifyProjectOwner(supabase: SupabaseClient, projectId: string, userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  if (error || !data) throw new Error('Project not found or caller is not the owner.');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated or token invalid.');

    const payload: AddMemberPayload = await req.json();
    if (!payload.project_id || !payload.role) {
      throw new Error('project_id and role are required.');
    }
    if (!ROLES.includes(payload.role)) {
      throw new Error(`Invalid role. Must be one of: ${ROLES.join(', ')}`);
    }
    if (!payload.user_id && !payload.github_username) {
      throw new Error('Either user_id or github_username must be provided.');
    }

    await verifyProjectOwner(supabase, payload.project_id, user.id);

    // Check for existing member to prevent duplicates
    let query = supabase.from('project_members')
      .select('id')
      .eq('project_id', payload.project_id);

    if (payload.user_id) {
      query = query.eq('user_id', payload.user_id);
    } else if (payload.github_username) {
      // If adding by github_username, ensure no existing member with that github_username
      query = query.eq('github_username', payload.github_username);
    }
    
    const { data: existingMember, error: existingError } = await query.maybeSingle();
    if (existingError) throw existingError;
    if (existingMember) {
      return new Response(JSON.stringify({ error: 'This user is already a member of the project.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409, // Conflict
      });
    }

    // If adding a Project Lead, ensure there isn't one already (simple check)
    if (payload.role === 'Project Lead') {
      const { data: existingLead, error: leadError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', payload.project_id)
        .eq('role', 'Project Lead')
        .maybeSingle();
      if (leadError) throw leadError;
      if (existingLead) {
        throw new Error('Project already has a Project Lead. Please change the existing lead first.');
      }
    }

    const memberDataToInsert = {
      project_id: payload.project_id,
      role: payload.role,
      user_id: payload.user_id || null,
      github_user_id: payload.github_user_id || null,
      github_username: payload.github_username || null,
      name_override: payload.name_override || null,
      avatar_url_override: payload.avatar_url_override || null,
    };

    const { data: newMember, error: insertError } = await supabase
      .from('project_members')
      .insert(memberDataToInsert)
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify(newMember), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
    });

  } catch (err) {
    console.error("Error in add-project-member:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: err.message.includes('not found or caller is not the owner') ? 403 : 
              err.message.includes('already has a Project Lead') ? 409 : 
              err.message.includes('required') || err.message.includes('Invalid role') ? 400 : 500,
    });
  }
});
