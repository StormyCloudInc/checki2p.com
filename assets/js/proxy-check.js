// Check proxy status when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const statusContainer = document.getElementById('statusContainer');
    
    try {
        // Call the edge function to check proxy status
        const response = await fetch('/api/check-proxy');
        const data = await response.json();
        
        // Check for debug information
        if (data.debug) {
            console.log('=== Proxy Check Debug Info ===');
            console.log('Visitor IP:', data.debug.visitorIP);
            console.log('Context IP:', data.debug.contextIP);
            console.log('Client IP from headers:', data.debug.clientIP);
            console.log('Checked IPs:', data.debug.checkedIPs);
            console.log('Checked Subnets:', data.debug.checkedSubnets);
            console.log('All Headers:', data.debug.headers);
            console.log('===============================');
        }

        if (data.isUsingProxy) {
            // User is connected through a known proxy
            const flagHtml = data.proxyFlag ?
                `<img src="${data.proxyFlag}" alt="Flag" style="height: 15px; vertical-align: middle;">` : '';

            statusContainer.innerHTML = `
                <span class='status-dot status--up' title='Using a known outproxy'></span>
                <div class='status-message status-emphasis'>
                    You are connected to ${data.proxyName}<br>
                    <span style="font-size: .9em; color: var(--muted);">Location: ${flagHtml} ${data.proxyLocation}</span>
                </div>
            `;
        } else {
            // User is NOT using a known proxy
            let debugHtml = '';
            if (data.debug) {
                debugHtml = `<br><span style="font-size: .8em; color: var(--muted);">Debug: Your IP is ${data.debug.visitorIP}</span>`;
            }
            statusContainer.innerHTML = `
                <span class='status-dot status--down' title='Not using a known outproxy'></span>
                <div class='status-message status-emphasis'>You are NOT using a known outproxy${debugHtml}</div>
            `;
        }
    } catch (error) {
        console.error('Error checking proxy status:', error);
        statusContainer.innerHTML = `
            <div class='status-message'>Error checking proxy status. Please try again later.</div>
        `;
    }
});