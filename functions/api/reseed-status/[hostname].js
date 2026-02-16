import { getReseedStatusResponse } from '../reseed-status.js';

export async function onRequest(context) {
  const hostname = context.params?.hostname || '';
  return getReseedStatusResponse(context.env, context.request, hostname.trim() || null);
}
