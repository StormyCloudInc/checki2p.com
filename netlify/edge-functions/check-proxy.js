import { createHash } from 'crypto';

// Helper function to convert IP to number for comparison
function ipToNumber(ip) {
  if (ip.includes(':')) {
    // IPv6 - simplified handling
    const parts = ip.split(':').map(p => p || '0');
    while (parts.length < 8) parts.push('0');
    return BigInt('0x' + parts.map(p => p.padStart(4, '0')).join(''));
  } else {
    // IPv4
    const parts = ip.split('.');
    return parts.reduce((acc, part, i) => acc + (parseInt(part) << (8 * (3 - i))), 0);
  }
}

// Helper function to check if an IP is in a CIDR subnet
function isIpInSubnet(ip, cidr) {
  try {
    const [subnet, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength);
    
    const isIPv6 = ip.includes(':');
    const isSubnetIPv6 = subnet.includes(':');
    
    // IP version must match
    if (isIPv6 !== isSubnetIPv6) return false;
    
    if (isIPv6) {
      // IPv6 comparison
      const ipNum = ipToNumber(ip);
      const subnetNum = ipToNumber(subnet);
      const mask = (BigInt(1) << BigInt(128 - prefix)) - BigInt(1);
      return (ipNum & ~mask) === (subnetNum & ~mask);
    } else {
      // IPv4 comparison
      const ipNum = ipToNumber(ip);
      const subnetNum = ipToNumber(subnet);
      const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
      return (ipNum & mask) === (subnetNum & mask);
    }
  } catch (e) {
    console.error('Error checking subnet:', e);
    return false;
  }
}

export default async (request, context) => {
  // Get the visitor's IP address
  const visitorIP = context.ip;
  
  // Get environment variables
  const env = Deno.env.toObject();
  const SALT = env.PROXY_SALT || 'default-salt-change-this';
  
  // Hash the visitor's IP for backward compatibility
  const hashedVisitorIP = createHash('sha256').update(visitorIP + SALT).digest('hex');
  
  // Proxy data structure - supports both hashes and subnets
  const proxies = [
    // StormyCloud Houston - can use either hash or subnet
    { hash: env.PROXY_HASH_1,  name: 'exit.stormycloud.i2p', location: 'Highland, Illinois, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_2,  name: 'exit.stormycloud.i2p', location: 'Los Angeles, CA, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_3,  name: 'exit.stormycloud.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    { subnet: env.PROXY_SUBNET_1, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },
    { subnet: env.PROXY_SUBNET_2, name: 'exit.stormycloud.i2p', location: 'Houston, Texas, USA', flag: '/assets/images/usa.svg' },

    // Acetone
    { hash: env.PROXY_HASH_4, name: 'outproxy.acetone.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    // Purokishi
    { hash: env.PROXY_HASH_5, name: 'purokishi.i2p', location: 'Dallas, Texas, USA', flag: '/assets/images/usa.svg' },
    { hash: env.PROXY_HASH_6, name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    { hash: env.PROXY_HASH_7, name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    { hash: env.PROXY_HASH_8, name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
  ].filter(p => p.hash || p.subnet); // Filter out entries with neither hash nor subnet
  
  // Check if visitor IP matches any proxy (by hash or subnet)
  const matchedProxy = proxies.find(proxy => {
    // First check subnet if available
    if (proxy.subnet && isIpInSubnet(visitorIP, proxy.subnet)) {
      return true;
    }
    // Fall back to hash check for backward compatibility
    if (proxy.hash && proxy.hash === hashedVisitorIP) {
      return true;
    }
    return false;
  });
  
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