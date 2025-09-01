# Neon Database Setup for Reseed Server Status

## Prerequisites
- Netlify account with Neon integration enabled
- Node.js installed locally

## Setup Steps

### 1. Enable Neon Integration in Netlify

1. Go to your Netlify site dashboard
2. Navigate to "Integrations" 
3. Find "Neon" and click "Enable"
4. Follow the prompts to create a new Neon database
5. The `NEON_DATABASE_URL` will be automatically added to your environment variables

### 2. Initialize Database Schema

Once your Neon database is created:

1. Go to the Neon dashboard (https://console.neon.tech)
2. Navigate to your project
3. Open the SQL Editor
4. Copy and paste the contents of `database/schema.sql`
5. Execute the SQL to create the tables

### 3. Add Initial Server Data

You can add servers using either:

#### Option A: SQL Editor (Neon Dashboard)
```sql
INSERT INTO server_status (server_name, status, status_message) VALUES
    ('reseed.stormycloud.org', 'online', 'Server is operational'),
    ('reseed.acetone.i2p', 'online', 'Server is operational'),
    ('reseed.novg.net', 'online', 'Server is operational');
```

#### Option B: Management Script (Local)
```bash
# First, install dependencies
npm install

# Add NEON_DATABASE_URL to your .env file
echo "NEON_DATABASE_URL=your-connection-string" >> .env

# Add servers
node database/manage-servers.js add reseed.stormycloud.org
node database/manage-servers.js add reseed.acetone.i2p
node database/manage-servers.js add reseed.novg.net

# List all servers
node database/manage-servers.js list
```

### 4. Test the Integration

1. Deploy to Netlify
2. Visit `/reseed.html` on your deployed site
3. Verify server status is displayed correctly

## Managing Server Status

### Update Server Status
```bash
# Mark server as offline
node database/manage-servers.js update reseed.example.i2p offline "Connection timeout"

# Mark server as online
node database/manage-servers.js update reseed.example.i2p online "Server recovered"

# Set warning status
node database/manage-servers.js update reseed.example.i2p warning "High latency detected"
```

### Automated Status Checks

For production, you'll want to set up automated status checks. Options:

1. **Netlify Scheduled Functions** (requires Pro plan)
   - Create a scheduled function to check servers periodically
   
2. **GitHub Actions**
   - Set up a cron job to run status checks
   - Use the management script to update database

3. **External Monitoring Service**
   - Use services like UptimeRobot or Pingdom
   - Webhook to Netlify function to update status

## Database Connection Limits

Neon free tier includes:
- 0.5 GB storage
- 50 compute hours per month
- 10 concurrent connections

For reseed status monitoring, this should be more than sufficient.

## Troubleshooting

### Connection Errors
- Verify `NEON_DATABASE_URL` is set in Netlify environment variables
- Check that SSL is enabled (should be in connection string)
- Ensure database is not suspended (Neon may suspend inactive databases)

### No Data Showing
- Check Netlify function logs for errors
- Verify tables exist in database
- Ensure there's data in the `server_status` table

### Performance Issues
- The function caches responses for 1 minute
- Consider increasing cache time if needed
- Monitor compute hours usage in Neon dashboard