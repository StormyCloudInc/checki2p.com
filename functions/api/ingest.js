const OFFLINE_STATUSES = new Set(['offline', 'error']);
const NOTIFICATION_COOLDOWN_HOURS = 24;

function hoursToMs(hours) {
  return hours * 60 * 60 * 1000;
}

function normalizeServer(raw = {}) {
  const hostname = String(raw.hostname || raw.server_name || '').trim();
  if (!hostname) {
    throw new Error('Missing hostname');
  }

  return {
    server_name: hostname,
    status: String(raw.status || 'unknown').toLowerCase(),
    status_message: String(raw.message || raw.status_message || '').trim(),
    router_infos: Number.isFinite(Number(raw.router_infos)) ? Number(raw.router_infos) : 0,
    last_checked: raw.last_check || raw.last_checked || new Date().toISOString(),
  };
}

async function fetchExistingServer(env, hostname) {
  return env.DB.prepare('SELECT * FROM server_status WHERE server_name = ?')
    .bind(hostname)
    .first();
}

async function sendOfflineNotification(env, server, offlineHours, operatorEmail) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.NOTIFICATION_FROM || 'CheckI2P <notifications@checki2p.com>';
  const rawTo = operatorEmail || env.NOTIFICATION_EMAIL;
  if (!apiKey || !rawTo) {
    return false;
  }

  const to = rawTo.includes(',') ? rawTo.split(',').map(e => e.trim()) : rawTo;
  const replyTo = env.NOTIFICATION_REPLY_TO || null;

  const subject = `[CheckI2P] ${server.server_name} offline for ${offlineHours}h`;
  const text = `Server ${server.server_name} has been offline for ${offlineHours} hours.\n`
    + `Status message: ${server.status_message || 'No details provided.'}`;

  const emailPayload = { from, to, subject, text };
  if (replyTo) emailPayload.reply_to = replyTo;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    console.error('Resend request failed', await response.text());
    return false;
  }

  return true;
}

function shouldSendNotification({
  server,
  firstOffline,
  lastNotification,
  thresholdHours,
}) {
  if (!server || !firstOffline || !OFFLINE_STATUSES.has(server.status)) {
    return { shouldNotify: false, offlineHours: 0 };
  }

  const firstOfflineTime = Date.parse(firstOffline);
  if (Number.isNaN(firstOfflineTime)) {
    return { shouldNotify: false, offlineHours: 0 };
  }

  const offlineHours = Math.floor((Date.now() - firstOfflineTime) / hoursToMs(1));
  if (offlineHours < thresholdHours) {
    return { shouldNotify: false, offlineHours };
  }

  if (!lastNotification) {
    return { shouldNotify: true, offlineHours };
  }

  const lastNotificationTime = Date.parse(lastNotification);
  if (Number.isNaN(lastNotificationTime)) {
    return { shouldNotify: true, offlineHours };
  }

  const withinCooldown = (Date.now() - lastNotificationTime) < hoursToMs(NOTIFICATION_COOLDOWN_HOURS);
  return { shouldNotify: !withinCooldown, offlineHours };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
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

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const serverList = Array.isArray(payload?.servers)
    ? payload.servers
    : Array.isArray(payload)
    ? payload
    : [];
  if (!serverList.length) {
    return new Response(JSON.stringify({ error: 'No servers provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const thresholdHours = Number(env.OFFLINE_THRESHOLD_HOURS || 12);
  let updated = 0;
  const errors = [];

  for (const entry of serverList) {
    let normalized;
    try {
      normalized = normalizeServer(entry);
    } catch (error) {
      errors.push(error.message);
      continue;
    }

    try {
      const existing = await fetchExistingServer(env, normalized.server_name);
      let firstOffline = existing?.first_offline || null;
      let lastNotification = existing?.last_notification_sent || null;

      if (OFFLINE_STATUSES.has(normalized.status)) {
        firstOffline = firstOffline || normalized.last_checked;
      } else {
        firstOffline = null;
        lastNotification = existing?.last_notification_sent || null;
      }

      let notificationSent = false;
      const notificationState = shouldSendNotification({
        server: normalized,
        firstOffline,
        lastNotification,
        thresholdHours,
      });

      if (notificationState.shouldNotify) {
        notificationSent = await sendOfflineNotification(
          env,
          normalized,
          notificationState.offlineHours,
          existing?.operator_email
        );
        if (notificationSent) {
          lastNotification = new Date().toISOString();
        }
      }

      const notificationTimestamp = notificationSent
        ? lastNotification
        : existing?.last_notification_sent || null;

      const statement = env.DB.prepare(`
        INSERT INTO server_status (
          server_name,
          status,
          status_message,
          router_infos,
          last_checked,
          first_offline,
          last_notification_sent,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(server_name) DO UPDATE SET
          status = excluded.status,
          status_message = excluded.status_message,
          router_infos = excluded.router_infos,
          last_checked = excluded.last_checked,
          first_offline = excluded.first_offline,
          last_notification_sent = excluded.last_notification_sent,
          updated_at = datetime('now')
      `).bind(
        normalized.server_name,
        normalized.status,
        normalized.status_message,
        normalized.router_infos,
        normalized.last_checked,
        firstOffline,
        notificationTimestamp
      );

      await statement.run();
      updated += 1;
    } catch (error) {
      console.error('Failed to ingest server', normalized?.server_name, error);
      errors.push(`Failed to update ${normalized?.server_name}: ${error.message}`);
    }
  }

  const status = errors.length ? 207 : 200;
  return new Response(JSON.stringify({ success: errors.length === 0, updated, errors }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
