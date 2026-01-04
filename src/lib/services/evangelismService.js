import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('evangelism_contacts')
    .select('*, contacted_by_person:contacted_by(*)')
    .order('contact_date', { ascending: false });
  return { data, error };
}

export async function getById(id) {
  const { data, error } = await supabase
    .from('evangelism_contacts')
    .select('*, contacted_by_person:contacted_by(*)')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function create(contactData) {
  const { data, error } = await supabase
    .from('evangelism_contacts')
    .insert([contactData])
    .select()
    .single();
  return { data, error };
}

export async function update(id, contactData) {
  const { data, error } = await supabase
    .from('evangelism_contacts')
    .update({ ...contactData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function remove(id) {
  const { error } = await supabase.from('evangelism_contacts').delete().eq('id', id);
  return { error };
}

export async function getByResponse(response) {
  const { data, error } = await supabase
    .from('evangelism_contacts')
    .select('*, contacted_by_person:contacted_by(*)')
    .eq('response', response)
    .order('contact_date', { ascending: false });
  return { data, error };
}

export async function getRequiringFollowUp() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('evangelism_contacts')
    .select('*, contacted_by_person:contacted_by(*)')
    .not('follow_up_date', 'is', null)
    .lte('follow_up_date', today)
    .eq('converted', false)
    .order('follow_up_date', { ascending: true });
  return { data, error };
}

export async function getConverted() {
  const { data, error } = await supabase
    .from('evangelism_contacts')
    .select('*, contacted_by_person:contacted_by(*)')
    .eq('converted', true)
    .order('conversion_date', { ascending: false });
  return { data, error };
}

export async function getByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('evangelism_contacts')
    .select('*, contacted_by_person:contacted_by(*)')
    .gte('contact_date', startDate)
    .lte('contact_date', endDate)
    .order('contact_date', { ascending: false });
  return { data, error };
}

export async function markAsConverted(id, addToPeople = false) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: contact, error: fetchError } = await getById(id);
  if (fetchError || !contact) return { data: null, error: fetchError };
  
  let addedPersonId = null;
  
  if (addToPeople) {
    const { data: newPerson, error: personError } = await supabase
      .from('people')
      .insert([{
        first_name: contact.first_name,
        last_name: contact.last_name || '',
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        member_status: 'visitor'
      }])
      .select()
      .single();
    
    if (personError) return { data: null, error: personError };
    addedPersonId = newPerson.id;
  }
  
  const { data, error } = await supabase
    .from('evangelism_contacts')
    .update({
      converted: true,
      conversion_date: today,
      added_as_person_id: addedPersonId
    })
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
}