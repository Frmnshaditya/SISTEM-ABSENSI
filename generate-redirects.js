import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');
const redirectsPath = path.resolve(distDir, '_redirects');

// Prioritize environment variables commonly used in Netlify/Railway setups
const apiServerUrl = 
  process.env.VITE_API_URL || 
  process.env.API_URL || 
  process.env.BACKEND_URL || 
  'https://nama-app-anda.up.railway.app';

// Ensure the URL does not have a trailing slash (to avoid double slashes)
const sanitizedServerUrl = apiServerUrl.endsWith('/') ? apiServerUrl.slice(0, -1) : apiServerUrl;

const content = `
# Proxy API requests to your Railway backend
/api/*  ${sanitizedServerUrl}/api/:splat  200

# Fallback for SPA routing (React Router etc)
/*      /index.html   200
`;

try {
  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(redirectsPath, content.trim(), 'utf8');
  console.log(`\x1b[32m✔ Netlify _redirects successfully generated targeting backend:\x1b[0m ${sanitizedServerUrl}`);
} catch (error) {
  console.error('\x1b[31m✖ Error generating _redirects:\x1b[0m', error);
}
