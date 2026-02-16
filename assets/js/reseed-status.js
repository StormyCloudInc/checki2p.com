document.addEventListener('DOMContentLoaded', async () => {
    const el = document.getElementById('reseedStatus');
    if (!el) return;

    try {
        const response = await fetch('/api/reseed-status');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data.servers && data.servers.length > 0) {
            const sorted = sortServers(data.servers);

            let html = '<div class="table-wrap"><table class="status-table"><thead><tr>' +
                '<th>server</th><th style="text-align:center">status</th>' +
                '<th style="text-align:center">download</th></tr></thead><tbody>';

            for (const s of sorted) {
                const cls = statusClass(s.status);
                const dot = statusDot(s.status);
                const tip = tooltip(s);
                const dl = downloadLink(s);

                html += `<tr><td>${escapeHtml(s.server_name)}</td>` +
                    `<td style="text-align:center"><span class="${cls}" title="${escapeHtml(tip)}">${dot}</span></td>` +
                    `<td style="text-align:center">${dl}</td></tr>`;
            }

            html += '</tbody></table></div>';

            if (data.last_checked) {
                html += `<p class="last-checked">last checked: ${new Date(data.last_checked).toLocaleString()}</p>`;
            }

            el.innerHTML = html;
        } else {
            el.innerHTML = '<p style="color:var(--muted)">no server data available.</p>';
        }
    } catch (error) {
        console.error('reseed status error:', error);
        el.innerHTML = `<p style="color:var(--error)">error loading server status: ${escapeHtml(error.message)}</p>`;
    }
});

function sortServers(servers) {
    return servers.sort((a, b) => {
        const ap = a.server_name.split('.');
        const bp = b.server_name.split('.');
        const ad = ap.slice(-2).join('.');
        const bd = bp.slice(-2).join('.');
        if (ad === bd) {
            const as = ap.length > 2 ? ap[ap.length - 3] : '';
            const bs = bp.length > 2 ? bp[bp.length - 3] : '';
            return as.localeCompare(bs);
        }
        return ad.localeCompare(bd);
    });
}

function statusClass(status) {
    if (status === 'online') return 'status-on';
    if (status === 'offline') return 'status-off';
    if (status === 'warning') return 'status-warn';
    return '';
}

function statusDot(status) {
    if (status === 'online') return '\u25cf';   // ●
    if (status === 'offline') return '\u25cb';   // ○
    if (status === 'warning') return '\u25d0';   // ◐
    return '\u25cb';
}

function tooltip(server) {
    if (server.status === 'online') return 'online';
    if (server.status === 'offline') {
        return server.offline_duration ? `offline for ${server.offline_duration}` : 'offline';
    }
    if (server.status === 'warning') return server.status_message || 'warning';
    return '';
}

function downloadLink(server) {
    if (server.download_url) {
        return `<a href="${server.download_url}" class="dl-link" title="download su3" target="_blank" rel="noopener noreferrer">[dl su3]</a>`;
    }
    return '<span class="no-dl">--</span>';
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
