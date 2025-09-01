# Deployment Instructions for CheckI2P.com on Netlify

## Prerequisites
- Netlify account
- Node.js installed locally (for generating hashes)

## Setup Steps

### 1. Generate Proxy IP Hashes

**IMPORTANT**: This step must be done locally and securely. Never commit actual IP addresses!

```bash
cd scripts
node hash-ips.js
```

This will output environment variables that you need to add to Netlify.

### 2. Configure Netlify Environment Variables

1. Go to your Netlify dashboard
2. Navigate to Site Settings → Environment Variables
3. Add the following variables:
   - `PROXY_SALT` - Your secret salt (keep this secure!)
   - `PROXY_HASH_1` through `PROXY_HASH_18` - The hashed IPs from step 1

### 3. Deploy to Netlify

#### Option A: Deploy via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

#### Option B: Deploy via Git
1. Connect your GitHub/GitLab repository to Netlify
2. Netlify will automatically deploy on push to main branch

### 4. Test the Deployment

1. Visit your deployed site
2. Test from a regular connection (should show red light)
3. Test from an I2P outproxy connection (should show green light)
4. Test the API endpoint: `https://yoursite.netlify.app/api/ip`

## Local Development

### Setup
```bash
# Create .env file
cp .env.example .env
# Add your hashed IPs to .env

# Install Netlify CLI
npm install -g netlify-cli

# Run locally
netlify dev
```

The site will be available at `http://localhost:8888`

## Security Considerations

1. **Never commit actual proxy IPs** - Always use hashes
2. **Keep PROXY_SALT secret** - This is your security key
3. **Rotate salt periodically** - Update hashes when you do
4. **Use HTTPS only** - Netlify provides this automatically
5. **Monitor access logs** - Check for unusual patterns

## Updating Proxy IPs

When you need to add or update proxy IPs:

1. Update the `scripts/hash-ips.js` file locally with new IPs
2. Generate new hashes
3. Update environment variables in Netlify dashboard
4. Update edge function and serverless function code if needed
5. Clear the IPs from `scripts/hash-ips.js` before committing

## Troubleshooting

### Edge Function Not Working
- Check that environment variables are set in Netlify
- Verify the edge function path in `netlify.toml`
- Check Netlify function logs in dashboard

### IPs Not Being Detected
- Verify hashes are generated with the same salt
- Check that all environment variables are properly set
- Test with the exact IP addresses (locally only!)

### API Compatibility Issues
- The `/api/ip` endpoint maintains backward compatibility
- Returns same JSON structure as original PHP version