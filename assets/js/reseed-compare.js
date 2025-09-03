// Backend comparison for reseed servers
document.addEventListener('DOMContentLoaded', async () => {
    // Load data from both backends
    loadNeonData();
    loadAppwriteData();
});

async function loadNeonData() {
    const container = document.getElementById('neonStatus');
    
    try {
        const response = await fetch('/.netlify/functions/reseed-status');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        displayServerData(container, data, 'Neon');
        
    } catch (error) {
        console.error('Error fetching Neon data:', error);
        container.innerHTML = `
            <div class="error">
                <p>Error loading Neon data</p>
                <p style="font-size: 0.9em;">${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

async function loadAppwriteData() {
    const container = document.getElementById('appwriteStatus');
    
    try {
        const response = await fetch('/.netlify/functions/reseed-status-appwrite');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        displayServerData(container, data, 'Appwrite');
        
    } catch (error) {
        console.error('Error fetching Appwrite data:', error);
        container.innerHTML = `
            <div class="error">
                <p>Error loading Appwrite data</p>
                <p style="font-size: 0.9em;">${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

function displayServerData(container, data, backend) {
    if (data.servers && data.servers.length > 0) {
        // Sort servers by domain name
        const sortedServers = sortServers(data.servers);
        
        // Create statistics summary
        const stats = calculateStats(sortedServers);
        
        // Create the status table
        let html = `
            <div style="margin-bottom: 20px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px;">
                <p style="margin: 5px 0;">Total Servers: ${stats.total}</p>
                <p style="margin: 5px 0;">Online: <span style="color: #00ff00;">${stats.online}</span></p>
                <p style="margin: 5px 0;">Offline: <span style="color: #ff0000;">${stats.offline}</span></p>
                <p style="margin: 5px 0;">Warning: <span style="color: #ffff00;">${stats.warning}</span></p>
            </div>
            <table class='status-table'>
                <tr>
                    <th>Server Name</th>
                    <th>Status</th>
                    <th>Info</th>
                </tr>
        `;
        
        sortedServers.forEach(server => {
            const statusClass = getStatusClass(server.status);
            const tooltip = getTooltip(server);
            const info = server.router_infos ? `${server.router_infos} RIs` : server.status_message || '-';
            
            html += `
                <tr>
                    <td>${escapeHtml(server.server_name)}</td>
                    <td style='text-align: center;'>
                        <span class='dot ${statusClass}' title='${escapeHtml(tooltip)}'></span>
                    </td>
                    <td style='font-size: 0.9em; color: #ccc;'>${escapeHtml(info)}</td>
                </tr>
            `;
        });
        
        html += '</table>';
        
        // Add last checked time
        if (data.last_checked) {
            const lastCheckedDate = new Date(data.last_checked);
            html += `<p style="margin-top: 15px; font-size: 0.9em; text-align: center;">Last Checked: ${lastCheckedDate.toLocaleString()}</p>`;
        }
        
        container.innerHTML = html;
    } else {
        container.innerHTML = '<p>No server data available.</p>';
    }
}

function calculateStats(servers) {
    return {
        total: servers.length,
        online: servers.filter(s => s.status === 'online').length,
        offline: servers.filter(s => s.status === 'offline').length,
        warning: servers.filter(s => s.status === 'warning').length
    };
}

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
        return `Online - ${server.router_infos || 0} RouterInfos`;
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
    if (text === null || text === undefined) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}