# FindaFourth Deployment Guide

## Architecture

- **Frontend**: Cloudflare Pages (static React build)
- **Backend**: Digital Ocean Droplet (FastAPI + MongoDB in Docker)
- **Domain**: Cloudflare DNS

## Prerequisites

- Cloudflare account with Wrangler CLI installed (`npm install -g wrangler`)
- Digital Ocean account
- Domain configured in Cloudflare

## 1. Domain Setup (Cloudflare)

1. Purchase/transfer domain to Cloudflare (e.g., `findafourth.com`)
2. DNS records will be configured after infrastructure is set up:
   - `findafourth.com` → Cloudflare Pages
   - `api.findafourth.com` → Digital Ocean Droplet IP

## 2. Backend Setup (Digital Ocean Droplet)

### Create Droplet

1. Create a new Droplet:
   - Image: Ubuntu 24.04
   - Plan: Basic $4/mo (1 vCPU, 512MB RAM) or $6/mo (1GB RAM recommended)
   - Region: Choose closest to your users
   - Enable monitoring

2. SSH into your droplet:
   ```bash
   ssh root@your-droplet-ip
   ```

### Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Deploy Backend

```bash
# Clone repository
git clone https://github.com/jdgtl/findafourth.git
cd findafourth

# Create production environment file
cp .env.production.example .env

# Edit .env with your production values
nano .env
# Set: JWT_SECRET, NOTIFICATIONAPI_CLIENT_ID, NOTIFICATIONAPI_CLIENT_SECRET, CORS_ORIGINS

# Start services
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Verify it's running
curl http://localhost:8000/api/health
```

### Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 8000  # Backend API (will proxy through Cloudflare)
ufw enable
```

### Set Up SSL with Cloudflare (Recommended)

Since you're using Cloudflare, the easiest approach is:

1. In Cloudflare Dashboard → SSL/TLS → Set mode to "Full (strict)"
2. Create a Cloudflare Origin Certificate:
   - Go to SSL/TLS → Origin Server → Create Certificate
   - Save the certificate and private key
3. On your Droplet, install nginx as reverse proxy:

```bash
apt install nginx -y

# Create certificate files
nano /etc/ssl/cloudflare.crt   # Paste certificate
nano /etc/ssl/cloudflare.key   # Paste private key

# Configure nginx
nano /etc/nginx/sites-available/findafourth
```

Add this nginx config:
```nginx
server {
    listen 443 ssl;
    server_name api.findafourth.com;

    ssl_certificate /etc/ssl/cloudflare.crt;
    ssl_certificate_key /etc/ssl/cloudflare.key;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.findafourth.com;
    return 301 https://$server_name$request_uri;
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/findafourth /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 3. Frontend Setup (Cloudflare Pages)

### First-time Setup

```bash
cd frontend

# Login to Cloudflare
wrangler login

# Create Pages project (first time only)
wrangler pages project create findafourth
```

### Deploy

```bash
# Set the backend URL for production build
export REACT_APP_BACKEND_URL=https://api.findafourth.com
export REACT_APP_NOTIFICATIONAPI_CLIENT_ID=your-client-id

# Build and deploy
yarn build
wrangler pages deploy build --project-name=findafourth --branch=main
```

Or use the npm script:
```bash
REACT_APP_BACKEND_URL=https://api.findafourth.com yarn deploy
```

### Configure Custom Domain

1. In Cloudflare Dashboard → Pages → findafourth → Custom domains
2. Add `findafourth.com` and `www.findafourth.com`

## 4. DNS Configuration (Cloudflare)

Add these DNS records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | api | your-droplet-ip | Yes (orange cloud) |
| CNAME | @ | findafourth.pages.dev | Yes |
| CNAME | www | findafourth.pages.dev | Yes |

## 5. Seed Production Data

SSH into your droplet and run the PTI scraper:

```bash
cd findafourth
docker compose -f docker-compose.prod.yml exec backend python -c "
import asyncio
from server import run_gbpta_full_sync
asyncio.run(run_gbpta_full_sync())
"
```

## Maintenance Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f backend

# Restart services
docker compose -f docker-compose.prod.yml restart

# Update deployment
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Database backup
docker compose -f docker-compose.prod.yml exec mongodb mongodump --out /data/backup
docker cp findafourth-mongo:/data/backup ./backup-$(date +%Y%m%d)
```

## Troubleshooting

### Backend not responding
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend --tail 100
```

### MongoDB issues
```bash
docker compose -f docker-compose.prod.yml exec mongodb mongosh findafourth --eval "db.stats()"
```

### CORS errors
Check that `CORS_ORIGINS` in `.env` includes your frontend domain(s).
