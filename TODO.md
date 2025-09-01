# CheckI2P.com Migration to Netlify - TODO

## Overview
Migrate CheckI2P.com from PHP to a static site with serverless functions for Netlify hosting.

## Phase 1: Reseed Server Status ✅ CURRENT
- [ ] Analyze current database structure and data flow
- [ ] Choose data storage solution:
  - Option A: GitHub-hosted JSON with GitHub Actions updates
  - Option B: Netlify Blobs storage
  - Option C: External service (Supabase/Airtable)
- [ ] Create static HTML page for reseed status
- [ ] Implement JavaScript to fetch and display status data
- [ ] Create Netlify function to fetch/serve status data
- [ ] Set up automated status updates (cron job or scheduled function)
- [ ] Test reseed status page functionality

## Phase 2: Main Proxy Check Feature
- [ ] Design secure IP hashing mechanism
- [ ] Create environment variables for hashed proxy IPs
- [ ] Implement Netlify Edge Function for IP checking
- [ ] Convert index.php to static HTML
- [ ] Add JavaScript to call edge function and display results
- [ ] Test proxy detection with various IPs
- [ ] Ensure no IP addresses are exposed in client code

## Phase 3: I2P Website Check (Ping)
- [ ] Create Netlify serverless function for I2P site checking
- [ ] Implement proxy configuration in function
- [ ] Convert ping/index.php to static HTML
- [ ] Add JavaScript for form submission and results display
- [ ] Handle advanced information display
- [ ] Fix existing functionality issues
- [ ] Test with various I2P domains

## Phase 4: Donate Page
- [ ] Convert donate/index.php to static HTML
- [ ] Ensure all donation addresses are properly displayed
- [ ] Update navigation links
- [ ] Test QR codes and donation links

## Phase 5: API Endpoints
- [ ] Create /api/ip endpoint as Netlify function
- [ ] Maintain backward compatibility with existing API
- [ ] Add proper CORS headers
- [ ] Document API endpoints

## Phase 6: Final Setup & Deployment
- [ ] Create netlify.toml configuration
- [ ] Set up redirects for PHP URLs to new static pages
- [ ] Configure environment variables in Netlify
- [ ] Test all functionality locally with Netlify CLI
- [ ] Deploy to Netlify
- [ ] Set up custom domain
- [ ] Monitor for issues and optimize performance

## Technical Notes

### Security Considerations
- **IP Protection**: Use SHA-256 hashing to compare IPs without exposing them
- **Environment Variables**: Store all sensitive data in Netlify environment variables
- **CORS**: Configure appropriate CORS headers for API endpoints

### File Structure
```
/
├── index.html
├── reseed.html
├── ping.html
├── donate.html
├── assets/
│   ├── css/style.css
│   ├── images/
│   └── js/
│       ├── proxy-check.js
│       ├── reseed-status.js
│       └── ping-check.js
├── netlify/
│   ├── functions/
│   │   ├── api-ip.js
│   │   ├── reseed-status.js
│   │   └── ping-i2p.js
│   └── edge-functions/
│       └── check-proxy.js
├── data/
│   └── reseed-status.json (if using GitHub storage)
└── netlify.toml
```

### Dependencies
- Netlify CLI for local development
- Node.js for serverless functions
- crypto module for IP hashing
- node-fetch or axios for HTTP requests