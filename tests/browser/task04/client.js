import { getFunctionName } from 'convex/server';
export async function request(payload) {
  const response = await fetch('/__task04', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}
const client = Object.fromEntries(['query','mutation'].map(kind => [kind, (fn, args) => request({kind, name:getFunctionName(fn), args})]));
export const getConvexHttpClient = () => client;
// The fixture exercises one-shot requests. Export the subscription shape too
// so the production CRM module can be bundled by Vite without attaching a
// long-lived test listener.
export const getConvexClient = async () => ({ onUpdate: () => () => {} });
export const isDemoMode = () => false;
export const isConvexConfigured = () => true;
export const getDataSource = () => 'convex';
export const unavailableError = () => new Error('Fixture unavailable');
