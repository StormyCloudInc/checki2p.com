-- Cloudflare D1 schema for CheckI2P.com

CREATE TABLE IF NOT EXISTS server_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'warning', 'error')),
    status_message TEXT,
    router_infos INTEGER DEFAULT 0,
    last_checked TEXT DEFAULT (datetime('now')),
    first_offline TEXT,
    last_notification_sent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proxy_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL UNIQUE,
    subnet TEXT,
    proxy_name TEXT,
    location TEXT,
    flag_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_server_status ON server_status(status);
CREATE INDEX IF NOT EXISTS idx_server_name ON server_status(server_name);
CREATE INDEX IF NOT EXISTS idx_proxy_active ON proxy_ips(is_active);
