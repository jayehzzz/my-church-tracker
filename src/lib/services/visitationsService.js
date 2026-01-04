import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('visitations')
    .select('*, people(*)')
    .order('visit_date', { ascending: false });
  return { data, error };
}

export async function getById(id) {
  const { data, error } = await supabase
    .from('visitations')
    .select('*, people(*)')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function create(visitationData) {
  const { data, error } = await supabase
    .from('visitations')
    .insert([visitationData])
    .select()
    .single();
  return { data, error };
}

export async function update(id, visitationData) {
  const { data, error } = await supabase
    .from('visitations')
    .update({ ...visitationData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function remove(id) {
  const { error } = await supabase.from('visitations').delete().eq('id', id);
  return { error };
}

export async function getByPerson(personId) {
  const { data, error } = await supabase
    .from('visitations')
    .select('*')
    .eq('person_id', personId)
    .order('visit_date', { ascending: false });
  return { data, error };
}

export async function getRequiringFollowUp() {
  const { data, error } = await supabase
    .from('visitations')
    .select('*, people(*)')
    .eq('follow_up_required', true)
    .order('follow_up_date', { ascending: true });
  return { data, error };
}

export async function getByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('visitations')
    .select('*, people(*)')
    .gte('visit_date', startDate)
    .lte('visit_date', endDate)
    .order('visit_date', { ascending: false });
  return { data, error };
}