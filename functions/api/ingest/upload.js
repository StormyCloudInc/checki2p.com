const OK_METHODS = new Set(['POST']);

export async function onRequest(context) {
  const { request, env } = context;
  if (!OK_METHODS.has(request.method)) {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = tokenMatch ? tokenMatch[1].trim() : null;
  if (!env.API_KEY || !token || token !== env.API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const hostname = (formData.get('hostname') || formData.get('server') || '').toString().trim();
  const file = formData.get('file');

  if (!hostname) {
    return new Response(JSON.stringify({ error: 'hostname is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'file is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = `${hostname.replace(/\./g, '_')}.su3`;
  const metadata = {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
    },
  };

  await env.SU3_BUCKET.put(key, file.stream(), metadata);

  return new Response(JSON.stringify({ success: true, key }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
