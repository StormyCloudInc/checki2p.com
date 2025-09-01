const crypto = require('crypto');

exports.handler = async (event, context) => {
  // Get the visitor's IP from Netlify context
  const userIP = event.headers['x-nf-client-connection-ip'] || 
                 event.headers['x-forwarded-for']?.split(',')[0] || 
                 'unknown';
  
  // Get salt from environment
  const SALT = process.env.PROXY_SALT || 'default-salt-change-this';
  
  // Hash the visitor's IP
  const hashedVisitorIP = crypto.createHash('sha256').update(userIP + SALT).digest('hex');
  
  // Check against proxy hashes in environment variables
  const proxyData = [
    { hash: process.env.PROXY_HASH_1, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_2, name: 'exit.stormycloud.i2p', location: 'Los Angeles, CA, USA' },
    { hash: process.env.PROXY_HASH_3, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_4, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_5, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_6, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_7, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_8, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_9, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_10, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_11, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_12, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_13, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA' },
    { hash: process.env.PROXY_HASH_14, name: 'outproxy.acetone.i2p', location: 'Naaldwijk, Netherlands' },
    { hash: process.env.PROXY_HASH_15, name: 'purokishi.i2p', location: 'Dallas, Texas, USA' },
    { hash: process.env.PROXY_HASH_16, name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands' },
    { hash: process.env.PROXY_HASH_17, name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands' },
    { hash: process.env.PROXY_HASH_18, name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands' },
  ].filter(p => p.hash);
  
  // Find matching proxy
  const matchedProxy = proxyData.find(proxy => proxy.hash === hashedVisitorIP);
  
  // Build response matching original PHP API structure
  const response = {
    isOutProxy: !!matchedProxy,
    IP: userIP
  };
  
  if (matchedProxy) {
    response.proxyName = matchedProxy.name;
    response.proxyLocation = matchedProxy.location;
  }
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    body: JSON.stringify(response)
  };
};