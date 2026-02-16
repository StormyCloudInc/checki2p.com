function mapStatus(status, message = '') {
  if (message.includes('Status code -1') || message.includes('Status code 500')) {
    return 'offline';
  }
  if (message.includes('su3 file too old')) {
    return 'warning';
  }
  if (message.includes('old RouterInfos returned')) {
    return 'online';
  }

  switch ((status || '').toLowerCase()) {
    case 'online':
      return 'online';
    case 'warning':
    case 'outdated':
      return 'warning';
    case 'offline':
    case 'error':
    default:
      return 'offline';
  }
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return parts.join(', ') || 'Just now';
}

function getDownloadUrl(request, hostname) {
  if (!hostname) return null;
  const key = `${hostname.replace(/\./g, '_')}.su3`;
  const origin = new URL(request.url).origin;
  return `${origin}/api/download/${key}`;
}

async function queryServerStatus(env, filterHost) {
  let statement = 'SELECT * FROM server_status';
  const params = [];
  if (filterHost) {
    statement += ' WHERE server_name = ?';
    params.push(filterHost);
  }
  statement += ' ORDER BY server_name ASC';

  let prepared = env.DB.prepare(statement);
  if (params.length) {
    prepared = prepared.bind(...params);
  }
  const { results = [] } = await prepared.all();
  return results;
}

export async function getReseedStatusResponse(env, request, hostnameFilter) {
  try {
    const serversRaw = await queryServerStatus(env, hostnameFilter);
    const payload = [];
    let latest = null;

    for (const row of serversRaw) {
      const status = mapStatus(row.status, row.status_message);
      const lastChecked = row.last_checked || row.updated_at || row.created_at;
      if (lastChecked) {
        const ts = new Date(lastChecked).getTime();
        if (!Number.isNaN(ts)) {
          latest = Math.max(latest ?? ts, ts);
        }
      }

      let offlineDuration = null;
      if (status === 'offline' && row.first_offline) {
        const firstOfflineTs = new Date(row.first_offline).getTime();
        if (!Number.isNaN(firstOfflineTs)) {
          const seconds = Math.floor((Date.now() - firstOfflineTs) / 1000);
          offlineDuration = formatDuration(seconds);
        }
      }

      let downloadUrl = null;
      if (status === 'online') {
        downloadUrl = getDownloadUrl(request, row.server_name);
      }

      payload.push({
        server_name: row.server_name,
        status,
        status_message: row.status_message || '',
        last_checked: lastChecked,
        router_infos: row.router_infos ?? 0,
        offline_duration: offlineDuration,
        download_url: downloadUrl,
      });
    }

    const responseBody = {
      servers: payload,
      last_checked: latest ? new Date(latest).toISOString() : null,
      count: payload.length,
      backend: 'cloudflare',
    };

    return new Response(JSON.stringify(responseBody), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('reseed-status error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch reseed status',
      backend: 'cloudflare',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const filter = (url.searchParams.get('server') || url.searchParams.get('hostname') || '').trim();
  return getReseedStatusResponse(env, request, filter || null);
}
