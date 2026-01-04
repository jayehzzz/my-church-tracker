import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('service_date', { ascending: false });
  return { data, error };
}

export async function getById(id) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function create(serviceData) {
  const { data, error } = await supabase
    .from('services')
    .insert([serviceData])
    .select()
    .single();
  return { data, error };
}

export async function update(id, serviceData) {
  const { data, error } = await supabase
    .from('services')
    .update({ ...serviceData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function remove(id) {
  const { error } = await supabase.from('services').delete().eq('id', id);
  return { error };
}

export async function getByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .gte('service_date', startDate)
    .lte('service_date', endDate)
    .order('service_date', { ascending: false });
  return { data, error };
}