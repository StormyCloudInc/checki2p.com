import { createHash } from 'crypto';

export default async (request, context) => {
  // Get the visitor's IP address
  const visitorIP = context.ip;
  
  // Get environment variables
  const env = Deno.env.toObject();
  const SALT = env.PROXY_SALT || 'default-salt-change-this';
  
  // Hash the visitor's IP
  const hashedVisitorIP = createHash('sha256').update(visitorIP + SALT).digest('hex');
  
  // Proxy data structure - hashes will be stored in environment variables
  const proxies = [
    // StormyCloud Houston
    { hash: env.PROXY_HASH_1, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_2, name: 'exit.stormycloud.i2p', location: 'Los Angeles, CA, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_3, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_4, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_5, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_6, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_7, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_8, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_9, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_10, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_11, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_12, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_13, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    // Acetone
    { hash: env.PROXY_HASH_14, name: 'outproxy.acetone.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    // Purokishi
    { hash: env.PROXY_HASH_15, name: 'purokishi.i2p', location: 'Dallas, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_16, name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    { hash: env.PROXY_HASH_17, name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    { hash: env.PROXY_HASH_18, name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
  ].filter(p => p.hash); // Filter out undefined hashes
  
  // Check if visitor IP matches any proxy
  const matchedProxy = proxies.find(proxy => proxy.hash === hashedVisitorIP);
  
  const response = {
    isUsingProxy: !!matchedProxy,
    visitorIP: visitorIP, // Can be removed in production if you don't want to expose this
  };
  
  if (matchedProxy) {
    response.proxyName = matchedProxy.name;
    response.proxyLocation = matchedProxy.location;
    response.proxyFlag = matchedProxy.flag;
  }
  
  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};

export const config = {
  path: "/api/check-proxy"
};