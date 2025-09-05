// Check proxy status when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const statusContainer = document.getElementById('statusContainer');
    
    try {
        // Call the edge function to check proxy status
        const response = await fetch('/api/check-proxy');
        const data = await response.json();
        
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
            statusContainer.innerHTML = `
                <span class='status-dot status--down' title='Not using a known outproxy'></span>
                <div class='status-message status-emphasis'>You are NOT using a known outproxy</div>
            `;
        }
    } catch (error) {
        console.error('Error checking proxy status:', error);
        statusContainer.innerHTML = `
            <div class='status-message'>Error checking proxy status. Please try again later.</div>
        `;
    }
});