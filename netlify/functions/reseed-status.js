const { Client } = require('pg');

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Use the Netlify database URL
  const dbUrl = process.env.NETLIFY_DATABASE_URL;
  
  if (!dbUrl) {
    console.error('NETLIFY_DATABASE_URL not found in environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database configuration missing' })
    };
  }

  // Create database client
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect to database
    await client.connect();

    // Query for all server statuses
    const query = `
      SELECT 
        server_name,
        status,
        status_message,
        last_checked,
        first_offline,
        CASE 
          WHEN status = 'offline' AND first_offline IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (NOW() - first_offline))::INTEGER
          ELSE 0
        END as offline_duration_seconds
      FROM server_status
      ORDER BY server_name
    `;

    const result = await client.query(query);

    // Transform the data for frontend consumption
    const servers = result.rows.map(row => ({
      server_name: row.server_name,
      status: row.status,
      status_message: row.status_message || '',
      last_checked: row.last_checked,
      first_offline: row.first_offline,
      offline_duration: formatDuration(row.offline_duration_seconds)
    }));

    // Get the most recent check time
    const lastCheckedGlobal = servers.length > 0 
      ? Math.max(...servers.map(s => new Date(s.last_checked).getTime()))
      : null;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60' // Cache for 1 minute
      },
      body: JSON.stringify({
        servers: servers,
        last_checked: lastCheckedGlobal ? new Date(lastCheckedGlobal).toISOString() : null,
        count: servers.length
      })
    };

  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch server status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  } finally {
    await client.end();
  }
};

// Helper function to format duration
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  
  return parts.join(', ') || 'Just now';
}