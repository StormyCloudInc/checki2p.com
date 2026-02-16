const DEFAULT_FLAG = '/assets/images/i2p.svg';

function ipToNumber(ip) {
  if (!ip) return 0;
  if (ip.includes(':')) {
    const parts = ip.split(':').map(part => part || '0');
    while (parts.length < 8) parts.push('0');
    return BigInt('0x' + parts.map(part => part.padStart(4, '0')).join(''));
  }

  const parts = ip.split('.');
  return parts.reduce((acc, part, index) => acc + (parseInt(part, 10) << (8 * (3 - index))), 0);
}

function isIpInSubnet(ip, cidr) {
  if (!ip || !cidr) return false;
  try {
    const [subnet, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);
    const isIPv6 = ip.includes(':');
    const isSubnetIPv6 = subnet.includes(':');
    if (isIPv6 !== isSubnetIPv6) return false;

    if (isIPv6) {
      const ipNum = ipToNumber(ip);
      const subnetNum = ipToNumber(subnet);
      const mask = (BigInt(1) << BigInt(128 - prefix)) - BigInt(1);
      return (ipNum & ~mask) === (subnetNum & ~mask);
    }

    const ipNum = ipToNumber(ip);
    const subnetNum = ipToNumber(subnet);
    const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    return (ipNum & mask) === (subnetNum & mask);
  } catch (error) {
    console.error('Subnet check failed:', error);
    return false;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const visitorIP = (request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    '').split(',')[0].trim();
  const debugMode = String(env.DEBUG_PROXY || 'false').toLowerCase() === 'true';

  try {
    const { results = [] } = await env.DB.prepare(
      `SELECT ip_address, subnet, proxy_name, location, flag_url
       FROM proxy_ips
       WHERE is_active = 1`
    ).all();

    const proxyMetadata = {};
    const proxyIPs = [];
    const proxySubnets = new Set();

    for (const row of results) {
      if (row.ip_address) {
        proxyIPs.push(row.ip_address);
        proxyMetadata[row.ip_address] = {
          name: row.proxy_name || 'I2P Outproxy',
          location: row.location || 'Unknown Location',
          flag: row.flag_url || DEFAULT_FLAG,
        };
      }
      if (row.subnet) {
        proxySubnets.add(row.subnet);
      }
    }

    let isUsingProxy = proxyIPs.includes(visitorIP);
    let matchedIP = isUsingProxy ? visitorIP : null;

    if (!isUsingProxy && visitorIP) {
      for (const subnet of proxySubnets) {
        if (isIpInSubnet(visitorIP, subnet)) {
          isUsingProxy = true;
          matchedIP = proxyIPs.find(ip => isIpInSubnet(ip, subnet)) || null;
          break;
        }
      }
    }

    const response = { isUsingProxy };

    if (debugMode) {
      response.debug = {
        visitorIP,
        checkedIPs: proxyIPs,
        checkedSubnets: Array.from(proxySubnets),
        headers: Object.fromEntries(request.headers),
      };
    }

    if (isUsingProxy) {
      const metadata = matchedIP ? proxyMetadata[matchedIP] : null;
      response.proxyName = metadata?.name || 'I2P Outproxy';
      response.proxyLocation = metadata?.location || 'Unknown Location';
      response.proxyFlag = metadata?.flag || DEFAULT_FLAG;
    }

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('check-proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy check failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
