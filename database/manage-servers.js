#!/usr/bin/env node

/**
 * Utility script to manage reseed servers in Neon database
 * Usage: node manage-servers.js [command] [options]
 * 
 * Commands:
 *   list    - List all servers
 *   add     - Add a new server
 *   update  - Update server status
 *   check   - Run a check on all servers
 */

const { Client } = require('pg');
require('dotenv').config();

// Database connection
const client = new Client({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function listServers() {
  try {
    await client.connect();
    const result = await client.query('SELECT * FROM server_status ORDER BY server_name');
    console.table(result.rows);
  } catch (err) {
    console.error('Error listing servers:', err);
  } finally {
    await client.end();
  }
}

async function addServer(serverName) {
  try {
    await client.connect();
    const query = 'INSERT INTO server_status (server_name, status, status_message) VALUES ($1, $2, $3) RETURNING *';
    const values = [serverName, 'online', 'Newly added server'];
    const result = await client.query(query, values);
    console.log('Server added:', result.rows[0]);
  } catch (err) {
    console.error('Error adding server:', err);
  } finally {
    await client.end();
  }
}

async function updateServer(serverName, status, message = null) {
  try {
    await client.connect();
    
    // If server is going offline, set first_offline if not already set
    if (status === 'offline') {
      const checkQuery = 'SELECT status, first_offline FROM server_status WHERE server_name = $1';
      const checkResult = await client.query(checkQuery, [serverName]);
      
      if (checkResult.rows.length > 0 && checkResult.rows[0].status !== 'offline') {
        // Server is transitioning to offline
        const updateQuery = `
          UPDATE server_status 
          SET status = $1, status_message = $2, first_offline = CURRENT_TIMESTAMP, last_checked = CURRENT_TIMESTAMP
          WHERE server_name = $3
          RETURNING *
        `;
        const result = await client.query(updateQuery, [status, message, serverName]);
        console.log('Server updated (went offline):', result.rows[0]);
        return;
      }
    } else {
      // Server is online or warning, clear first_offline
      const updateQuery = `
        UPDATE server_status 
        SET status = $1, status_message = $2, first_offline = NULL, last_checked = CURRENT_TIMESTAMP
        WHERE server_name = $3
        RETURNING *
      `;
      const result = await client.query(updateQuery, [status, message, serverName]);
      console.log('Server updated:', result.rows[0]);
      return;
    }
    
    // Default update
    const updateQuery = `
      UPDATE server_status 
      SET status = $1, status_message = $2, last_checked = CURRENT_TIMESTAMP
      WHERE server_name = $3
      RETURNING *
    `;
    const result = await client.query(updateQuery, [status, message, serverName]);
    console.log('Server updated:', result.rows[0]);
    
  } catch (err) {
    console.error('Error updating server:', err);
  } finally {
    await client.end();
  }
}

async function checkServers() {
  // This would normally check actual server status
  // For now, it's a placeholder that updates last_checked
  try {
    await client.connect();
    const updateQuery = 'UPDATE server_status SET last_checked = CURRENT_TIMESTAMP';
    await client.query(updateQuery);
    console.log('All servers checked');
  } catch (err) {
    console.error('Error checking servers:', err);
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const command = process.argv[2];
const args = process.argv.slice(3);

switch(command) {
  case 'list':
    listServers();
    break;
  case 'add':
    if (args.length < 1) {
      console.error('Usage: node manage-servers.js add <server-name>');
      process.exit(1);
    }
    addServer(args[0]);
    break;
  case 'update':
    if (args.length < 2) {
      console.error('Usage: node manage-servers.js update <server-name> <status> [message]');
      process.exit(1);
    }
    updateServer(args[0], args[1], args[2] || null);
    break;
  case 'check':
    checkServers();
    break;
  default:
    console.log(`
Usage: node manage-servers.js [command] [options]

Commands:
  list                              - List all servers
  add <server-name>                 - Add a new server
  update <server-name> <status> [message] - Update server status (online/offline/warning)
  check                             - Run a check on all servers

Examples:
  node manage-servers.js list
  node manage-servers.js add reseed.example.i2p
  node manage-servers.js update reseed.example.i2p offline "Connection timeout"
  node manage-servers.js check
    `);
}