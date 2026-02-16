export async function onRequest(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  const authHeader = request.headers.get('Authorization') || '';
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = tokenMatch ? tokenMatch[1].trim() : null;
  if (!env.API_KEY || !token || token !== env.API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT server_name, operator_email FROM server_status WHERE operator_email IS NOT NULL ORDER BY server_name'
    ).all();
    return new Response(JSON.stringify({ servers: rows.results }), { headers });
  }

  if (request.method === 'PUT') {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
    }

    const updates = Array.isArray(body) ? body : body.servers || [];
    if (!updates.length) {
      return new Response(JSON.stringify({ error: 'No updates provided' }), { status: 400, headers });
    }

    let updated = 0;
    const errors = [];

    for (const entry of updates) {
      const hostname = String(entry.server_name || entry.hostname || '').trim();
      const email = entry.operator_email === null ? null : String(entry.operator_email || '').trim() || null;

      if (!hostname) {
        errors.push('Missing hostname in entry');
        continue;
      }

      try {
        await env.DB.prepare(
          'UPDATE server_status SET operator_email = ?, updated_at = datetime(\'now\') WHERE server_name = ?'
        ).bind(email, hostname).run();
        updated++;
      } catch (err) {
        errors.push(`Failed to update ${hostname}: ${err.message}`);
      }
    }

    const status = errors.length ? 207 : 200;
    return new Response(JSON.stringify({ updated, errors }), { status, headers });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}
