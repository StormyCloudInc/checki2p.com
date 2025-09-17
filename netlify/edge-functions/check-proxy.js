// Direct IP checking - no hashing needed

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
  const DEBUG_MODE = env.DEBUG_PROXY === 'true';

  // Direct IP list - can be set via environment variables or hardcoded
  // These are the actual proxy exit IPs
  const proxyIPs = [
    // StormyCloud IPs
    env.PROXY_IP_1 || '23.171.8.170',
    env.PROXY_IP_2 || '74.48.163.73',
    env.PROXY_IP_3 || '23.137.249.9',
    // Acetone
    env.PROXY_IP_4 || '23.137.249.65',
    // Purokishi
    env.PROXY_IP_5 || '67.219.138.173',
    env.PROXY_IP_6 || '23.137.249.66',
    env.PROXY_IP_7 || '23.137.250.108',
    env.PROXY_IP_8 || '2602:fc24:11:a42f::1',
  ].filter(ip => ip && ip !== 'undefined');

  // Proxy metadata
  const proxyMetadata = {
    '23.171.8.170': { name: 'exit.stormycloud.i2p', location: 'Highland, Illinois, USA', flag: '/assets/images/usa.svg' },
    '74.48.163.73': { name: 'exit.stormycloud.i2p', location: 'Los Angeles, CA, USA', flag: '/assets/images/usa.svg' },
    '23.137.249.9': { name: 'exit.stormycloud.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    '23.137.249.65': { name: 'outproxy.acetone.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    '67.219.138.173': { name: 'purokishi.i2p', location: 'Dallas, Texas, USA', flag: '/assets/images/usa.svg' },
    '23.137.249.66': { name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    '23.137.250.108': { name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
    '2602:fc24:11:a42f::1': { name: 'purokishi.i2p', location: 'Naaldwijk, Netherlands', flag: '/assets/images/nl.svg' },
  };

  // Subnet ranges for proxy services (if they use multiple IPs)
  const proxySubnets = [
    env.PROXY_SUBNET_1,
    env.PROXY_SUBNET_2,
    env.PROXY_SUBNET_3,
    env.PROXY_SUBNET_4,
  ].filter(subnet => subnet && subnet !== 'undefined');
  
  // Check if visitor IP matches any proxy IP directly
  let isUsingProxy = proxyIPs.includes(visitorIP);
  let matchedIP = null;

  if (isUsingProxy) {
    matchedIP = visitorIP;
  } else {
    // Check subnets if direct IP didn't match
    for (const subnet of proxySubnets) {
      if (subnet && isIpInSubnet(visitorIP, subnet)) {
        isUsingProxy = true;
        // Try to find which specific IP in metadata might match
        for (const ip of Object.keys(proxyMetadata)) {
          if (isIpInSubnet(ip, subnet)) {
            matchedIP = ip;
            break;
          }
        }
        break;
      }
    }
  }

  const response = {
    isUsingProxy: isUsingProxy,
  };

  // Add debug information if debug mode is enabled
  if (DEBUG_MODE) {
    response.debug = {
      visitorIP: visitorIP,
      checkedIPs: proxyIPs,
      checkedSubnets: proxySubnets,
      headers: Object.fromEntries(request.headers),
      contextIP: context.ip,
      clientIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    };
  }

  if (isUsingProxy && matchedIP && proxyMetadata[matchedIP]) {
    const metadata = proxyMetadata[matchedIP];
    response.proxyName = metadata.name;
    response.proxyLocation = metadata.location;
    response.proxyFlag = metadata.flag;
  } else if (isUsingProxy) {
    // Fallback if we matched a subnet but don't have specific metadata
    response.proxyName = 'I2P Outproxy';
    response.proxyLocation = 'Unknown Location';
    response.proxyFlag = '/assets/images/i2p.svg';
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