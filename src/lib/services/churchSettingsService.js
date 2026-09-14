import { api } from "../../../convex/_generated/api.js";
import { getConvexHttpClient, isDemoMode, unavailableError } from "$lib/convex.js";

export async function get() {
  const client = getConvexHttpClient();
  if (!client) {
    return isDemoMode() ? { data: null, error: null } : { data: null, error: unavailableError() };
  }
  try {
    return { data: await client.query(api.churchSettings.get), error: null };
  } catch (error) {
    return { data: null, error };
  }
}
