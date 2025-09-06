const sdk = require('node-appwrite');

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Appwrite configuration from environment variables
  const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_DATABASE_API_KEY = process.env.APPWRITE_DATABASE_API_KEY;
  const APPWRITE_STORAGE_API_KEY = process.env.APPWRITE_STORAGE_API_KEY;
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
  const STORAGE_BUCKET_ID = process.env.APPWRITE_STORAGE_BUCKET_ID;

  // Validate required environment variables
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_DATABASE_API_KEY || !DATABASE_ID) {
    console.error('Missing required Appwrite environment variables');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Server configuration error',
        message: 'Missing required environment variables for Appwrite'
      })
    };
  }
  const COLLECTION_ID = 'reseed_servers';

  // Initialize Appwrite client with database API key
  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_DATABASE_API_KEY);

  const databases = new sdk.Databases(client);

  try {
    // Optional filter by server (hostname)
    const qs = event.queryStringParameters || {};
    const filterHost = (qs.server || qs.hostname || '').trim();
    // Query for server statuses (optionally filter by hostname)
    const queries = [sdk.Query.limit(100)];
    if (filterHost) {
      queries.push(sdk.Query.equal('hostname', filterHost));
    } else {
      queries.push(sdk.Query.orderAsc('hostname'));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      queries
    );

    // Transform the data for frontend consumption
    const servers = response.documents.map(doc => {
      // Special case: reseed.diva.exchange is always online
      if (doc.hostname === 'reseed.diva.exchange') {
        return {
          server_name: doc.hostname,
          status: 'online',
          status_message: 'Success',
          last_checked: doc.last_check,
          router_infos: doc.router_infos || 0,
          offline_duration: null
        };
      }

      // Calculate offline duration if server is offline and has first_offline
      let offlineDuration = null;
      if (doc.status === 'offline' && doc.first_offline) {
        const firstOfflineTime = new Date(doc.first_offline).getTime();
        const currentTime = Date.now();
        const durationSeconds = Math.floor((currentTime - firstOfflineTime) / 1000);
        offlineDuration = formatDuration(durationSeconds);
      }

      // Determine the display status based on the message and status
      let displayStatus = mapAppwriteStatusToLegacy(doc.status, doc.message);

      // Generate download URL if server is online and storage is configured
      let download_url = null;
      if (displayStatus === 'online' && STORAGE_BUCKET_ID && APPWRITE_STORAGE_API_KEY) {
        const fileId = doc.hostname.replace(/\./g, '_') + '_su3';
        // Note: Download URLs don't require API key in the URL, they use project ID for public access
        download_url = `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}`;
      }

      return {
        server_name: doc.hostname,
        status: displayStatus,
        status_message: doc.message || '',
        last_checked: doc.last_check,
        router_infos: doc.router_infos || 0,
        offline_duration: offlineDuration,
        download_url: download_url
      };
    });

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
        count: servers.length,
        backend: 'appwrite' // Add this to identify which backend is being used
      })
    };

  } catch (error) {
    console.error('Appwrite error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch server status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        backend: 'appwrite'
      })
    };
  }
};

// Map Appwrite status values to the legacy format expected by frontend
function mapAppwriteStatusToLegacy(status, message) {
  // Check message for specific patterns
  if (message) {
    // Status code -1 or 500 = offline
    if (message.includes('Status code -1') || message.includes('Status code 500')) {
      return 'offline';
    }
    
    // su3 file too old = warning
    if (message.includes('su3 file too old')) {
      return 'warning';
    }
    
    // Old RouterInfos are now considered online
    if (message.includes('old RouterInfos returned')) {
      return 'online';
    }
  }
  
  // Default mapping based on status
  switch(status) {
    case 'online':
      return 'online';
    case 'offline':
      return 'offline';
    case 'warning':
      return 'warning';
    case 'outdated':
      return 'warning';
    case 'error':
      return 'offline';
    default:
      return 'offline';
  }
}

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