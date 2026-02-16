document.addEventListener('DOMContentLoaded', async () => {
    const el = document.getElementById('proxyStatus');
    if (!el) return;

    try {
        const response = await fetch('/api/check-proxy');
        const data = await response.json();

        if (data.debug) {
            console.log('=== proxy check debug ===');
            console.log('visitor ip:', data.debug.visitorIP);
            console.log('context ip:', data.debug.contextIP);
            console.log('client ip:', data.debug.clientIP);
            console.log('checked ips:', data.debug.checkedIPs);
            console.log('checked subnets:', data.debug.checkedSubnets);
            console.log('headers:', data.debug.headers);
        }

        el.classList.remove('loading');

        if (data.isUsingProxy) {
            el.innerHTML =
                `<span class="proxy-connected">\u25cf connected to ${escapeHtml(data.proxyName)}</span>` +
                `<div class="proxy-detail">location: ${escapeHtml(data.proxyLocation)}</div>`;
        } else {
            let debug = '';
            if (data.debug) {
                debug = `<div class="proxy-detail">ip: ${escapeHtml(data.debug.visitorIP)}</div>`;
            }
            el.innerHTML =
                `<span class="proxy-disconnected">\u25cb not connected to a known outproxy</span>` +
                debug;
        }
    } catch (error) {
        console.error('proxy check error:', error);
        el.classList.remove('loading');
        el.innerHTML = `<span class="proxy-disconnected">error: could not check proxy status</span>`;
    }
});

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
