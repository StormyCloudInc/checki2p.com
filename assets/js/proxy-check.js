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
                `<img src="${data.proxyFlag}" alt="Flag" style="height: 15px;">` : '';
            
            statusContainer.innerHTML = `
                <img src='/assets/images/green_light.svg' alt='Green Light Indicator - Using a known outproxy' class='status-light'>
                <div class='status-message'>
                    You are connected to ${data.proxyName}<br>
                    Location: ${flagHtml} ${data.proxyLocation}
                </div>
            `;
        } else {
            // User is NOT using a known proxy
            statusContainer.innerHTML = `
                <img src='/assets/images/red_light.svg' alt='Red Light Indicator - Not using a known outproxy' class='status-light'>
                <div class='status-message'>You are NOT using a known outproxy</div>
            `;
        }
    } catch (error) {
        console.error('Error checking proxy status:', error);
        statusContainer.innerHTML = `
            <div class='status-message'>Error checking proxy status. Please try again later.</div>
        `;
    }
});