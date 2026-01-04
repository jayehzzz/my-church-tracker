import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, leader:leader_id(*)')
    .order('meeting_date', { ascending: false });
  return { data, error };
}

export async function getById(id) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, leader:leader_id(*)')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function create(meetingData) {
  const { data, error } = await supabase
    .from('meetings')
    .insert([meetingData])
    .select()
    .single();
  return { data, error };
}

export async function update(id, meetingData) {
  const { data, error } = await supabase
    .from('meetings')
    .update({ ...meetingData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function remove(id) {
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  return { error };
}

export async function getByType(meetingType) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, leader:leader_id(*)')
    .eq('meeting_type', meetingType)
    .order('meeting_date', { ascending: false });
  return { data, error };
}

export async function getByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, leader:leader_id(*)')
    .gte('meeting_date', startDate)
    .lte('meeting_date', endDate)
    .order('meeting_date', { ascending: false });
  return { data, error };
}

export async function addAttendee(meetingId, personId) {
  const { data, error } = await supabase
    .from('meeting_attendance')
    .insert([{ meeting_id: meetingId, person_id: personId }])
    .select()
    .single();
  return { data, error };
}

export async function getAttendees(meetingId) {
  const { data, error } = await supabase
    .from('meeting_attendance')
    .select('*, people(*)')
    .eq('meeting_id', meetingId);
  return { data, error };
}