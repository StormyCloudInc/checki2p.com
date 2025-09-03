// Fetch and display reseed server status
document.addEventListener('DOMContentLoaded', async () => {
    const statusContainer = document.getElementById('statusContainer');
    
    try {
        // Fetch server status from Appwrite-based Netlify function
        const response = await fetch('/.netlify/functions/reseed-status-appwrite');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.servers && data.servers.length > 0) {
            // Sort servers by domain name (custom sort logic from original PHP)
            const sortedServers = sortServers(data.servers);
            
            // Create the status table
            let tableHTML = `
                <table class='status-table'>
                    <tr>
                        <th>Server Name</th>
                        <th>Status</th>
                    </tr>
            `;
            
            sortedServers.forEach(server => {
                const statusClass = getStatusClass(server.status);
                const tooltip = getTooltip(server);
                
                tableHTML += `
                    <tr>
                        <td>${escapeHtml(server.server_name)}</td>
                        <td style='text-align: center;'>
                            <span class='dot ${statusClass}' title='${escapeHtml(tooltip)}'></span>
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += '</table>';
            
            // Add last checked time
            if (data.last_checked) {
                const lastCheckedDate = new Date(data.last_checked);
                tableHTML += `<p>Last Checked: ${lastCheckedDate.toLocaleString()}</p>`;
            }
            
            statusContainer.innerHTML = tableHTML;
        } else {
            statusContainer.innerHTML = '<p>No server data available.</p>';
        }
        
    } catch (error) {
        console.error('Error fetching server status:', error);
        statusContainer.innerHTML = `
            <p>Error loading server status. Please try again later.</p>
            <p style="font-size: 0.9em; color: #666;">Error: ${escapeHtml(error.message)}</p>
        `;
    }
});

// Custom sort function matching the PHP implementation
function sortServers(servers) {
    return servers.sort((a, b) => {
        const aParts = a.server_name.split('.');
        const bParts = b.server_name.split('.');
        
        // Get domain and sub-domain
        const aDomain = aParts.slice(-2).join('.');
        const bDomain = bParts.slice(-2).join('.');
        
        if (aDomain === bDomain) {
            // Sort by sub-domain if available
            const aSubDomain = aParts.length > 2 ? aParts[aParts.length - 3] : '';
            const bSubDomain = bParts.length > 2 ? bParts[bParts.length - 3] : '';
            return aSubDomain.localeCompare(bSubDomain);
        }
        
        return aDomain.localeCompare(bDomain);
    });
}

// Get the appropriate CSS class for status
function getStatusClass(status) {
    switch(status) {
        case 'online':
            return 'glowing-green';
        case 'offline':
            return 'glowing-red';
        case 'warning':
            return 'glowing-yellow';
        default:
            return '';
    }
}

// Generate tooltip text based on server status
function getTooltip(server) {
    if (server.status === 'online') {
        return 'Online';
    } else if (server.status === 'offline') {
        if (server.offline_duration) {
            return `Offline for ${server.offline_duration}`;
        }
        return 'Offline';
    } else if (server.status === 'warning') {
        return server.status_message || 'Warning';
    }
    return '';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}