import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, people(*), services(*)')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function getById(id) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, people(*), services(*)')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function create(attendanceData) {
  const { data, error } = await supabase
    .from('attendance')
    .insert([attendanceData])
    .select()
    .single();
  return { data, error };
}

export async function update(id, attendanceData) {
  const { data, error } = await supabase
    .from('attendance')
    .update({ ...attendanceData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function remove(id) {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  return { error };
}

export async function getByService(serviceId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, people(*)')
    .eq('service_id', serviceId);
  return { data, error };
}

export async function getByPerson(personId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, services(*)')
    .eq('person_id', personId)
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function bulkCreate(records) {
  const { data, error } = await supabase
    .from('attendance')
    .insert(records)
    .select();
  return { data, error };
}

export async function syncAttendance(serviceId, personIds) {
  // 1. Get existing attendance
  const { data: existing, error: fetchError } = await supabase
    .from('attendance')
    .select('person_id')
    .eq('service_id', serviceId);

  if (fetchError) return { error: fetchError };

  const existingIds = new Set(existing.map(r => r.person_id));
  const newIds = new Set(personIds);

  // 2. Identify additions and removals
  const toAdd = [...newIds].filter(id => !existingIds.has(id));
  const toRemove = [...existingIds].filter(id => !newIds.has(id));

  // 3. Perform updates
  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from('attendance')
      .delete()
      .eq('service_id', serviceId)
      .in('person_id', toRemove);

    if (removeError) return { error: removeError };
  }

  if (toAdd.length > 0) {
    const records = toAdd.map(personId => ({
      service_id: serviceId,
      person_id: personId
    }));

    const { error: addError } = await supabase
      .from('attendance')
      .insert(records);

    if (addError) return { error: addError };
  }

  return { success: true };
}