import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .order('last_name', { ascending: true });
  return { data, error };
}

export async function getById(id) {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function create(personData) {
  const { data, error } = await supabase
    .from('people')
    .insert([personData])
    .select()
    .single();
  return { data, error };
}

export async function update(id, personData) {
  const { data, error } = await supabase
    .from('people')
    .update({ ...personData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function remove(id) {
  const { error } = await supabase.from('people').delete().eq('id', id);
  return { error };
}

export async function getByStatus(status) {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('member_status', status)
    .order('last_name', { ascending: true });
  return { data, error };
}

export async function search(searchTerm) {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
    .order('last_name', { ascending: true });
  return { data, error };
}