import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('activity_date', { ascending: false });
  return { data, error };
}

export async function getById(id) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function create(activityData) {
  const { data, error } = await supabase
    .from('activities')
    .insert([activityData])
    .select()
    .single();
  return { data, error };
}

export async function getByType(activityType) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('activity_type', activityType)
    .order('activity_date', { ascending: false });
  return { data, error };
}

export async function getByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .gte('activity_date', startDate)
    .lte('activity_date', endDate)
    .order('activity_date', { ascending: false });
  return { data, error };
}

export async function getRecent(limit = 10) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('activity_date', { ascending: false })
    .limit(limit);
  return { data, error };
}