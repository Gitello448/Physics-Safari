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
