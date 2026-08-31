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

// A reasonable, deterministic starting display name so a fresh account has
// something other than a raw email showing up publicly (leaderboard, and
// friends later) — the player can change it any time from the leaderboard.
function defaultDisplayName(email) {
  const local = (email || '').split('@')[0] || 'Player';
  const cleaned = local.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
  return cleaned || 'Player';
}

// Idempotent: inserts default rows only if they don't already exist, so
// logging in repeatedly never resets an existing player's data.
export async function ensurePlayerRows(userId, email) {
  await supabase.from('player_profile').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  await supabase.from('player_save').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  await supabase.from('public_profiles').upsert(
    { user_id: userId, display_name: defaultDisplayName(email) },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );
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

// Phase 4: Character Lab prototypes. RLS on character_prototypes only lets
// a 'developer'-role account insert/update/delete rows at all, so this
// never needs its own client-side role check to be safe — a non-developer
// account's writes are rejected by the database regardless of what the UI
// does or doesn't show.
export async function fetchPrototypes(userId) {
  const { data, error } = await supabase
    .from('character_prototypes')
    .select('id, name, template, frames, status, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function savePrototype(userId, { id, name, template, frames, status }) {
  const row = { user_id: userId, name, template, frames, status: status || 'draft', updated_at: new Date().toISOString() };
  if (id) row.id = id;
  const { data, error } = await supabase
    .from('character_prototypes')
    .upsert(row, { onConflict: 'id' })
    .select('id, name, template, frames, status, created_at, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deletePrototype(id) {
  const { error } = await supabase.from('character_prototypes').delete().eq('id', id);
  if (error) throw error;
}

// Phase 5: leaderboard. `leaderboard` is a view (not a table) that computes
// a score from curriculum_state and joins in the public display name,
// without exposing anyone's park, credits, or raw per-skill data to other
// players — see the SQL comment on the view itself. Publicly readable.
export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('user_id, display_name, skills_mastered')
    .order('skills_mastered', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function setDisplayName(userId, name) {
  const { error } = await supabase
    .from('public_profiles')
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}
