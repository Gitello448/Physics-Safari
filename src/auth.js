// Phase 1: authentication only. No park/credits data is read from or
// written to Supabase yet — this just manages the account/session and makes
// sure a fresh player_profile/player_save row exists once someone logs in.
import { supabase } from './supabaseClient.js';

export function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => callback(session));
  supabase.auth.getSession().then(({ data }) => callback(data.session));
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data; // data.session is null if email confirmation is required
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Idempotent: inserts default rows only if they don't already exist, so
// logging in repeatedly never resets an existing player's data.
export async function ensurePlayerRows(userId) {
  await supabase.from('player_profile').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  await supabase.from('player_save').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
}

// Phase 2: the actual cloud save. RLS restricts both of these to the
// caller's own row (auth.uid() = user_id), so this never needs to trust
// the passed-in userId for security — it's just used to target the query.
export async function fetchCloudSave(userId) {
  const { data, error } = await supabase
    .from('player_save')
    .select('credits, research_points, park_state, curriculum_state')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function writeCloudSave(userId, { credits, researchPoints, parkState, curriculumState }) {
  const { error } = await supabase
    .from('player_save')
    .update({
      credits,
      research_points: researchPoints,
      park_state: parkState,
      curriculum_state: curriculumState,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// Phase 3: developer role. There is deliberately no writeUserRole — nothing
// in the app can ever set or change a role. RLS only grants SELECT on this
// column to the row's own owner; the only way it's ever set is you running
// SQL directly against Supabase. Defaults to 'player' if the row/column
// somehow isn't there yet, so a fetch failure never accidentally grants
// developer access.
export async function fetchUserRole(userId) {
  const { data, error } = await supabase
    .from('player_profile')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data && data.role) || 'player';
}
