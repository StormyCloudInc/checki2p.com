export async function onRequest(context) {
  const { env, params } = context;
  const key = (params.key || '').trim();

  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.SU3_BUCKET.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${key}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
