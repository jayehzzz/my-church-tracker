import { api } from '../../../convex/_generated/api.js';
import { getConvexHttpClient, isDemoMode, unavailableError } from '$lib/convex.js';

const storageKey = 'church-tracker-demo-sunday-template';
export async function get() {
  try {
    if (isDemoMode()) return { data: JSON.parse(localStorage.getItem(storageKey) || 'null'), error: null };
    const client = getConvexHttpClient();
    if (!client) throw unavailableError();
    return { data: await client.query(api.serviceTemplates.get, {}), error: null };
  } catch (error) { return { data: null, error }; }
}
export async function save(data) {
  try {
    if (isDemoMode()) { localStorage.setItem(storageKey, JSON.stringify(data)); return { data, error: null }; }
    const client = getConvexHttpClient();
    if (!client) throw unavailableError();
    return { data: await client.mutation(api.serviceTemplates.save, data), error: null };
  } catch (error) { return { data: null, error }; }
}
