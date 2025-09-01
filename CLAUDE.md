# Claude Code Configuration for CheckI2P.com

## Project Overview
CheckI2P.com is a privacy tool that helps I2P network users verify their connection to an I2P Outproxy. The site provides a quick sanity check to ensure users' online activities are private and secure.

## Project Structure
- `/api` - API endpoints
- `/assets` - Static assets (CSS, JS, images)
- `/donate` - Donation page
- `/ping` - Ping functionality
- `/reseed` - Reseed functionality
- `checkproxy.php` - Main proxy checking logic
- `index.php` - Main entry point

## Tech Stack
- PHP backend
- HTML/CSS/JavaScript frontend
- GitLab CI/CD pipeline

## Key Commands
```bash
# Run local development server (PHP built-in server)
php -S localhost:8000

# Check PHP syntax
php -l *.php
```

## Development Guidelines
- This is a privacy-focused tool for the I2P network
- Maintain simplicity and security in all changes
- Test thoroughly to ensure proxy detection works correctly
- Follow existing code style and patterns

## Testing
Test the proxy detection by:
1. Accessing the site directly (should show "NOT using a known outproxy")
2. Accessing through an I2P outproxy (should detect the proxy)